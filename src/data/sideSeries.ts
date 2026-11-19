// Side championships for the lower leagues (Academy, Regional, Rookie). Money values are
// multiples of the team's league "sponsorPerRace", so they scale with the league.

import type { SideSeriesId } from '../engine/types';

export type SideId = SideSeriesId;

export interface SideDef {
  id: SideId;
  name: string;
  icon: string;
  blurb: string;
  /** When it runs, in plain words. */
  when: string;
  races: number;
  /** Race length versus a normal race. */
  lapsMult: number;
  /** Crash risk versus a normal race. */
  crashMult: number;
  /** Both drivers share one car (endurance), or both race their own car. */
  shared: boolean;
  /** Entry fee (x sponsorPerRace). */
  fee: number;
  /** Running costs per race: salaries, travel, parts (x sponsorPerRace). */
  running: number;
  /** Prize per race by your best car's finishing position, P1..P10 (x sponsorPerRace). */
  prize: number[];
  /** Engine and gearbox wear per race versus a league race (Winter Series uses a spare car). */
  wearMult: number;
  /** Rating points of experience each of your drivers gains per race. */
  experience: number;
}

export const SIDE_SERIES: SideDef[] = [
  {
    id: 'endurance', name: 'Endurance Cup', icon: '⏳',
    blurb: 'Three long races, twice the normal distance. Your two drivers share one car and take turns at the wheel.',
    when: 'During the season: after about 1/3, 2/3 and the end of your calendar',
    races: 3, lapsMult: 2, crashMult: 1, shared: true,
    fee: 1.5, running: 0.3, prize: [1.4, 1.05, 0.8, 0.6, 0.45, 0.35, 0.28, 0.22, 0.16, 0.12],
    wearMult: 1.2, experience: 1,
  },
  {
    id: 'street', name: 'Street Invitational', icon: '🏙',
    blurb: 'A one-off race through city streets. Big prize money, but walls everywhere: crashes are far more likely.',
    when: 'Mid-season, after the halfway round',
    races: 1, lapsMult: 1, crashMult: 1.8, shared: false,
    fee: 1, running: 0.3, prize: [4, 2.6, 1.8, 1.3, 1, 0.8, 0.6, 0.45, 0.3, 0.2],
    wearMult: 1, experience: 1,
  },
  {
    id: 'winter', name: 'Winter Series', icon: '❄',
    blurb: 'Four short races in the off-season with a spare car. Small prizes, but young drivers (22 and under) get valuable mileage.',
    when: 'After your last race, before the season review',
    races: 4, lapsMult: 0.6, crashMult: 1, shared: false,
    fee: 1.2, running: 0.15, prize: [0.8, 0.6, 0.45, 0.35, 0.3, 0.25, 0.2, 0.15, 0.1, 0.08],
    wearMult: 0, experience: 1,
  },
];

export const SIDE_BY_ID: Record<SideId, SideDef> = Object.fromEntries(SIDE_SERIES.map((d) => [d.id, d])) as Record<SideId, SideDef>;
