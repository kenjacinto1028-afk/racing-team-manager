// Lap-by-lap race simulation. Pure: stepLap(state, orders) returns a new state.
import { clamp, createRng, hashSeed, type Rng } from './rng';
import {
  baseLap, COMPOUND_OFFSET, COMPOUND_WEAR, dnfChance, lapSpread, MODE_DELTA, pitStopTime, tyrePenalty, wearPerLap, weekendForm,
  type Competitor,
} from './performance';
import type { Compound, DriverMode, RaceResult, ResultEntry, Track } from './types';
import { pointsForPosition } from './season';

export interface TyreState { compound: Compound; wear: number; age: number }

export interface RaceCar {
  c: Competitor;
  grid: number;
  totalTime: number;
  lastLap: number;
  /** 0 = no clean lap yet. */
  bestLap: number;
  lapsDone: number;
  tyre: TyreState;
  mode: DriverMode;
  pitStops: number;
  compoundsUsed: Compound[];
  /** Pit at the end of the next lap for this compound. */
  pitRequest: Compound | null;
  pittedThisLap: boolean;
  dnf: boolean;
  dnfReason?: string;
  /** True for cars the player controls: the AI won't make their pit calls (except the mandatory stop). */
  playerControlled: boolean;
  /** Weekend form in s/lap (see weekendForm). */
  form: number;
}

export type RaceEventType = 'start' | 'overtake' | 'pit' | 'dnf' | 'fastest' | 'mistake' | 'slowstop' | 'finish' | 'forcedpit';

export interface RaceEvent { lap: number; type: RaceEventType; text: string; driverIds: string[] }

export interface RaceState {
  seed: number;
  track: Track;
  totalLaps: number;
  /** Laps completed. 0 = on the grid. */
  lap: number;
  cars: RaceCar[];
  events: RaceEvent[];
  fastestLap: { driverId: string; time: number } | null;
  finished: boolean;
}

export interface CarOrder { mode?: DriverMode; pit?: Compound | null }
export type Orders = Record<string, CarOrder>;

export interface RaceSetup {
  field: Competitor[];
  /** Driver ids in grid order (from qualifying). */
  grid: string[];
  track: Track;
  seed: number;
  /** Starting compound per driver (AI picks if missing). */
  startCompounds?: Record<string, Compound>;
  playerDriverIds?: string[];
}

/** Laps a compound lasts before hitting ~72% wear. */
export function tyreLife(c: Competitor, compound: Compound, track: Track, mode: DriverMode = 'normal'): number {
  return Math.max(1, Math.floor(72 / wearPerLap(c, compound, mode, track)));
}

function aiStartCompound(c: Competitor, track: Track, laps: number, rng: Rng): Compound {
  // Most start on mediums. Softs if the medium can't nearly do half the race; some gamble on softs anyway.
  if (tyreLife(c, 'medium', track) < laps * 0.4) return 'soft';
  return rng.chance(0.3) ? 'soft' : 'medium';
}

/** Choose the compound for the rest of the race: softest one that can reach the finish, else hard. */
export function aiNextCompound(c: Competitor, track: Track, lapsLeft: number): Compound {
  for (const comp of ['soft', 'medium', 'hard'] as Compound[]) {
    if (tyreLife(c, comp, track) >= lapsLeft) return comp;
  }
  return 'hard';
}

export function initRace(setup: RaceSetup): RaceState {
  const rng = createRng(hashSeed(setup.seed, 'race-init', setup.track.id));
  const byId = new Map(setup.field.map((c) => [c.driverId, c]));
  const players = new Set(setup.playerDriverIds ?? []);
  const cars: RaceCar[] = setup.grid
    .filter((id) => byId.has(id))
    .map((id, i) => {
      const c = byId.get(id)!;
      const compound = setup.startCompounds?.[id] ?? aiStartCompound(c, setup.track, setup.track.laps, rng);
      return {
        c, grid: i + 1, totalTime: i * 0.25, lastLap: 0, bestLap: 0, lapsDone: 0,
        tyre: { compound, wear: 0, age: 0 }, mode: 'normal', pitStops: 0, compoundsUsed: [compound],
        pitRequest: null, pittedThisLap: false, dnf: false, playerControlled: players.has(id), form: weekendForm(setup.seed, c),
      };
    });
  const pole = cars[0]?.c.name ?? '';
  return {
    seed: setup.seed, track: setup.track, totalLaps: setup.track.laps, lap: 0, cars,
    events: [{ lap: 0, type: 'start', text: `Lights out! ${pole} leads from pole.`, driverIds: cars[0] ? [cars[0].c.driverId] : [] }],
    fastestLap: null, finished: false,
  };
}

