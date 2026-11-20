import { useMemo } from 'react';
import type { RaceState } from '../engine/raceSim';
import { carNumbers, distinctTeamColors } from '../engine/raceView';
import type { Team } from '../engine/types';

export interface RaceLook {
  /** Display colour per team id: clearly different for every team in the race. */
  colors: Record<string, string>;
  /** Car number per driver id. */
  numbers: Record<string, number>;
}

/** Shared team colours and car numbers for the map, timing tower and team battle. */
export function useRaceLook(race: RaceState | undefined, teams: Record<string, Team>, playerTeamId: string): RaceLook {
  const key = race ? race.cars.map((c) => c.c.driverId).join(',') : '';
  return useMemo(() => {
    if (!race) return { colors: {}, numbers: {} };
    return {
      colors: distinctTeamColors(race.cars.map((c) => c.c.teamId), teams, playerTeamId),
      numbers: carNumbers(race.cars.map((c) => c.c.driverId)),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, teams, playerTeamId]);
}
