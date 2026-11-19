import { useGame } from '../store/gameStore';
import type { GameState, Team, TierId } from '../engine/types';
import { LEAGUES } from '../data/leagues';

/** The current game. Only call inside screens rendered when a game exists. */
export function useGameState(): GameState {
  const g = useGame((s) => s.game);
  if (!g) throw new Error('No game loaded');
  return g;
}

export function usePlayer(): { g: GameState; team: Team; tier: TierId; league: (typeof LEAGUES)[TierId] } {
  const g = useGameState();
  const team = g.teams[g.playerTeamId];
  return { g, team, tier: team.tier, league: LEAGUES[team.tier] };
}