/** Running order: classified cars by time, then retirements by laps completed. */
export function order(cars: RaceCar[]): RaceCar[] {
  return [...cars].sort((a, b) => {
    if (a.dnf !== b.dnf) return a.dnf ? 1 : -1;
    if (a.dnf && b.dnf) return b.lapsDone - a.lapsDone || a.grid - b.grid;
    return a.totalTime - b.totalTime;
  });
}

/** AI pit and mode decisions for the coming lap. */
function aiDecide(car: RaceCar, race: RaceState): CarOrder {
  const lapsLeft = race.totalLaps - race.lap;
  const out: CarOrder = {};
  if (car.playerControlled) return out;
  const needStop = car.pitStops === 0;
  const life = tyreLife(car.c, car.tyre.compound, race.track);
  // Pit when worn, or for the mandatory stop before it's too late. Never on the final lap.
  if (lapsLeft > 1 && (car.tyre.wear >= 68 || (needStop && lapsLeft <= 3) || (needStop && car.tyre.age >= life))) {
    if (!(car.pitStops > 0 && car.tyre.wear < 80 && lapsLeft <= 3)) {
      out.pit = aiNextCompound(car.c, race.track, lapsLeft - 1);
    }
  }
  // Manage pace: push on fresh tyres near the end, conserve if the tyre must last.
  const projectedWear = car.tyre.wear + lapsLeft * COMPOUND_WEAR[car.tyre.compound];
  if (car.pitStops > 0 && lapsLeft <= 5 && car.tyre.wear < 60) out.mode = 'push';
  else if (car.pitStops > 0 && projectedWear > 110) out.mode = 'conserve';
  else out.mode = 'normal';
  return out;
}

/** Simulate one lap for every car. `orders` hold the player's commands for this lap. */
export function stepLap(race: RaceState, orders: Orders = {}): RaceState {
  if (race.finished) return race;
  const rng = createRng(hashSeed(race.seed, 'lap', race.lap + 1));
  const lapNo = race.lap + 1;
  const lapsLeftAfter = race.totalLaps - lapNo;
  const events: RaceEvent[] = [];
  const track = race.track;
  let fastestLap = race.fastestLap;

  const running = order(race.cars);
  const next: RaceCar[] = [];
  let ahead: RaceCar | null = null;

  for (const prev of running) {
    if (prev.dnf) { next.push(prev); continue; }
    const car: RaceCar = { ...prev, tyre: { ...prev.tyre }, compoundsUsed: [...prev.compoundsUsed], pittedThisLap: false };
    const ai = aiDecide(car, race);
    const ord = { ...ai, ...orders[car.c.driverId] };
    if (ord.mode) car.mode = ord.mode;
    if (ord.pit !== undefined) car.pitRequest = ord.pit;

    // Mandatory stop: if a player car still hasn't stopped with 1 lap to go after this one, the team calls it in.
    if (car.pitStops === 0 && !car.pitRequest && lapsLeftAfter === 1) {
      car.pitRequest = aiNextCompound(car.c, track, 1);
      events.push({ lap: lapNo, type: 'forcedpit', text: `${car.c.name} is called in for the mandatory pit stop.`, driverIds: [car.c.driverId] });
    }

    // Retirement?
    const risk = dnfChance(car.c);
    const modeRisk = car.mode === 'push' ? 1.4 : car.mode === 'conserve' ? 0.7 : 1;
    if (rng.chance(risk.mechanical * modeRisk)) {
      car.dnf = true;
      car.dnfReason = rng.pick(['Engine failure', 'Gearbox failure', 'Hydraulics', 'Brake failure', 'Electrical fault']);
    } else if (rng.chance(risk.crash * modeRisk + (car.tyre.wear > 95 ? 0.02 : 0))) {
      car.dnf = true;
      car.dnfReason = rng.pick(['Crashed', 'Spun into the gravel', 'Hit the wall']);
    }
    if (car.dnf) {
      events.push({ lap: lapNo, type: 'dnf', text: `${car.c.name} is out: ${car.dnfReason}.`, driverIds: [car.c.driverId] });
      next.push(car);
      continue;
    }

    // Lap time
    const fuel = 1.8 * ((race.totalLaps - race.lap) / race.totalLaps);
    let t = baseLap(car.c, track) + car.form + COMPOUND_OFFSET[car.tyre.compound] + tyrePenalty(car.tyre.wear) + fuel +
      MODE_DELTA[car.mode] + rng.normal(0, lapSpread(car.c));
    if (rng.chance(0.012 * (1.6 - car.c.consistency / 100) * (car.c.mistakeMult ?? 1))) {
      const loss = rng.float(1, 4);
      t += loss;
      events.push({ lap: lapNo, type: 'mistake', text: `${car.c.name} runs wide and loses ${loss.toFixed(1)}s.`, driverIds: [car.c.driverId] });
    }
    if (lapNo === 1) t += rng.normal(0, 0.6) + (car.c.startDelta ?? 0); // chaotic first lap

    car.tyre.wear = car.tyre.wear + wearPerLap(car.c, car.tyre.compound, car.mode, track);
    car.tyre.age += 1;

    let total = car.totalTime + t;

    // Overtaking: if this car would pass the car ahead, it has to win a fight for it.
    if (ahead && !ahead.dnf && total < ahead.totalTime + 0.15 && !ahead.pittedThisLap) {
      const def = ahead;
      const paceGap = (ahead.totalTime + 0.15 - total); // how much faster the attacker is
      const p = clamp(
        0.32 + (car.c.racecraft - def.c.racecraft) * 0.012 + paceGap * 0.25 - track.profile.overtaking * 0.5 +
          (car.mode === 'push' ? 0.08 : 0) - (def.mode === 'push' ? 0.06 : 0),
        0.04, 0.92,
      );
      if (rng.chance(p)) {
        events.push({ lap: lapNo, type: 'overtake', text: `${car.c.name} passes ${def.c.name}!`, driverIds: [car.c.driverId, def.c.driverId] });
      } else {
        const stuck = def.totalTime + rng.float(0.25, 0.6);
        t += stuck - total;
        total = stuck;
      }
    }

    // Pit stop at the end of the lap.
    if (car.pitRequest && lapsLeftAfter > 0) {
      const stop = pitStopTime(car.c, rng);
      total += track.pitLaneTime + stop.time;
      t += track.pitLaneTime + stop.time;
      car.pitStops += 1;
      car.tyre = { compound: car.pitRequest, wear: 0, age: 0 };
      car.compoundsUsed.push(car.pitRequest);
      events.push({
        lap: lapNo, type: stop.slow ? 'slowstop' : 'pit',
        text: `${car.c.name} pits for ${car.pitRequest}s (${stop.time.toFixed(1)}s stop)${stop.slow ? ' — a slow one!' : ''}.`,
        driverIds: [car.c.driverId],
      });
      car.pitRequest = null;
      car.pittedThisLap = true;
    }

    car.totalTime = total;
    car.lastLap = t;
    car.lapsDone = lapNo;
    if (!car.pittedThisLap && (car.bestLap === 0 || t < car.bestLap)) car.bestLap = t;
    if (!car.pittedThisLap && (!fastestLap || t < fastestLap.time) && lapNo > 1) {
      fastestLap = { driverId: car.c.driverId, time: t };
    }
    next.push(car);
    ahead = car;
  }

  const finished = lapNo >= race.totalLaps;
  if (finished) {
    const winner = order(next)[0];
    if (winner && !winner.dnf) events.push({ lap: lapNo, type: 'finish', text: `Chequered flag! ${winner.c.name} wins.`, driverIds: [winner.c.driverId] });
  }
  return { ...race, lap: lapNo, cars: next, events: [...race.events, ...events], fastestLap, finished };
}

