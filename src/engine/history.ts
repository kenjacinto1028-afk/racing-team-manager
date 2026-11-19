// Season archive: a compact summary of each finished season, kept for career pages and records.
import { TIERS } from '../data/leagues';
import { driverStandings, teamStandings } from './season';
import type { DriverSeasonLine, GameState, HistoryTeamRow, SeasonArchive, StaffSeasonLine, TierId } from './types';

/** Summarise the current (finished) season. Call before results are cleared. */
export function archiveSeason(state: GameState): SeasonArchive {
  const tables = {} as Record<TierId, HistoryTeamRow[]>;
  const champions = {} as Record<TierId, string | null>;
  const drivers: DriverSeasonLine[] = [];
  const staff: StaffSeasonLine[] = [];

  for (const tier of TIERS) {
    const league = state.leagues[tier];
    const teamRows = teamStandings(league);
    tables[tier] = teamRows.map((r) => ({ teamId: r.id, points: r.points, wins: r.wins, podiums: r.podiums }));
    const teamPos = new Map(teamRows.map((r, i) => [r.id, i + 1]));

    const driverRows = driverStandings(league);
    champions[tier] = driverRows[0]?.id ?? null;
    const races = new Map<string, number>();
    for (const res of league.results) for (const e of res.entries) races.set(e.driverId, (races.get(e.driverId) ?? 0) + 1);
    driverRows.forEach((r, i) => {
      drivers.push({
        driverId: r.id, teamId: r.teamId, tier, races: races.get(r.id) ?? 0,
        wins: r.wins, podiums: r.podiums, points: r.points, pos: i + 1,
      });
    });

    for (const teamId of league.teamIds) {
      const team = state.teams[teamId];
      for (const staffId of Object.values(team.staffIds)) {
        if (staffId) staff.push({ staffId, teamId, tier, teamPos: teamPos.get(teamId) ?? 0 });
      }
    }
  }

  const pid = state.playerTeamId;
  const playerTier = state.teams[pid].tier;
  return {
    season: state.season, year: state.year, tables, champions, drivers, staff,
    playerTeamId: pid, playerTier, playerPos: tables[playerTier].findIndex((r) => r.teamId === pid) + 1,
  };
}

/** Add the archive for the current season (skips if this season is already archived). */
export function addToHistory(state: GameState): GameState {
  if (state.history.some((h) => h.season === state.season)) return state;
  return { ...state, history: [...state.history, archiveSeason(state)] };
}

/** Every archived season line for one driver, oldest first. */
export function driverCareer(state: GameState, driverId: string): (DriverSeasonLine & { season: number; year: number })[] {
  return state.history.flatMap((h) => h.drivers.filter((d) => d.driverId === driverId).map((d) => ({ ...d, season: h.season, year: h.year })));
}

/** Every archived season line for one staff member, oldest first. */
export function staffCareer(state: GameState, staffId: string): (StaffSeasonLine & { season: number; year: number })[] {
  return state.history.flatMap((h) => h.staff.filter((p) => p.staffId === staffId).map((p) => ({ ...p, season: h.season, year: h.year })));
}
