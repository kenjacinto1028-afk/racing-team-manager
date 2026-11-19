// Side championships (Endurance Cup, Street Invitational, Winter Series) for teams in the lower leagues.
import { LEAGUES, SIDE_SERIES_TIERS } from '../data/leagues';
import { SIDE_BY_ID, SIDE_SERIES, type SideId } from '../data/sideSeries';
import { TRACK_BY_ID, TRACKS } from '../data/tracks';
import { STREET_TRACKS } from '../data/traits';
import { wearPerRace } from './car';
import type { Competitor } from './performance';
import { raceToResult, simulateRace } from './raceSim';
import { teamCompetitors } from './raceSetup';
import { clamp, createRng, hashSeed } from './rng';
import { pointsForPosition } from './season';
import type { GameState, LedgerEntry, RaceResult, SideState, UnitKind } from './types';

export { SIDE_SERIES, SIDE_BY_ID, type SideId };

export const emptySide = (season: number): SideState => ({ season, entered: [], results: {} });

/** Side series are open to Academy, Regional and Rookie teams only. */
export function sideOpen(state: GameState): boolean {
  return SIDE_SERIES_TIERS.includes(state.teams[state.playerTeamId].tier);
}

const money = (state: GameState, x: number) => Math.round((LEAGUES[state.teams[state.playerTeamId].tier].sponsorPerRace * x) / 1000) * 1000;
export const sideFee = (state: GameState, id: SideId) => money(state, SIDE_BY_ID[id].fee);
export const sideRunning = (state: GameState, id: SideId) => money(state, SIDE_BY_ID[id].running);
export const sidePrize = (state: GameState, id: SideId, pos: number) => (pos >= 1 && pos <= 10 ? money(state, SIDE_BY_ID[id].prize[pos - 1]) : 0);

/** After which of the player's league rounds each race runs. Winter Series runs at season end (round = races). */
export function sideRounds(state: GameState, id: SideId): number[] {
  const M = LEAGUES[state.teams[state.playerTeamId].tier].races;
  if (id === 'endurance') return [Math.ceil(M / 3), Math.ceil((2 * M) / 3), M];
  if (id === 'street') return [Math.ceil(M / 2)];
  return [M, M, M, M];
}

const playerRound = (state: GameState) => state.leagues[state.teams[state.playerTeamId].tier].results.length;
const side = (state: GameState): SideState => (state.side && state.side.season === state.season ? state.side : emptySide(state.season));

/** Can still enter: open league, not entered, before the first race of that series. */
export function canEnter(state: GameState, id: SideId): { ok: true } | { ok: false; reason: string } {
  if (!sideOpen(state)) return { ok: false, reason: 'Side series are only for Academy, Regional and Rookie teams' };
  const s = side(state);
  if (s.entered.includes(id)) return { ok: false, reason: 'Already entered' };
  const r = playerRound(state);
  const first = sideRounds(state, id)[0];
  if (id === 'winter' ? !!s.winterDone : r >= first) return { ok: false, reason: 'Entries have closed for this season' };
  if (state.teams[state.playerTeamId].budget < sideFee(state, id)) return { ok: false, reason: 'Not enough money for the entry fee' };
  return { ok: true };
}

function ledger(state: GameState, entries: LedgerEntry[]): GameState {
  return { ...state, finance: { ...state.finance, ledger: [...state.finance.ledger, ...entries].slice(-300) } };
}

function pay(state: GameState, amount: number, label: string): GameState {
  const pid = state.playerTeamId;
  const t = state.teams[pid];
  const s = { ...state, teams: { ...state.teams, [pid]: { ...t, budget: t.budget + amount } } };
  return ledger(s, [{ season: state.season, round: playerRound(state), label, amount }]);
}

export function enterSide(state: GameState, id: SideId): { ok: true; state: GameState } | { ok: false; reason: string } {
  const c = canEnter(state, id);
  if (!c.ok) return c;
  const s = side(state);
  const next = pay({ ...state, side: { ...s, entered: [...s.entered, id] } }, -sideFee(state, id), `${SIDE_BY_ID[id].name} entry fee`);
  return { ok: true, state: next };
}

/** The other entrants: a seeded pick of teams from the eligible leagues. */
function rivals(state: GameState, id: SideId, count: number): string[] {
  const rng = createRng(hashSeed(state.seed, 'side-field', state.season, id));
  const pool = Object.values(state.teams).filter((t) => !t.isPlayer && SIDE_SERIES_TIERS.includes(t.tier) && t.driverIds.length === 2).map((t) => t.id).sort();
  return rng.shuffle(pool).slice(0, count);
}

/** Two drivers sharing one car: their skills are averaged. */
function shareCar(cars: Competitor[]): Competitor {
  if (cars.length < 2) return cars[0];
  const [a, b] = cars;
  const avg = (k: 'pace' | 'consistency' | 'racecraft' | 'tyreManagement' | 'experience') => (a[k] + b[k]) / 2;
  return { ...a, name: `${a.name}/${b.name}`, pace: avg('pace'), consistency: avg('consistency'), racecraft: avg('racecraft'), tyreManagement: avg('tyreManagement'), experience: avg('experience') };
}

export function sideTracks(state: GameState, id: SideId): string[] {
  const rng = createRng(hashSeed(state.seed, 'side-tracks', state.season, id));
  if (id === 'street') return [rng.pick(STREET_TRACKS)];
  return rng.shuffle(TRACKS.map((t) => t.id)).slice(0, SIDE_BY_ID[id].races);
}

