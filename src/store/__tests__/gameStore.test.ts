import { describe, expect, it } from 'vitest';
import type { StateStorage } from 'zustand/middleware';
import { createGameStore, seasonOver } from '../gameStore';

function memoryStorage(): StateStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

const SETUP = { name: 'Test Racing', short: 'TST', primary: '#e10600', secondary: '#ffffff' };

describe('game store', () => {
  it('plays a race, saves and reloads', async () => {
    const storage = memoryStorage();
    const store = createGameStore(storage, 'test');
    store.getState().newGame(SETUP, { seed: 1 });
    const g = store.getState().game!;
    expect(g.teams[g.playerTeamId].name).toBe('Test Racing');

    expect(store.getState().buyUpgrade('engine').ok).toBe(true);
    expect(store.getState().prepareRace().ok).toBe(true);
    expect(store.getState().startRace().ok).toBe(true);
    const [d1] = g.teams[g.playerTeamId].driverIds;
    store.getState().setMode(d1, 'push');
    store.getState().tick();
    store.getState().pit(d1, 'hard');
    store.getState().tick();
    expect(store.getState().race!.lap).toBe(2);
    expect(store.getState().finishRace().ok).toBe(false); // still running
    store.getState().skipRace();
    expect(store.getState().finishRace().ok).toBe(true);
    expect(store.getState().race).toBeNull();
    expect(store.getState().lastRace?.round).toBe(1);
    expect(store.getState().game!.leagues[3].results).toHaveLength(1);

    // Reload from the same storage.
    const again = createGameStore(storage, 'test');
    await again.persist.rehydrate();
    expect(again.getState().game).toEqual(store.getState().game);
  });

  it('blocks racing with one driver', () => {
    const store = createGameStore(memoryStorage(), 't2');
    store.getState().newGame(SETUP, { seed: 2 });
    const g = store.getState().game!;
    expect(store.getState().releaseDriver(g.teams[g.playerTeamId].driverIds[0]).ok).toBe(true);
    expect(store.getState().prepareRace().ok).toBe(false);
  });

  it('new game can swap in a picked driver', () => {
    const store = createGameStore(memoryStorage(), 't3');
    store.getState().newGame(SETUP, { seed: 3 });
    const pick = store.getState().game!.driverMarket[0];
    store.getState().newGame(SETUP, { seed: 3, pickDriverId: pick });
    const g = store.getState().game!;
    expect(g.teams[g.playerTeamId].driverIds).toContain(pick);
    expect(g.teams[g.playerTeamId].budget).toBe(1_500_000);
  });

  it('plays a whole season and moves to the next', () => {
    const store = createGameStore(memoryStorage(), 't4');
    store.getState().newGame(SETUP, { seed: 4 });
    expect(store.getState().endSeason().ok).toBe(false);
    for (let i = 0; i < 8; i++) {
      expect(store.getState().prepareRace().ok).toBe(true);
      store.getState().startRace();
      store.getState().skipRace();
      store.getState().finishRace();
    }
    const g = store.getState().game!;
    expect(seasonOver(g)).toBe(true);
    expect(g.leagues[1].results).toHaveLength(12);
    expect(g.leagues[2].results).toHaveLength(10);
    expect(store.getState().endSeason().ok).toBe(true);
    expect(store.getState().game!.season).toBe(2);
    expect(store.getState().lastReview?.season).toBe(1);
  });

  it('resets saves from an old version', async () => {
    const storage = memoryStorage();
    storage.setItem('old', JSON.stringify({ state: { game: { bogus: true } }, version: 0 }));
    const store = createGameStore(storage, 'old');
    await store.persist.rehydrate();
    expect(store.getState().game).toBeNull();
  });
});
