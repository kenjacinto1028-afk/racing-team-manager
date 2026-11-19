// Scouting: how precisely the player can see a driver's true potential.
import { clamp, createRng, hashSeed } from './rng';
import type { Driver, GameState } from './types';

/** The player's Scout rating, 0 if the role is empty. */
export function scoutRating(state: GameState): number {
  const id = state.teams[state.playerTeamId].staffIds.scout;
  return id ? state.staff[id]?.rating ?? 0 : 0;
}

/**
 * Estimated potential as a range. No scout: about ±12. A great scout (85+) sees the exact number.
 * Your own drivers are easier to judge (counts as +20 scout rating).
 * The estimate is off-centre by a fixed amount per driver and season, so it doesn't jump around.
 */
export function potentialRange(state: GameState, d: Driver): { lo: number; hi: number; exact: boolean } {
  const own = d.teamId === state.playerTeamId;
  const rating = clamp(scoutRating(state) + (own ? 20 : 0), 0, 100);
  if (rating >= 85) return { lo: d.potential, hi: d.potential, exact: true };
  const half = Math.round(12 * (1 - rating / 85)) + 1;
  const rng = createRng(hashSeed(state.seed, 'scout', d.id, state.season));
  const shift = Math.round(rng.float(-half, half) * 0.6);
  const mid = d.potential + shift;
  const lo = Math.round(clamp(mid - half, 1, 99));
  const hi = Math.round(clamp(mid + half, 1, 99));
  return { lo: Math.min(lo, d.potential), hi: Math.max(hi, d.potential), exact: false };
}
