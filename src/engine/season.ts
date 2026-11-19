import { BOTTOM_TIER, LEAGUES, MOVE_SPOTS, POINTS, TIERS } from '../data/leagues';
import { clamp, type Rng } from './rng';
import type { Driver, GameState, LeagueState, RaceResult, ResultEntry, TierId } from './types';

export function pointsForPosition(position: number, dnf = false): number {
  if (dnf || position < 1) return 0;
  return POINTS[position - 1] ?? 0;
}

/** Fill in points from finishing positions. */
export function scoreEntries(entries: ResultEntry[]): ResultEntry[] {
  return entries.map((e) => ({ ...e, points: pointsForPosition(e.position, e.dnf) }));
}

export function recordResult(state: GameState, tier: TierId, result: RaceResult): GameState {
  const league = state.leagues[tier];
  const scored: RaceResult = { ...result, entries: scoreEntries(result.entries) };
  return {
    ...state,
    leagues: { ...state.leagues, [tier]: { ...league, results: [...league.results, scored] } },
  };
}

export function currentRound(league: LeagueState): number {
  return league.results.length;
}

export function isLeagueComplete(league: LeagueState): boolean {
  return league.results.length >= LEAGUES[league.tier].races;
}

export interface StandingRow {
  id: string;
  /** For driver rows: the team they last raced for. */
  teamId: string;
  points: number;
  wins: number;
  podiums: number;
  /** finishes[i] = number of (i+1)th places. Used for tie-breaks. */
  finishes: number[];
}

const emptyRow = (id: string, teamId: string): StandingRow => ({ id, teamId, points: 0, wins: 0, podiums: 0, finishes: [] });

function addEntry(row: StandingRow, e: ResultEntry) {
  row.points += e.points;
  row.teamId = e.teamId;
  if (!e.dnf) {
    if (e.position === 1) row.wins++;
    if (e.position <= 3) row.podiums++;
    row.finishes[e.position - 1] = (row.finishes[e.position - 1] ?? 0) + 1;
  }
}

/** Points first, then countback (most wins, then most 2nds, ...), then id for a stable order. */
export function compareRows(a: StandingRow, b: StandingRow): number {
  if (b.points !== a.points) return b.points - a.points;
  const n = Math.max(a.finishes.length, b.finishes.length);
  for (let i = 0; i < n; i++) {
    const d = (b.finishes[i] ?? 0) - (a.finishes[i] ?? 0);
    if (d !== 0) return d;
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function driverStandings(league: LeagueState): StandingRow[] {
  const rows = new Map<string, StandingRow>();
  for (const r of league.results) {
    for (const e of r.entries) {
      if (!rows.has(e.driverId)) rows.set(e.driverId, emptyRow(e.driverId, e.teamId));
      addEntry(rows.get(e.driverId)!, e);
    }
  }
  return [...rows.values()].sort(compareRows);
}

/** Every team in the league appears, even with 0 points. */
export function teamStandings(league: LeagueState): StandingRow[] {
  const rows = new Map<string, StandingRow>(league.teamIds.map((id) => [id, emptyRow(id, id)]));
  for (const r of league.results) {
    for (const e of r.entries) {
      const row = rows.get(e.teamId);
      if (row) addEntry(row, e);
    }
  }
  return [...rows.values()].sort(compareRows);
}

/** 1-based championship position of a team, or 0 if not in the league. */
export function teamPosition(league: LeagueState, teamId: string): number {
  return teamStandings(league).findIndex((r) => r.id === teamId) + 1;
}

export interface TeamMove { teamId: string; from: TierId; to: TierId }

/** Who goes up and who goes down. Top 2 of tiers 2-3 go up; bottom 2 of tiers 1-2 go down. */
export function seasonMoves(state: GameState): { promoted: TeamMove[]; relegated: TeamMove[] } {
  const promoted: TeamMove[] = [];
  const relegated: TeamMove[] = [];
  for (const tier of TIERS) {
    const table = teamStandings(state.leagues[tier]);
    if (tier > 1) {
      table.slice(0, MOVE_SPOTS).forEach((r) => promoted.push({ teamId: r.id, from: tier, to: (tier - 1) as TierId }));
    }
    if (tier < BOTTOM_TIER) {
      table.slice(-MOVE_SPOTS).forEach((r) => relegated.push({ teamId: r.id, from: tier, to: (tier + 1) as TierId }));
    }
  }
  return { promoted, relegated };
}

/** Moves teams between tiers. Results stay in place (call startNewSeason to reset them). */
export function applyPromotionRelegation(state: GameState): GameState {
  const { promoted, relegated } = seasonMoves(state);
  const moves = [...promoted, ...relegated];
  const teams = { ...state.teams };
  const leagues = { ...state.leagues };
  for (const tier of TIERS) leagues[tier] = { ...leagues[tier], teamIds: [...leagues[tier].teamIds] };
  for (const m of moves) {
    teams[m.teamId] = { ...teams[m.teamId], tier: m.to };
    leagues[m.from].teamIds = leagues[m.from].teamIds.filter((id) => id !== m.teamId);
    leagues[m.to].teamIds.push(m.teamId);
  }
  return { ...state, teams, leagues };
}

const GROWTH_STATS = ['pace', 'consistency', 'racecraft', 'tyreManagement'] as const;

/** One year older: young drivers grow toward potential, veterans decline, some retire. */
export function ageDriver(d: Driver, rng: Rng): Driver {
  const age = d.age + 1;
  const next: Driver = { ...d, age, experience: Math.min(99, d.experience + rng.int(2, 5)) };
  for (const k of GROWTH_STATS) {
    let v = d[k];
    if (age <= 25) {
      const room = Math.max(0, d.potential - v);
      v += Math.round(room * rng.float(0.15, 0.4));
    } else if (age >= 33) {
      v -= rng.int(1, 3) + (age >= 36 ? 1 : 0);
    } else {
      v += rng.int(-1, 1);
    }
    next[k] = Math.round(clamp(v, 1, 99));
  }
  return next;
}

export function retires(d: Driver, rng: Rng): boolean {
  if (d.age >= 40) return true;
  if (d.age >= 35) return rng.chance(0.15 + (d.age - 35) * 0.15);
  return false;
}

/** Age every driver. Retired drivers leave their team and the market. */
export function ageAllDrivers(state: GameState, rng: Rng): { state: GameState; retired: string[] } {
  const drivers: Record<string, Driver> = {};
  const retired: string[] = [];
  for (const id of Object.keys(state.drivers).sort()) {
    const d = state.drivers[id];
    if (d.retired) { drivers[id] = d; continue; }
    const aged = ageDriver(d, rng);
    if (retires(aged, rng)) {
      drivers[id] = { ...aged, retired: true, teamId: null, contract: null };
      retired.push(id);
    } else {
      drivers[id] = aged;
    }
  }
  const gone = new Set(retired);
  const teams = Object.fromEntries(
    Object.entries(state.teams).map(([id, t]) => [id, { ...t, driverIds: t.driverIds.filter((x) => !gone.has(x)) }]),
  );
  return {
    state: { ...state, drivers, teams, driverMarket: state.driverMarket.filter((x) => !gone.has(x)) },
    retired,
  };
}
