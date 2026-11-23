import { describe, expect, it } from 'vitest';
import type { StateStorage } from 'zustand/middleware';
import { createGameStore } from '../gameStore';

function memoryStorage(): StateStorage {
  const data = new Map<string, string>();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

const SETUP = { name: 'Save Test Racing', short: 'STR', primary: '#e10600', secondary: '#ffffff' };

describe('sim to next race', () => {
  it('runs qualifying, the race and the payout in one action', () => {
    const store = createGameStore(memoryStorage(), 'sim-test');
    store.getState().newGame(SETUP, { seed: 7 });
    const before = store.getState().game!.leagues[store.getState().game!.teams[store.getState().game!.playerTeamId].tier].results.length;

    expect(store.getState().simNextRace().ok).toBe(true);

    const s = store.getState();
    expect(s.race).toBeNull();
    expect(s.weekend).toBeNull();
    expect(s.lastRace?.round).toBe(before + 1);
    const g = s.game!;
    expect(g.leagues[g.teams[g.playerTeamId].tier].results.length).toBe(before + 1);
  });

  it('refuses while a race is running', () => {
    const store = createGameStore(memoryStorage(), 'sim-test-2');
    store.getState().newGame(SETUP, { seed: 7 });
    expect(store.getState().prepareRace().ok).toBe(true);
    expect(store.getState().startRace().ok).toBe(true);
    expect(store.getState().simNextRace().ok).toBe(false);
  });
});

describe('save backup', () => {
  it('exports a save and imports it back into a fresh store', () => {
    const a = createGameStore(memoryStorage(), 'exp-a');
    a.getState().newGame(SETUP, { seed: 11 });
    a.getState().simNextRace();
    const text = a.getState().exportSave();

    const b = createGameStore(memoryStorage(), 'exp-b');
    expect(b.getState().game).toBeNull();
    expect(b.getState().importSave(text).ok).toBe(true);
    expect(b.getState().game!.season).toBe(a.getState().game!.season);
    expect(b.getState().lastRace?.round).toBe(a.getState().lastRace?.round);
    expect(b.getState().game!.teams[b.getState().game!.playerTeamId].name).toBe(SETUP.name);
  });

  it('refuses files that are not saves and keeps the current game', () => {
    const store = createGameStore(memoryStorage(), 'bad-file');
    store.getState().newGame(SETUP, { seed: 3 });
    const kept = store.getState().game;

    expect(store.getState().importSave('not json').ok).toBe(false);
    expect(store.getState().importSave('{"hello":1}').ok).toBe(false);
    expect(store.getState().importSave(JSON.stringify({ version: 99, state: { game: {} } })).ok).toBe(false);
    expect(store.getState().game).toBe(kept);
  });
});
