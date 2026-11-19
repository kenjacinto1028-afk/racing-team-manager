// Upgrades old saves to the current shape, one version at a time, instead of wiping them.
import { LEAGUES, TIERS } from '../data/leagues';
import { calendarWeeks } from '../engine/generate';

/** Bump when the saved shape changes, and add a step to MIGRATIONS below. */
export const SAVE_VERSION = 2;

type Save = Record<string, any>;

/** MIGRATIONS[n] turns a version-n save into a version-(n+1) save. */
const MIGRATIONS: Record<number, (s: Save) => Save> = {
  // v1 -> v2: season history archive and race week numbers.
  1: (s) => {
    const g = s.game;
    if (!g) return s;
    const leagues = { ...g.leagues };
    for (const t of TIERS) {
      const L = leagues[t];
      if (L && !Array.isArray(L.weeks)) leagues[t] = { ...L, weeks: calendarWeeks(L.calendar?.length ?? LEAGUES[t].races) };
    }
    return { ...s, game: { ...g, leagues, history: Array.isArray(g.history) ? g.history : [] } };
  },
};

/**
 * Bring a save from `fromVersion` up to SAVE_VERSION.
 * Returns null when the save can't be upgraded (unknown or future version); the caller then starts fresh.
 */
export function migrateSave(saved: unknown, fromVersion: number): Save | null {
  if (!saved || typeof saved !== 'object') return null;
  if (fromVersion > SAVE_VERSION || fromVersion < 1) return null;
  let s = saved as Save;
  for (let v = fromVersion; v < SAVE_VERSION; v++) {
    const step = MIGRATIONS[v];
    if (!step) return null;
    s = step(s);
  }
  return { ...s, saveVersion: SAVE_VERSION };
}
