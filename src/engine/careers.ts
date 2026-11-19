// Career pages, trophies and personal records, built from the season archive plus the live season.
import { LEAGUES } from '../data/leagues';
import { driverOverall } from './generate';
import { driverStandings, teamStandings } from './season';
import type { DriverSeasonLine, GameState, SeasonArchive, StaffSeasonLine, TierId } from './types';

export interface DriverCareerRow extends DriverSeasonLine { season: number; year: number; live?: boolean }
export interface StaffCareerRow extends StaffSeasonLine { season: number; year: number; live?: boolean }

/** The current season so far, shaped like an archive (not saved). */
export function liveArchive(state: GameState): SeasonArchive {
  const tables = {} as SeasonArchive['tables'];
  const champions = {} as SeasonArchive['champions'];
  const drivers: DriverSeasonLine[] = [];
  const staff: StaffSeasonLine[] = [];
  for (const tier of Object.keys(state.leagues).map(Number) as TierId[]) {
    const L = state.leagues[tier];
    const t = teamStandings(L);
    tables[tier] = t.map((r) => ({ teamId: r.id, points: r.points, wins: r.wins, podiums: r.podiums }));
    const ds = driverStandings(L);
    champions[tier] = null;
    const races = new Map<string, number>();
    const best = new Map<string, number>();
    for (const res of L.results) for (const e of res.entries) {
      races.set(e.driverId, (races.get(e.driverId) ?? 0) + 1);
      if (!e.dnf) best.set(e.driverId, Math.min(best.get(e.driverId) ?? 99, e.position));
    }
    ds.forEach((r, i) => drivers.push({ driverId: r.id, teamId: r.teamId, tier, races: races.get(r.id) ?? 0, wins: r.wins, podiums: r.podiums, points: r.points, pos: i + 1, best: best.get(r.id) ?? 0 }));
    const pos = new Map(t.map((r, i) => [r.id, i + 1]));
    for (const teamId of L.teamIds) for (const sid of Object.values(state.teams[teamId].staffIds)) {
      if (sid) staff.push({ staffId: sid, teamId, tier, teamPos: pos.get(teamId) ?? 0, role: state.staff[sid]?.role, rating: state.staff[sid]?.rating });
    }
  }
  const pid = state.playerTeamId;
  const pt = state.teams[pid].tier;
  return { season: state.season, year: state.year, tables, champions, drivers, staff, playerTeamId: pid, playerTier: pt, playerPos: tables[pt].findIndex((r) => r.teamId === pid) + 1 };
}

const started = (state: GameState) => Object.values(state.leagues).some((L) => L.results.length > 0);

export function driverCareerRows(state: GameState, driverId: string): DriverCareerRow[] {
  const rows: DriverCareerRow[] = state.history.flatMap((h) => h.drivers.filter((d) => d.driverId === driverId).map((d) => ({ ...d, season: h.season, year: h.year })));
  if (started(state) && !state.history.some((h) => h.season === state.season)) {
    const live = liveArchive(state).drivers.find((d) => d.driverId === driverId);
    const d = state.drivers[driverId];
    if (live) rows.push({ ...live, season: state.season, year: state.year, live: true, ovr: d ? driverOverall(d) : undefined, age: d?.age });
  }
  return rows;
}

export function staffCareerRows(state: GameState, staffId: string): StaffCareerRow[] {
  const rows: StaffCareerRow[] = state.history.flatMap((h) => h.staff.filter((p) => p.staffId === staffId).map((p) => ({ ...p, season: h.season, year: h.year })));
  if (started(state) && !state.history.some((h) => h.season === state.season)) {
    const live = liveArchive(state).staff.find((p) => p.staffId === staffId);
    if (live) rows.push({ ...live, season: state.season, year: state.year, live: true });
  }
  return rows;
}

export interface Trophy { kind: 'title' | 'teamTitle' | 'promotion' | 'win' | 'podium'; label: string; season: number; year: number; tier: TierId }

/** A driver's trophies: drivers' titles (and race wins as a count). */
export function driverTrophies(state: GameState, driverId: string): Trophy[] {
  const out: Trophy[] = [];
  for (const h of state.history) {
    for (const tier of Object.keys(h.champions).map(Number) as TierId[]) {
      if (h.champions[tier] === driverId) out.push({ kind: 'title', label: `${LEAGUES[tier].name} champion`, season: h.season, year: h.year, tier });
    }
  }
  return out;
}

