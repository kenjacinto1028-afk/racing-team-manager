import { describe, expect, it } from 'vitest';
import { TRACK_BY_ID, TRACKS } from '../../data/tracks';
import type { Competitor } from '../performance';
import { runQualifying } from '../qualifying';
import { initRace, order, raceToResult, simulateRace, stepLap, simulateToEnd } from '../raceSim';
import { autoRaceNext, prepareWeekend } from '../raceSetup';
import { world } from './helpers';

function comp(id: string, level: number, over: Partial<Competitor> = {}): Competitor {
  return {
    driverId: id, teamId: `t_${id}`, name: id,
    pace: level, consistency: level, racecraft: level, tyreManagement: level, experience: level,
    car: { engine: level, aero: level, chassis: level, reliability: level },
    engineer: level, mechanic: level, pitCrew: level, ...over,
  };
}

const field = (strong: number, rest: number) => [comp('strong', strong), ...Array.from({ length: 19 }, (_, i) => comp(`m${i}`, rest + (i % 5) - 2))];

describe('qualifying', () => {
  it('is deterministic and sets a full grid', () => {
    const f = field(60, 50);
    const a = runQualifying(f, TRACKS[0], 1);
    expect(a).toEqual(runQualifying(f, TRACKS[0], 1));
    expect(a.map((q) => q.position)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });
});

describe('race simulation', () => {
  const track = TRACK_BY_ID.harbour;

  it('same seed gives the same result', () => {
    const f = field(60, 50);
    const grid = f.map((c) => c.driverId);
    const a = raceToResult(simulateRace({ field: f, grid, track, seed: 99 }), 1);
    const b = raceToResult(simulateRace({ field: f, grid, track, seed: 99 }), 1);
    expect(a).toEqual(b);
    const c = raceToResult(simulateRace({ field: f, grid, track, seed: 100 }), 1);
    expect(c).not.toEqual(a);
  });

  it('runs the full distance and every finisher makes at least one pit stop', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const f = field(55, 50);
      const r = simulateRace({ field: f, grid: f.map((c) => c.driverId), track: TRACKS[seed % TRACKS.length], seed });
      expect(r.finished).toBe(true);
      for (const car of r.cars) {
        if (!car.dnf) {
          expect(car.lapsDone).toBe(r.totalLaps);
          expect(car.pitStops).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });

  it('forces the mandatory stop on a player car that never pits', () => {
    const f = field(55, 50);
    const r = simulateRace({ field: f, grid: f.map((c) => c.driverId), track, seed: 5, playerDriverIds: ['strong'] });
    const me = r.cars.find((c) => c.c.driverId === 'strong')!;
    if (!me.dnf) expect(me.pitStops).toBe(1);
    expect(r.events.some((e) => e.type === 'forcedpit')).toBe(true);
  });

  it('obeys player pit orders and driver modes', () => {
    const f = field(55, 50);
    let r = initRace({ field: f, grid: f.map((c) => c.driverId), track, seed: 3, playerDriverIds: ['strong'] });
    r = stepLap(r, { strong: { mode: 'push' } });
    r = stepLap(r, { strong: { pit: 'hard' } });
    const me = r.cars.find((c) => c.c.driverId === 'strong')!;
    if (!me.dnf) {
      expect(me.mode).toBe('push');
      expect(me.pitStops).toBe(1);
      expect(me.tyre.compound).toBe('hard');
    }
  });

  it('produces overtakes and some DNFs over many races', () => {
    let overtakes = 0, dnfs = 0;
    for (let seed = 1; seed <= 50; seed++) {
      const f = field(55, 50);
      const r = simulateRace({ field: f, grid: [...f.map((c) => c.driverId)].reverse(), track, seed });
      overtakes += r.events.filter((e) => e.type === 'overtake').length;
      dnfs += r.cars.filter((c) => c.dnf).length;
    }
    expect(overtakes / 50).toBeGreaterThan(3);
    expect(dnfs / 50).toBeGreaterThan(0.2);
    expect(dnfs / 50).toBeLessThan(4);
  });

  it('balance: the stronger car and driver usually wins, but not always', () => {
    let wins = 0;
    for (let seed = 1; seed <= 100; seed++) {
      const t = TRACKS[seed % TRACKS.length];
      const f = field(62, 52);
      const q = runQualifying(f, t, seed);
      const r = simulateRace({ field: f, grid: q.map((x) => x.driverId), track: t, seed });
      if (order(r.cars)[0].c.driverId === 'strong') wins++;
    }
    expect(wins).toBeGreaterThan(50);
    expect(wins).toBeLessThan(97);
  });

  it('a clearly faster car beats a slower one head to head most of the time', () => {
    let fastAhead = 0;
    for (let seed = 1; seed <= 100; seed++) {
      const f = [comp('fast', 65), comp('slow', 45), ...Array.from({ length: 8 }, (_, i) => comp(`x${i}`, 55))];
      const r = simulateRace({ field: f, grid: f.map((c) => c.driverId), track: TRACKS[seed % TRACKS.length], seed });
      const o = order(r.cars).map((c) => c.c.driverId);
      if (o.indexOf('fast') < o.indexOf('slow')) fastAhead++;
    }
    expect(fastAhead).toBeGreaterThan(85);
  });

  it('can be stepped lap by lap to the same result as a full simulation', () => {
    const f = field(55, 50);
    const setup = { field: f, grid: f.map((c) => c.driverId), track, seed: 11 };
    let r = initRace(setup);
    for (let i = 0; i < 5; i++) r = stepLap(r);
    expect(raceToResult(simulateToEnd(r), 1)).toEqual(raceToResult(simulateRace(setup), 1));
  });
});

describe('race weekend from game state', () => {
  it('auto-races a league round and records points and money', () => {
    let s = world();
    const w = prepareWeekend(s, 2)!;
    expect(w.qualifying).toHaveLength(20);
    const budgets = s.leagues[2].teamIds.map((id) => s.teams[id].budget);
    s = autoRaceNext(s, 2);
    expect(s.leagues[2].results).toHaveLength(1);
    const pts = s.leagues[2].results[0].entries.reduce((a, e) => a + e.points, 0);
    expect(pts).toBeLessThanOrEqual(101);
    expect(s.leagues[2].teamIds.map((id) => s.teams[id].budget)).not.toEqual(budgets);
  });
});
