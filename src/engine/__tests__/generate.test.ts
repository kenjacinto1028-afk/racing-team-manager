import { describe, expect, it } from 'vitest';
import { LEAGUES, TIERS } from '../../data/leagues';
import { TRACK_BY_ID } from '../../data/tracks';
import { carOverall, driverOverall } from '../generate';
import { world } from './helpers';

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

describe('generateWorld', () => {
  it('is deterministic for a seed', () => {
    expect(world(7)).toEqual(world(7));
    expect(world(7)).not.toEqual(world(8));
  });

  it('builds 3 tiers of 10 teams with 2 drivers and 5 staff each', () => {
    const s = world();
    for (const tier of TIERS) {
      const L = s.leagues[tier];
      expect(L.teamIds).toHaveLength(10);
      expect(L.calendar).toHaveLength(LEAGUES[tier].races);
      L.calendar.forEach((id) => expect(TRACK_BY_ID[id]).toBeDefined());
      for (const id of L.teamIds) {
        const t = s.teams[id];
        expect(t.tier).toBe(tier);
        expect(t.driverIds).toHaveLength(2);
        expect(Object.keys(t.staffIds)).toHaveLength(5);
        t.driverIds.forEach((d) => expect(s.drivers[d].teamId).toBe(id));
      }
    }
  });

  it('puts the player in Formula Academy with the starting budget', () => {
    const s = world();
    const p = s.teams[s.playerTeamId];
    expect(p.isPlayer).toBe(true);
    expect(p.tier).toBe(3);
    expect(p.budget).toBe(LEAGUES[3].startBudget);
    expect(Object.values(s.teams).filter((t) => t.isPlayer)).toHaveLength(1);
  });

  it('higher tiers have better cars and drivers', () => {
    const s = world();
    const tierAvg = (tier: 1 | 2 | 3) => {
      const teams = s.leagues[tier].teamIds.map((id) => s.teams[id]);
      return {
        car: avg(teams.map((t) => carOverall(t.car))),
        driver: avg(teams.flatMap((t) => t.driverIds.map((d) => driverOverall(s.drivers[d])))),
      };
    };
    const [p, c, a] = [tierAvg(1), tierAvg(2), tierAvg(3)];
    expect(p.car).toBeGreaterThan(c.car);
    expect(c.car).toBeGreaterThan(a.car);
    expect(p.driver).toBeGreaterThan(c.driver);
    expect(c.driver).toBeGreaterThan(a.driver);
  });

  it('fills the job markets with unsigned people', () => {
    const s = world();
    expect(s.driverMarket.length).toBeGreaterThan(0);
    expect(s.staffMarket.length).toBeGreaterThan(0);
    s.driverMarket.forEach((id) => expect(s.drivers[id].teamId).toBeNull());
  });

  it('gives every id once', () => {
    const s = world();
    const ids = [...Object.keys(s.teams), ...Object.keys(s.drivers), ...Object.keys(s.staff)];
    expect(new Set(ids).size).toBe(ids.length);
  });
});