/** Apply a player command right away (it takes effect on the next lap). */
export function applyOrder(race: RaceState, driverId: string, o: CarOrder): RaceState {
  return {
    ...race,
    cars: race.cars.map((c) => c.c.driverId !== driverId || c.dnf ? c : {
      ...c,
      mode: o.mode ?? c.mode,
      pitRequest: o.pit !== undefined ? o.pit : c.pitRequest,
    }),
  };
}

/** Run the rest of the race with AI decisions only. */
export function simulateToEnd(race: RaceState): RaceState {
  let r = race;
  while (!r.finished) r = stepLap(r);
  return r;
}

export function simulateRace(setup: RaceSetup): RaceState {
  return simulateToEnd(initRace(setup));
}

/** Gap to the car ahead and to the leader, in seconds. */
export function gaps(race: RaceState): { driverId: string; toLeader: number; toAhead: number }[] {
  const ord = order(race.cars).filter((c) => !c.dnf);
  return ord.map((c, i) => ({
    driverId: c.c.driverId,
    toLeader: c.totalTime - ord[0].totalTime,
    toAhead: i === 0 ? 0 : c.totalTime - ord[i - 1].totalTime,
  }));
}

/** Turn a finished race into a result (points filled in). */
export function raceToResult(race: RaceState, round: number): RaceResult {
  const entries: ResultEntry[] = order(race.cars).map((car, i) => ({
    driverId: car.c.driverId,
    teamId: car.c.teamId,
    grid: car.grid,
    position: i + 1,
    dnf: car.dnf,
    dnfReason: car.dnfReason,
    points: pointsForPosition(i + 1, car.dnf),
    laps: car.lapsDone,
    totalTime: Math.round(car.totalTime * 1000) / 1000,
    bestLap: Math.round(car.bestLap * 1000) / 1000,
    pitStops: car.pitStops,
    compounds: car.compoundsUsed,
  }));
  return { round, trackId: race.track.id, entries };
}
