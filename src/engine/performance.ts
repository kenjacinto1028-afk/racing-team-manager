// Lap-time model shared by qualifying and the race.
import { clamp, createRng, hashSeed, type Rng } from './rng';
import type { CarStats, Compound, DriverMode, Track } from './types';

export interface Competitor {
  driverId: string;
  teamId: string;
  name: string;
  /** Driver stats */
  pace: number;
  consistency: number;
  racecraft: number;
  tyreManagement: number;
  experience: number;
  car: CarStats;
  /** Staff ratings (0 if the role is empty). */
  engineer: number;
  mechanic: number;
  pitCrew: number;
}

export const COMPOUNDS: Compound[] = ['soft', 'medium', 'hard'];

/** Seconds slower than a soft tyre when fresh. */
export const COMPOUND_OFFSET: Record<Compound, number> = { soft: 0, medium: 0.55, hard: 1.1 };
/** Wear (0-100) per lap on a medium-wear track, normal mode, average driver. */
export const COMPOUND_WEAR: Record<Compound, number> = { soft: 5.2, medium: 3.4, hard: 2.3 };

export const MODE_DELTA: Record<DriverMode, number> = { push: -0.35, normal: 0, conserve: 0.45 };
export const MODE_WEAR: Record<DriverMode, number> = { push: 1.35, normal: 1, conserve: 0.7 };

/** Car rating that matters on this track (engine for fast tracks, aero for twisty ones). */
export function carScore(car: CarStats, track: Track): number {
  const we = 0.2 + 0.6 * track.profile.power;
  const wa = 0.2 + 0.6 * track.profile.downforce;
  const wc = 0.35;
  return (car.engine * we + car.aero * wa + car.chassis * wc) / (we + wa + wc);
}

/** Lap time with no tyre, fuel, mode or random effects. Lower = faster. */
export function baseLap(c: Competitor, track: Track): number {
  return (
    track.baseLapTime -
    (carScore(c.car, track) - 50) * 0.035 -
    (c.pace - 50) * 0.028 -
    (c.engineer - 50) * 0.01
  );
}

/** Seconds lost to tyre wear. Past ~70% the tyre falls off a cliff. */
export function tyrePenalty(wear: number): number {
  return wear * 0.025 + Math.max(0, wear - 70) * 0.12 + Math.max(0, wear - 100) * 0.5;
}

export function wearPerLap(c: Competitor, compound: Compound, mode: DriverMode, track: Track): number {
  return COMPOUND_WEAR[compound] * (0.6 + 0.8 * track.profile.tyreWear) * (1.2 - c.tyreManagement / 250) * MODE_WEAR[mode];
}

/** Standard deviation of random lap-time spread: smaller for consistent drivers. */
export function lapSpread(c: Competitor): number {
  return 0.12 + (100 - c.consistency) * 0.004;
}

/** Chance per lap that a car retires (mechanical failure or crash). */
export function dnfChance(c: Competitor): { mechanical: number; crash: number } {
  const mechanical = 0.0022 * (1.7 - c.car.reliability / 100) * (1.3 - c.mechanic / 200);
  const crash = 0.0007 * (1.6 - c.consistency / 100) * (1.3 - c.experience / 250);
  return { mechanical, crash };
}

/** Time stationary in the pit box. */
export function pitStopTime(c: Competitor, rng: Rng): { time: number; slow: boolean } {
  const slow = rng.chance(0.05 * (1.4 - c.pitCrew / 100));
  const time = 2.0 + (100 - c.pitCrew) * 0.025 + Math.abs(rng.normal(0, 0.25)) + (slow ? rng.float(2, 6) : 0);
  return { time: clamp(time, 1.8, 15), slow };
}

/**
 * How well this driver and car "click" this weekend, in seconds per lap (negative = faster).
 * Same for qualifying and the race. Gives underdogs a chance on their day.
 */
export function weekendForm(seed: number, c: Competitor): number {
  const r = createRng(hashSeed(seed, 'form', c.driverId));
  return r.normal(0, 0.25 + (100 - c.consistency) * 0.003);
}