export interface TeamSeasonRow {
  season: number; year: number; tier: TierId; pos: number; points: number; wins: number; podiums: number;
  drivers: string[]; moved: 'up' | 'down' | null; live?: boolean;
}

/** Every season a team has raced, oldest first, with where it went next. */
export function teamHistory(state: GameState, teamId: string): TeamSeasonRow[] {
  const archives = [...state.history];
  const liveOn = started(state) && !state.history.some((h) => h.season === state.season);
  const all = liveOn ? [...archives, liveArchive(state)] : archives;
  const rows: TeamSeasonRow[] = [];
  all.forEach((h, idx) => {
    for (const tier of Object.keys(h.tables).map(Number) as TierId[]) {
      const i = h.tables[tier].findIndex((r) => r.teamId === teamId);
      if (i < 0) continue;
      const r = h.tables[tier][i];
      const isLive = liveOn && idx === all.length - 1;
      // Where the team raced next: the following season's tables, or (for the latest archived season) its tier now.
      const nextTier = idx + 1 < all.length
        ? (Object.keys(all[idx + 1].tables).map(Number) as TierId[]).find((t) => all[idx + 1].tables[t].some((x) => x.teamId === teamId))
        : state.teams[teamId]?.tier;
      const moved = isLive || nextTier === undefined || nextTier === tier ? null : nextTier < tier ? 'up' as const : 'down' as const;
      rows.push({
        season: h.season, year: h.year, tier, pos: i + 1, points: r.points, wins: r.wins, podiums: r.podiums,
        drivers: h.drivers.filter((d) => d.teamId === teamId).sort((a, b) => b.points - a.points).map((d) => d.driverId),
        moved,
        live: liveOn && idx === all.length - 1,
      });
    }
  });
  return rows;
}

/** A team's trophy cabinet: league titles, promotions, drivers' titles won in its cars. */
export function teamTrophies(state: GameState, teamId: string): Trophy[] {
  const out: Trophy[] = [];
  for (const r of teamHistory(state, teamId)) {
    if (r.live) continue;
    if (r.pos === 1) out.push({ kind: 'teamTitle', label: `${LEAGUES[r.tier].name} teams' champions`, season: r.season, year: r.year, tier: r.tier });
    if (r.moved === 'up') out.push({ kind: 'promotion', label: `Promoted from ${LEAGUES[r.tier].name}`, season: r.season, year: r.year, tier: r.tier });
  }
  for (const h of state.history) {
    for (const tier of Object.keys(h.champions).map(Number) as TierId[]) {
      const champ = h.champions[tier];
      const line = h.drivers.find((d) => d.driverId === champ && d.tier === tier);
      if (champ && line?.teamId === teamId) out.push({ kind: 'title', label: `Drivers' title (${LEAGUES[tier].short})`, season: h.season, year: h.year, tier });
    }
  }
  return out.sort((a, b) => a.season - b.season);
}

export interface Records {
  seasons: number; races: number; wins: number; podiums: number; points: number; titles: number;
  bestFinish: number; bestSeasonPoints: number; bestSeasonPos: number; longestStreak: number;
}

export function careerRecords(rows: DriverCareerRow[], titles: number): Records {
  const finished = rows.filter((r) => (r.best ?? 0) > 0);
  return {
    seasons: rows.length,
    races: rows.reduce((a, r) => a + r.races, 0),
    wins: rows.reduce((a, r) => a + r.wins, 0),
    podiums: rows.reduce((a, r) => a + r.podiums, 0),
    points: rows.reduce((a, r) => a + r.points, 0),
    titles,
    bestFinish: finished.length ? Math.min(...finished.map((r) => r.best!)) : 0,
    bestSeasonPoints: rows.length ? Math.max(...rows.map((r) => r.points)) : 0,
    bestSeasonPos: rows.length ? Math.min(...rows.map((r) => r.pos)) : 0,
    longestStreak: rows.length ? Math.max(...rows.map((r) => r.streak ?? 0)) : 0,
  };
}
