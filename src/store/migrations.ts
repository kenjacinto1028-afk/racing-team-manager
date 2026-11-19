// Upgrades old saves to the current shape, one version at a time, instead of wiping them.
import { LEAGUES, TIERS } from '../data/leagues';
import { calendarWeeks, createGenCtx, generateStaff } from '../engine/generate';
import { createRng, hashSeed } from '../engine/rng';
import { initialSponsors } from '../engine/sponsors';
import { defaultCarFields } from '../engine/car';
import { defaultDevFields, refreshYouthPool } from '../engine/development';
import { emptyRecords, updateRecords } from '../engine/records';
import type { GameState, TierId } from '../engine/types';

/** Bump when the saved shape changes, and add a step to MIGRATIONS below. */
export const SAVE_VERSION = 6;

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
  // v2 -> v3: sponsors, team morale and spend, budget-cap setting, scouts on the staff market.
  2: (s) => {
    const g = s.game as GameState | null;
    if (!g) return s;
    const teams = Object.fromEntries(Object.entries(g.teams).map(([id, t]) => [id, { ...t, morale: t.morale ?? 70, spend: t.spend ?? 0 }]));
    const ctx = createGenCtx(createRng(hashSeed(g.seed, 'migrate', 3)), g.nextId);
    const staff = { ...g.staff };
    const staffMarket = [...g.staffMarket];
    for (const tier of TIERS as TierId[]) {
      const p = generateStaff(ctx, tier, 'scout', 0.3 + 0.2 * (3 - tier));
      staff[p.id] = p;
      staffMarket.push(p.id);
    }
    let game: GameState = { ...g, teams, staff, staffMarket, nextId: ctx.counter(), settings: g.settings ?? { budgetCap: false }, sponsors: { active: [], offers: [] } };
    game = initialSponsors(game);
    return { ...s, game, lastReview: s.lastReview ? { ...s.lastReview, sponsors: s.lastReview.sponsors ?? [] } : s.lastReview };
  },
  // v3 -> v4: car concept, parts, R&D projects, engine/gearbox wear, setup. A weekend in progress is re-run.
  3: (s) => {
    const g = s.game as GameState | null;
    if (!g) return s;
    const teams = Object.fromEntries(Object.entries(g.teams).map(([id, t]) => [id, { ...defaultCarFields(), ...t }]));
    return { ...s, weekend: null, race: null, game: { ...g, teams, setup: g.setup ?? { wing: 'medium', suspension: 'medium' } } };
  },
  // v4 -> v5: driver morale/traits/training, facilities, youth academy and pool.
  4: (s) => {
    const g = s.game as GameState | null;
    if (!g) return s;
    const drivers = Object.fromEntries(Object.entries(g.drivers).map(([id, d]) => [id, { morale: 70, traits: [], training: 'balanced', ...(d as object) }]));
    const rng = createRng(hashSeed(g.seed, 'migrate', 5));
    const teams = Object.fromEntries(Object.entries(g.teams).map(([id, t]) => [id, { ...defaultDevFields(t.isPlayer ? undefined : rng, 0.4), ...t }]));
    const game = refreshYouthPool({ ...g, drivers, teams, youthPool: [] } as unknown as GameState);
    return { ...s, weekend: null, race: null, game };
  },
  // v5 -> v6: all-time records and the player's feats.
  5: (s) => {
    const g = s.game as GameState | null;
    if (!g) return s;
    // Seed the records from this season's races so far (older seasons kept no lap times).
    let game: GameState = { ...g, records: g.records ?? emptyRecords(), feats: g.feats ?? {} };
    for (const t of TIERS) for (const r of game.leagues[t]?.results ?? []) game = updateRecords(game, t, r).state;
    return { ...s, game };
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
