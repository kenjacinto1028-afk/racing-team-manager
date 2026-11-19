// Builds race inputs from the game state.
import { TRACK_BY_ID } from '../data/tracks';
import { hashSeed } from './rng';
import type { Competitor } from './performance';
import { runQualifying, type QualiEntry } from './qualifying';
import { initRace, raceToResult, simulateRace, type RaceState } from './raceSim';
import { applyRaceFinances } from './finance';
import { recordResult } from './season';
import type { GameState, StaffRole, Team, TierId } from './types';

function staffRating(state: GameState, team: Team, role: StaffRole): number {
  const id = team.staffIds[role];
  return id ? state.staff[id]?.rating ?? 0 : 0;
}

export function teamCompetitors(state: GameState, teamId: string): Competitor[] {
  const team = state.teams[teamId];
  return team.driverIds.map((id) => {
    const d = state.drivers[id];
    return {
      driverId: d.id, teamId, name: d.lastName,
      pace: d.pace, consistency: d.consistency, racecraft: d.racecraft, tyreManagement: d.tyreManagement, experience: d.experience,
      car: team.car,
      engineer: staffRating(state, team, 'raceEngineer'),
      mechanic: staffRating(state, team, 'chiefMechanic'),
      pitCrew: staffRating(state, team, 'pitCrewChief'),
    };
  });
}

export function leagueField(state: GameState, tier: TierId): Competitor[] {
  return state.leagues[tier].teamIds.flatMap((id) => teamCompetitors(state, id));
}

export function raceSeed(state: GameState, tier: TierId, round: number): number {
  return hashSeed(state.seed, 'season', state.season, 'tier', tier, 'round', round);
}

export interface Weekend {
  tier: TierId;
  round: number;
  field: Competitor[];
  qualifying: QualiEntry[];
  seed: number;
}

/** Next race for a tier: qualifying is run immediately. Returns null when the season is over. */
export function prepareWeekend(state: GameState, tier: TierId): Weekend | null {
  const league = state.leagues[tier];
  const round = league.results.length + 1;
  const trackId = league.calendar[round - 1];
  if (!trackId) return null;
  const track = TRACK_BY_ID[trackId];
  const field = leagueField(state, tier);
  const seed = raceSeed(state, tier, round);
  return { tier, round, field, qualifying: runQualifying(field, track, seed), seed };
}

export function startRace(w: Weekend, trackId: string, opts: { playerDriverIds?: string[]; startCompounds?: Record<string, 'soft' | 'medium' | 'hard'> } = {}): RaceState {
  return initRace({
    field: w.field, grid: w.qualifying.map((q) => q.driverId), track: TRACK_BY_ID[trackId], seed: w.seed,
    playerDriverIds: opts.playerDriverIds, startCompounds: opts.startCompounds,
  });
}

/** Record a finished race: result, points and money. */
export function completeRace(state: GameState, tier: TierId, race: RaceState, round: number): GameState {
  return applyRaceFinances(recordResult(state, tier, raceToResult(race, round)), tier);
}

/** Simulate a tier's next race entirely with AI (used for the leagues the player is not in). */
export function autoRaceNext(state: GameState, tier: TierId): GameState {
  const w = prepareWeekend(state, tier);
  if (!w) return state;
  const trackId = state.leagues[tier].calendar[w.round - 1];
  const race = simulateRace({ field: w.field, grid: w.qualifying.map((q) => q.driverId), track: TRACK_BY_ID[trackId], seed: w.seed });
  return completeRace(state, tier, race, w.round);
}
