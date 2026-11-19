import { describe, expect, it } from 'vitest';
import type { StateStorage } from 'zustand/middleware';
import { generateWorld } from '../../engine/generate';
import { createGameStore } from '../gameStore';
import { migrateSave, SAVE_VERSION } from '../migrations';

const SETUP = { name: 'Test Racing', short: 'TST', primary: '#e10600', secondary: '#ffffff' };

/** A save in the v1 shape: no history, no race weeks. */
function v1Save() {
  const g = generateWorld(11, SETUP) as unknown as Record<string, any>;
  delete g.history;
  for (const t of [1, 2, 3]) delete g.leagues[t].weeks;
  return { saveVersion: 1, game: g, weekend: null, race: null, raceSpeed: 4, lastRace: null, lastReview: null };
}

describe('save migration', () => {
  it('upgrades a v1 save and keeps the career', () => {
    const old = v1Save();
    const m = migrateSave(old, 1)!;
    expect(m.saveVersion).toBe(SAVE_VERSION);
    expect(m.game.history).toEqual([]);
    expect(m.game.leagues[3].weeks).toHaveLength(old.game.leagues[3].calendar.length);
    expect(m.game.teams).toEqual(old.game.teams);
    expect(m.game.playerTeamId).toBe(old.game.playerTeamId);
  });

  it('refuses unknown or future versions', () => {
    expect(migrateSave(v1Save(), 0)).toBeNull();
    expect(migrateSave(v1Save(), SAVE_VERSION + 1)).toBeNull();
    expect(migrateSave(null, 1)).toBeNull();
  });

  it('the store loads a v1 save from storage without wiping it', async () => {
    const data = new Map<string, string>();
    const storage: StateStorage = { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
    const old = v1Save();
    data.set('mig', JSON.stringify({ state: old, version: 1 }));
    const store = createGameStore(storage, 'mig');
    await store.persist.rehydrate();
    const g = store.getState().game!;
    expect(g.playerTeamId).toBe(old.game.playerTeamId);
    expect(g.history).toEqual([]);
    expect(g.leagues[1].weeks).toHaveLength(12);
    expect(store.getState().saveVersion).toBe(SAVE_VERSION);
  });
});
