// Builds race inputs from the game state.
import { updateRecords, type RecordBreak } from './records';
import { TRACK_BY_ID } from '../data/tracks';
import { hashSeed } from './rng';
import type { Competitor } from './performance';
import { runQualifying, type QualiEntry } from './qualifying';
import { initRace, raceToResult, simulateRace, type RaceState } from './raceSim';
import { applyRaceFinances } from './finance';
import { recordResult } from './season';
import type { GameState, StaffRole, Team, TierId, Track } from './types';
import { afterRace, aiSetup, applyGridPenalties, conceptDelta, conceptWear, effectiveCar, setupDelta, wearRisk } from './car';
import { createRng } from './rng';
import { developAfterRace, gymCrashMult, moraleDelta, traitEffects } from './development';

function staffRating(state: GameState, team: Team, role: StaffRole): number {
  const id = team.staffIds[role];
  return id ? state.staff[id]?.rating ?? 0 : 0;
}

/**
 * Race inputs for a team's cars. With a track, setup and car concept are included:
 * the player's setup comes from the game state; AI teams pick theirs (better engineers pick better).
 */
export function teamCompetitors(state: GameState, teamId: string, track?: Track, seed = 0): Competitor[] {
  const team = state.teams[teamId];
  const car = effectiveCar(team);
  let lapDelta = 0;
  if (track) {
    const setup = team.isPlayer && state.setup ? state.setup : aiSetup(track, staffRating(state, team, 'raceEngineer'), createRng(hashSeed(seed, 'setup', teamId)));
    lapDelta = setupDelta(setup, track) + conceptDelta(team.concept ?? 'balanced', track);
  }
  return team.driverIds.map((id) => {
    const d = state.drivers[id];
    const tr = traitEffects(d.traits ?? [], track?.id);
    return {
      driverId: d.id, teamId, name: d.lastName,
      pace: d.pace, consistency: d.consistency, racecraft: d.racecraft, tyreManagement: d.tyreManagement, experience: d.experience,
      car,
      engineer: staffRating(state, team, 'raceEngineer'),
      mechanic: staffRating(state, team, 'chiefMechanic'),
      pitCrew: staffRating(state, team, 'pitCrewChief'),
      morale: team.morale ?? 70,
      lapDelta: lapDelta + (tr.lapDelta ?? 0) + moraleDelta(d.morale ?? 70),
      tyreWearMult: conceptWear(team.concept ?? 'balanced') * (tr.tyreWearMult ?? 1),
      mechRisk: (team.units ? wearRisk(team) : 1) * (tr.mechRisk ?? 1),
      crashMult: (tr.crashMult ?? 1) * gymCrashMult(team),
      mistakeMult: tr.mistakeMult,
      startDelta: tr.startDelta,
      qualiDelta: tr.qualiDelta,
    };
  });
}

export function leagueField(state: GameState, tier: TierId, track?: Track, seed = 0): Competitor[] {
  return state.leagues[tier].teamIds.flatMap((id) => teamCompetitors(state, id, track, seed));
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
  /** Starting order after grid penalties (driver ids). */
  grid?: string[];
  /** Grid places lost per driver. */
  penalties?: Record<string, number>;
}

/** Next race for a tier: qualifying is run immediately. Returns null when the season is over. */
export function prepareWeekend(state: GameState, tier: TierId): Weekend | null {
  const league = state.leagues[tier];
  const round = league.results.length + 1;
  const trackId = league.calendar[round - 1];
  if (!trackId) return null;
  const track = TRACK_BY_ID[trackId];
  const seed = raceSeed(state, tier, round);
  const field = leagueField(state, tier, track, seed);
  const qualifying = runQualifying(field, track, seed);
  const { order, penalties } = applyGridPenalties(qualifying, (teamId) => state.teams[teamId].gridPenalty ?? 0);
  return { tier, round, field, qualifying, seed, grid: order, penalties };
}

export function startRace(w: Weekend, trackId: string, opts: { playerDriverIds?: string[]; startCompounds?: Record<string, 'soft' | 'medium' | 'hard'> } = {}): RaceState {
  return initRace({
    field: w.field, grid: w.grid ?? w.qualifying.map((q) => q.driverId), track: TRACK_BY_ID[trackId], seed: w.seed,
    playerDriverIds: opts.playerDriverIds, startCompounds: opts.startCompounds,
  });
}

/** Record a finished race: result, points and money. */
export function completeRace(state: GameState, tier: TierId, race: RaceState, round: number): GameState {
  return completeRaceDetailed(state, tier, race, round).state;
}

/** Same as completeRace, but also reports any all-time records that fell. */
export function completeRaceDetailed(state: GameState, tier: TierId, race: RaceState, round: number): { state: GameState; broken: RecordBreak[] } {
  const result = raceToResult(race, round);
  const next = developAfterRace(afterRace(applyRaceFinances(recordResult(state, tier, result), tier), tier), tier, result);
  return updateRecords(next, tier, result);
}

/** Simulate a tier's next race entirely with AI (used for the leagues the player is not in). */
export function autoRaceNext(state: GameState, tier: TierId): GameState {
  const w = prepareWeekend(state, tier);
  if (!w) return state;
  const trackId = state.leagues[tier].calendar[w.round - 1];
  const race = simulateRace({ field: w.field, grid: w.grid ?? w.qualifying.map((q) => q.driverId), track: TRACK_BY_ID[trackId], seed: w.seed });
  return completeRace(state, tier, race, w.round);
}
