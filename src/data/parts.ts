import type { CarStat } from '../engine/types';

// Car parts catalogue. Every slot starts with the "standard" part (no effect).
// `effects` are added to the car's ratings while the part is fitted.
// `cost` is a multiple of the league's base upgrade price; `races` is how long the design takes.

export type PartSlot = 'engine' | 'gearbox' | 'frontWing' | 'rearWing' | 'floor' | 'suspension' | 'brakes';

export interface PartDef {
  id: string;
  slot: PartSlot;
  name: string;
  blurb: string;
  effects: Partial<Record<CarStat, number>>;
  cost: number;
  races: number;
}

export const PART_SLOTS: { slot: PartSlot; label: string; blurb: string }[] = [
  { slot: 'engine', label: 'Engine', blurb: 'Power unit. Speed on straights.' },
  { slot: 'gearbox', label: 'Gearbox', blurb: 'Gear changes. Small speed gains, can be fragile.' },
  { slot: 'frontWing', label: 'Front wing', blurb: 'Turns the car into corners.' },
  { slot: 'rearWing', label: 'Rear wing', blurb: 'The big trade-off: grip in corners vs drag on straights.' },
  { slot: 'floor', label: 'Floor', blurb: 'Sucks the car to the road. Lots of hidden grip.' },
  { slot: 'suspension', label: 'Suspension', blurb: 'How the car rides bumps and kerbs.' },
  { slot: 'brakes', label: 'Brakes', blurb: 'Stopping power and how well they cope with heat.' },
];

export const PARTS: PartDef[] = [
  { id: 'engine-std', slot: 'engine', name: 'Standard engine', blurb: 'Reliable baseline.', effects: {}, cost: 0, races: 0 },
  { id: 'engine-highrev', slot: 'engine', name: 'High-revving engine', blurb: 'More power, more stress.', effects: { engine: 4, reliability: -3 }, cost: 1.2, races: 3 },
  { id: 'engine-endurance', slot: 'engine', name: 'Endurance engine', blurb: 'Built to last.', effects: { engine: -1, reliability: 4 }, cost: 0.8, races: 2 },

  { id: 'gearbox-std', slot: 'gearbox', name: 'Standard gearbox', blurb: 'Baseline.', effects: {}, cost: 0, races: 0 },
  { id: 'gearbox-light', slot: 'gearbox', name: 'Lightweight gearbox', blurb: 'Lighter and quicker, but fragile.', effects: { engine: 2, chassis: 1, reliability: -3 }, cost: 0.8, races: 2 },
  { id: 'gearbox-seamless', slot: 'gearbox', name: 'Seamless-shift gearbox', blurb: 'No time lost between gears. Expensive.', effects: { engine: 2 }, cost: 1.4, races: 4 },

  { id: 'frontWing-std', slot: 'frontWing', name: 'Standard front wing', blurb: 'Baseline.', effects: {}, cost: 0, races: 0 },
  { id: 'frontWing-outwash', slot: 'frontWing', name: 'Outwash front wing', blurb: 'Pushes air around the tyres for more grip, a bit twitchy.', effects: { aero: 3, chassis: -1 }, cost: 0.9, races: 2 },
  { id: 'frontWing-simple', slot: 'frontWing', name: 'Simple front wing', blurb: 'Predictable and easy to set up.', effects: { aero: 1, chassis: 1 }, cost: 0.5, races: 1 },

  { id: 'rearWing-std', slot: 'rearWing', name: 'Standard rear wing', blurb: 'Baseline.', effects: {}, cost: 0, races: 0 },
  { id: 'rearWing-lowdrag', slot: 'rearWing', name: 'Low-drag rear wing', blurb: 'Fast on straights, slides in corners.', effects: { engine: 3, aero: -3 }, cost: 0.7, races: 2 },
  { id: 'rearWing-highdf', slot: 'rearWing', name: 'High-downforce rear wing', blurb: 'Glued in corners, slower on straights.', effects: { aero: 3, engine: -2 }, cost: 0.7, races: 2 },

  { id: 'floor-std', slot: 'floor', name: 'Standard floor', blurb: 'Baseline.', effects: {}, cost: 0, races: 0 },
  { id: 'floor-groundeffect', slot: 'floor', name: 'Ground-effect floor', blurb: 'Big grip from air under the car. Costly and slow to design.', effects: { aero: 4, chassis: 1 }, cost: 1.6, races: 4 },
  { id: 'floor-stiff', slot: 'floor', name: 'Stiff floor', blurb: 'Stable platform, harsh on parts.', effects: { chassis: 2, reliability: -1 }, cost: 0.6, races: 2 },

  { id: 'suspension-std', slot: 'suspension', name: 'Standard suspension', blurb: 'Baseline.', effects: {}, cost: 0, races: 0 },
  { id: 'suspension-stiff', slot: 'suspension', name: 'Stiff suspension', blurb: 'Sharp handling, rattles the car.', effects: { chassis: 3, reliability: -1 }, cost: 0.8, races: 2 },
  { id: 'suspension-compliant', slot: 'suspension', name: 'Compliant suspension', blurb: 'Soaks up kerbs, kind to the car.', effects: { chassis: 1, reliability: 2 }, cost: 0.6, races: 2 },

  { id: 'brakes-std', slot: 'brakes', name: 'Standard brakes', blurb: 'Baseline.', effects: {}, cost: 0, races: 0 },
  { id: 'brakes-carbon', slot: 'brakes', name: 'Carbon brakes', blurb: 'Brake later into corners; wear faster.', effects: { chassis: 2, reliability: -1 }, cost: 0.7, races: 2 },
  { id: 'brakes-cooled', slot: 'brakes', name: 'Cooled brakes', blurb: 'Never overheat.', effects: { reliability: 2 }, cost: 0.5, races: 1 },
];

export const PART_BY_ID: Record<string, PartDef> = Object.fromEntries(PARTS.map((p) => [p.id, p]));

export const STANDARD_PARTS: Record<PartSlot, string> = {
  engine: 'engine-std', gearbox: 'gearbox-std', frontWing: 'frontWing-std', rearWing: 'rearWing-std',
  floor: 'floor-std', suspension: 'suspension-std', brakes: 'brakes-std',
};