/** Simulate one side-series race. */
export function runSideRace(state: GameState, id: SideId, round: number): RaceResult {
  const def = SIDE_BY_ID[id];
  const base = TRACK_BY_ID[sideTracks(state, id)[round - 1]];
  const track = { ...base, laps: Math.max(10, Math.round(base.laps * def.lapsMult)) };
  const seed = hashSeed(state.seed, 'side', state.season, id, round);
  const teamIds = [state.playerTeamId, ...rivals(state, id, def.shared ? 11 : 9)];
  const field = teamIds.flatMap((tid) => {
    const cars = teamCompetitors(state, tid, track, seed).map((c) => ({ ...c, crashMult: (c.crashMult ?? 1) * def.crashMult }));
    return def.shared ? [shareCar(cars)] : cars;
  });
  // Grid by a quick random-but-fair order: better cars and drivers tend to start ahead.
  const rng = createRng(hashSeed(seed, 'grid'));
  const grid = [...field].sort((x, y) => (y.pace + y.car.engine + y.car.aero + rng.normal(0, 8)) - (x.pace + x.car.engine + x.car.aero + rng.normal(0, 8))).map((c) => c.driverId);
  const res = raceToResult(simulateRace({ field, grid, track, seed }), round);
  return { ...res, trackId: base.id, entries: res.entries.map((e) => ({ ...e, points: pointsForPosition(e.position, e.dnf) })) };
}

export interface SideNews { id: SideId; round: number; pos: number | null; prize: number; text: string }

/** Run one race of a series for the player: prize money, running costs, wear and driver mileage. */
function playSideRace(state: GameState, id: SideId): { state: GameState; news: SideNews } {
  const def = SIDE_BY_ID[id];
  const s0 = side(state);
  const done = s0.results[id]?.length ?? 0;
  const round = done + 1;
  const result = runSideRace(state, id, round);
  const pid = state.playerTeamId;
  const mine = result.entries.filter((e) => e.teamId === pid && !e.dnf);
  const pos = mine.length ? Math.min(...mine.map((e) => e.position)) : null;
  const prize = pos ? sidePrize(state, id, pos) : 0;
  let s: GameState = { ...state, side: { ...s0, results: { ...s0.results, [id]: [...(s0.results[id] ?? []), result] } } };
  s = pay(s, -sideRunning(state, id), `${def.name} race ${round}: running costs`);
  if (prize) s = pay(s, prize, `${def.name} race ${round}: prize (P${pos})`);
  // Engine and gearbox wear, and mileage for the drivers.
  const team = s.teams[pid];
  if (def.wearMult > 0 && team.units) {
    const units = { ...team.units };
    for (const k of ['engine', 'gearbox'] as UnitKind[]) units[k] = { ...units[k], wear: Math.min(100, Math.round(units[k].wear + wearPerRace(team.tier, k) * def.wearMult)) };
    s = { ...s, teams: { ...s.teams, [pid]: { ...s.teams[pid], units } } };
  }
  const drivers = { ...s.drivers };
  for (const did of team.driverIds) {
    const d = drivers[did];
    if (!d || (id === 'winter' && d.age > 22)) continue;
    drivers[did] = { ...d, experience: clamp(d.experience + def.experience, 1, 99) };
  }
  s = { ...s, drivers };
  const where = TRACK_BY_ID[result.trackId]?.name ?? '';
  const text = pos ? `${def.name} race ${round} at ${where}: P${pos}` : `${def.name} race ${round} at ${where}: ${def.shared ? 'car retired' : 'both cars out'}`;
  return { state: s, news: { id, round, pos, prize, text } };
}

/** Run every in-season side race that is due after the player's latest league round. */
export function runDueSideRaces(state: GameState): { state: GameState; news: SideNews[] } {
  let s = state;
  const news: SideNews[] = [];
  if (!state.side || state.side.season !== state.season) return { state, news };
  const r = playerRound(state);
  for (const id of state.side.entered) {
    if (id === 'winter') continue;
    const rounds = sideRounds(state, id);
    while ((side(s).results[id]?.length ?? 0) < rounds.length && rounds[side(s).results[id]?.length ?? 0] <= r) {
      const out = playSideRace(s, id);
      s = out.state; news.push(out.news);
    }
  }
  return { state: s, news };
}

/** Season end: run the Winter Series if entered (before the offseason). */
export function runWinterSeries(state: GameState): { state: GameState; news: SideNews[] } {
  let s = state;
  const news: SideNews[] = [];
  if (!state.side || state.side.season !== state.season || !state.side.entered.includes('winter') || state.side.winterDone) return { state, news };
  for (let i = 0; i < SIDE_BY_ID.winter.races; i++) {
    const out = playSideRace(s, 'winter');
    s = out.state; news.push(out.news);
  }
  return { state: { ...s, side: { ...side(s), winterDone: true } }, news };
}

export interface SideRow { id: string; teamId: string; points: number; wins: number; best: number }

/** Series table, by team (best car counts for position, both cars score points). */
export function sideStandings(results: RaceResult[]): SideRow[] {
  const rows = new Map<string, SideRow>();
  for (const r of results) {
    for (const e of r.entries) {
      const row = rows.get(e.teamId) ?? { id: e.teamId, teamId: e.teamId, points: 0, wins: 0, best: 99 };
      row.points += e.points;
      if (!e.dnf && e.position === 1) row.wins++;
      if (!e.dnf) row.best = Math.min(row.best, e.position);
      rows.set(e.teamId, row);
    }
  }
  return [...rows.values()].sort((a, b) => b.points - a.points || b.wins - a.wins || a.best - b.best);
}
