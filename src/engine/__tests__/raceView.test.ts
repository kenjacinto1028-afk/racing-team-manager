import { describe, expect, it } from 'vitest';
import { TRACK_BY_ID } from '../../data/tracks';
import type { Competitor } from '../performance';
import { initRace, order, simulateRace } from '../raceSim';
import { carLap, carNumbers, colorDistance, distinctTeamColors, lapsDown, MIN_COLOR_DISTANCE, teamBattle, textOn } from '../raceView';
import type { Team } from '../types';
import { world } from './helpers';

function comp(id: string, teamId: string, level: number): Competitor {
  return {
    driverId: id, teamId, name: id,
    pace: level, consistency: level, racecraft: level, tyreManagement: level, experience: level,
    car: { engine: level, aero: level, chassis: level, reliability: level },
    engineer: level, mechanic: level, pitCrew: level,
  };
}
const field = Array.from({ length: 20 }, (_, i) => comp(`d${i}`, `t${Math.floor(i / 2)}`, 70 - i * 2));
const track = TRACK_BY_ID.harbour;

describe('car numbers', () => {
  it('are unique, 2-99 and stable for the same driver', () => {
    const ids = field.map((c) => c.driverId);
    const a = carNumbers(ids);
    const nums = Object.values(a);
    expect(new Set(nums).size).toBe(ids.length);
    expect(nums.every((n) => n >= 2 && n <= 99)).toBe(true);
    expect(carNumbers([...ids].reverse())).toEqual(a);
  });
});

describe('team colours', () => {
  it('gives every team in a real league a clearly different colour, and keeps the player colour', () => {
    const g = world(7);
    const league = Object.values(g.leagues).find((l) => l.teamIds.includes(g.playerTeamId))!;
    const cols = distinctTeamColors(league.teamIds, g.teams, g.playerTeamId);
    const list = league.teamIds.map((id) => cols[id]);
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      expect(colorDistance(list[i], list[j])).toBeGreaterThanOrEqual(MIN_COLOR_DISTANCE * 0.6);
    }
    expect(cols[g.playerTeamId].toLowerCase()).toBe(g.teams[g.playerTeamId].colors.primary.toLowerCase());
  });

  it('replaces look-alike colours', () => {
    const t = (id: string, primary: string, secondary = '#000000') => ({ id, colors: { primary, secondary } }) as unknown as Team;
    const teams = { a: t('a', '#ff0000'), b: t('b', '#fe0101', '#ff0505'), c: t('c', '#0000ff') };
    const cols = distinctTeamColors(['a', 'b', 'c'], teams, 'a');
    expect(cols.a).toBe('#ff0000');
    expect(colorDistance(cols.a, cols.b)).toBeGreaterThanOrEqual(MIN_COLOR_DISTANCE);
    expect(cols.c).toBe('#0000ff');
  });

  it('picks readable text', () => {
    expect(textOn('#ffffff')).toBe('#000');
    expect(textOn('#1e1e8c')).toBe('#fff');
  });
});

describe('laps and team battle', () => {
  it('everyone starts on lap 1 and lapped cars show the right lap', () => {
    const start = initRace({ field, grid: field.map((c) => c.driverId), track, seed: 3 });
    expect(Object.values(lapsDown(start)).every((d) => d === 0)).toBe(true);
    expect(carLap(start, 0)).toBe(1);
    // Push the last car a lap and a half behind.
    const ord = order(start.cars);
    const last = ord[ord.length - 1];
    const slow = { ...start, lap: 10, cars: start.cars.map((c) => c === last ? { ...c, totalTime: ord[0].totalTime + track.baseLapTime * 1.5 } : c) };
    expect(lapsDown(slow)[last.c.driverId]).toBe(1);
    expect(carLap(slow, 1)).toBe(10);
  });

  it('team battle points match the race points and rows are sorted', () => {
    const race = simulateRace({ field, grid: field.map((c) => c.driverId), track, seed: 11 });
    const rows = teamBattle(race);
    expect(rows).toHaveLength(10);
    expect(rows.reduce((s, r) => s + r.points, 0)).toBeLessThanOrEqual(101);
    for (let i = 1; i < rows.length; i++) expect(rows[i - 1].points).toBeGreaterThanOrEqual(rows[i].points);
    expect(rows.every((r) => r.cars.length === 2)).toBe(true);
  });
});
