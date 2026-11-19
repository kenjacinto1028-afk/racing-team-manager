import { generateWorld } from '../generate';
import type { GameState, RaceResult, ResultEntry, TierId } from '../types';

export const PLAYER = { name: 'Test Racing', short: 'TST', primary: '#ff0000', secondary: '#ffffff' };

/** Most tests use a career that starts in Formula Academy (tier 3), the old starting league. */
export function world(seed = 42, startTier: TierId = 3): GameState {
  return generateWorld(seed, PLAYER, { startTier });
}

/** A result where the given team order finishes 1st/2nd, 3rd/4th, ... (both cars together). */
export function fakeResult(state: GameState, tier: TierId, teamOrder: string[], round: number): RaceResult {
  const entries: ResultEntry[] = [];
  teamOrder.forEach((teamId) => {
    for (const driverId of state.teams[teamId].driverIds) {
      entries.push({
        driverId, teamId, grid: entries.length + 1, position: entries.length + 1, dnf: false,
        points: 0, laps: 30, totalTime: 3000 + entries.length, bestLap: 90, pitStops: 1,
      });
    }
  });
  return { round, trackId: state.leagues[tier].calendar[round - 1] ?? 'harbour', entries };
}
