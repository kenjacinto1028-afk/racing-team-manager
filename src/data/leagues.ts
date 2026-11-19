import type { TierId } from '../engine/types';

export const TIERS: TierId[] = [1, 2, 3];
export const STARTING_TIER: TierId = 3;
export const TEAMS_PER_TIER = 10;
export const DRIVERS_PER_TEAM = 2;
/** Teams promoted from / relegated to each tier at season end. */
export const MOVE_SPOTS = 2;
/** Points for P1..P10. */
export const POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

export interface LeagueDef {
  tier: TierId;
  name: string;
  short: string;
  races: number;
  /** Starting budget for a team new to the game in this tier. */
  startBudget: number;
  /** Sponsor money per race for a mid-table team. */
  sponsorPerRace: number;
  /** Extra money per championship point scored in a race. */
  pointBonus: number;
  /** Season-end prize money by final team position (P1..P10). */
  prizeMoney: number[];
  driverSalary: [number, number];
  staffSalary: [number, number];
  /** Typical car rating range for this tier. */
  carRange: [number, number];
  /** Typical driver overall range for this tier. */
  driverRange: [number, number];
  staffRange: [number, number];
  /** Price of the first upgrade of a car stat; later ones cost more. */
  upgradeBaseCost: number;
}

export const LEAGUES: Record<TierId, LeagueDef> = {
  1: {
    tier: 1, name: 'Formula Prime', short: 'FP', races: 12,
    startBudget: 12_000_000, sponsorPerRace: 1_000_000, pointBonus: 12_000,
    prizeMoney: [6e6, 4.8e6, 4e6, 3.4e6, 2.9e6, 2.5e6, 2.1e6, 1.8e6, 1.5e6, 1.2e6],
    driverSalary: [120_000, 500_000], staffSalary: [40_000, 150_000],
    carRange: [66, 90], driverRange: [64, 92], staffRange: [60, 92],
    upgradeBaseCost: 1_200_000,
  },
  2: {
    tier: 2, name: 'Formula Challenger', short: 'FC', races: 10,
    startBudget: 4_000_000, sponsorPerRace: 350_000, pointBonus: 4_000,
    prizeMoney: [2e6, 1.6e6, 1.3e6, 1.1e6, 950e3, 800e3, 700e3, 600e3, 500e3, 400e3],
    driverSalary: [35_000, 140_000], staffSalary: [14_000, 50_000],
    carRange: [48, 72], driverRange: [50, 78], staffRange: [45, 78],
    upgradeBaseCost: 400_000,
  },
  3: {
    tier: 3, name: 'Formula Academy', short: 'FA', races: 8,
    startBudget: 1_500_000, sponsorPerRace: 120_000, pointBonus: 1_500,
    prizeMoney: [700e3, 560e3, 460e3, 390e3, 330e3, 280e3, 240e3, 200e3, 170e3, 140e3],
    driverSalary: [10_000, 45_000], staffSalary: [5_000, 18_000],
    carRange: [30, 56], driverRange: [34, 64], staffRange: [30, 62],
    upgradeBaseCost: 150_000,
  },
};
