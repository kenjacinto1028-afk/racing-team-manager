// Player feats: checked after each of the player's races and at season end.
import { LEAGUES } from '../data/leagues';
import type { GameState, RaceResult } from './types';
import type { RecordBreak } from './records';
import type { SeasonReview } from './offseason';

function unlock(state: GameState, ids: string[], when = { season: state.season, year: state.year }): { state: GameState; unlocked: string[] } {
  const feats = { ...(state.feats ?? {}) };
  const unlocked: string[] = [];
  for (const id of ids) {
    if (feats[id]) continue;
    feats[id] = { ...when };
    unlocked.push(id);
  }
  return { state: unlocked.length ? { ...state, feats } : state, unlocked };
}

/** After one of the player's races. `budgetBefore` is the balance before the race. */
export function checkRaceFeats(state: GameState, result: RaceResult, broken: RecordBreak[], budgetBefore: number): { state: GameState; unlocked: string[] } {
  const pid = state.playerTeamId;
  const mine = result.entries.filter((e) => e.teamId === pid);
  const ids: string[] = [];
  if (mine.some((e) => e.points > 0)) ids.push('firstPoints');
  if (mine.some((e) => !e.dnf && e.position <= 3)) ids.push('firstPodium');
  const win = mine.find((e) => !e.dnf && e.position === 1);
  if (win) {
    ids.push('firstWin');
    if (win.grid >= 15) ids.push('fromTheBack');
    if (win.pitStops === 1 && (win.compounds ?? []).length >= 2 && (win.compounds ?? []).every((c) => c === 'hard')) ids.push('hardOneStop');
    const fastest = result.entries.filter((e) => e.bestLap > 0).sort((a, b) => a.bestLap - b.bestLap)[0];
    if (win.grid === 1 && fastest?.driverId === win.driverId) ids.push('grandSlam');
    if (state.drivers[win.driverId]?.academyGrad === pid) ids.push('homegrown');
  }
  if (mine.filter((e) => !e.dnf && e.position <= 2).length === 2) ids.push('oneTwo');
  if (mine.length === 2 && mine.every((e) => e.points > 0)) ids.push('bothFinishPoints');
  if (broken.some((b) => b.kind === 'lap' && b.teamId === pid)) ids.push('lapRecord');
  if (budgetBefore < 0 && state.teams[pid].budget >= 0 && !state.finance.bankrupt) ids.push('closeShave');
  // Points in every race of the season so far, on the last round.
  const tier = state.teams[pid].tier;
  const L = state.leagues[tier];
  if (L.results.length === LEAGUES[tier].races && L.results.every((r) => r.entries.some((e) => e.teamId === pid && e.points > 0))) ids.push('everPresent');
  return unlock(state, ids);
}

/** At season end, from the review (before the new season starts). */
export function checkSeasonFeats(state: GameState, review: SeasonReview): { state: GameState; unlocked: string[] } {
  const pid = state.playerTeamId;
  const ids: string[] = [];
  const up = review.playerTierAfter < review.playerTierBefore;
  if (up) ids.push('promoted');
  if (review.playerTierAfter === 1) ids.push('reachPrime');
  if (review.playerPosition === 1) ids.push('teamTitle');
  if (review.playerPosition === 1 && review.playerTierBefore === 1) ids.push('primeTitle');
  const champ = review.driverTables[review.playerTierBefore]?.[0];
  if (champ && champ.teamId === pid) ids.push('driverTitle');
  // Back-to-back: promoted this season and the season before.
  const prev = state.history.filter((h) => h.season < review.season).pop();
  const prevPrev = state.history.filter((h) => h.season < (prev?.season ?? 0)).pop();
  if (up && prev && prevPrev && prev.playerTier < prevPrev.playerTier) ids.push('backToBack');
  if (up && prev && !prevPrev && state.history.length >= 2 && prev.playerTier < (state.history[0].playerTier)) ids.push('backToBack');
  return unlock(state, ids, { season: review.season, year: review.year });
}
