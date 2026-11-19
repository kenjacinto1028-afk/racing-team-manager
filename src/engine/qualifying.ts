import { createRng, hashSeed } from './rng';
import { baseLap, COMPOUND_OFFSET, lapSpread, weekendForm, type Competitor } from './performance';
import type { Track } from './types';

export interface QualiEntry {
  driverId: string;
  teamId: string;
  time: number;
  /** 1-based grid slot. */
  position: number;
}

/** One flying lap per driver on fresh soft tyres. Sorted fastest first. */
export function runQualifying(field: Competitor[], track: Track, seed: number): QualiEntry[] {
  const rng = createRng(hashSeed(seed, 'quali', track.id));
  const laps = field.map((c) => {
    let t = baseLap(c, track) + weekendForm(seed, c) + COMPOUND_OFFSET.soft + (c.qualiDelta ?? 0) + rng.normal(0, lapSpread(c) * 0.8);
    if (rng.chance(0.03 * (1.5 - c.consistency / 100))) t += rng.float(0.5, 2); // scrappy lap
    return { driverId: c.driverId, teamId: c.teamId, time: Math.round(t * 1000) / 1000 };
  });
  laps.sort((a, b) => a.time - b.time || (a.driverId < b.driverId ? -1 : 1));
  return laps.map((l, i) => ({ ...l, position: i + 1 }));
}
