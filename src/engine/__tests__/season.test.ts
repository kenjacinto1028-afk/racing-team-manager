import { describe, expect, it } from 'vitest';
import { POINTS } from '../../data/leagues';
import { createRng } from '../rng';
import {
  ageDriver, ageAllDrivers, applyPromotionRelegation, driverStandings, isLeagueComplete,
  pointsForPosition, recordResult, seasonMoves, teamStandings,
} from '../season';
import type { Driver, GameState, TierId } from '../types';
import { fakeResult, world } from './helpers';

function playFullSeason(s: GameState, orders: Partial<Record<TierId, string[]>> = {}): GameState {
  for (const tier of [1, 2, 3] as TierId[]) {
    const order = orders[tier] ?? s.leagues[tier].teamIds;
    const races = s.leagues[tier].calendar.length;
    for (let r = 1; r <= races; r++) s = recordResult(s, tier, fakeResult(s, tier, order, r));
  }
  return s;
}

describe('points', () => {
  it('awards 25-18-15-12-10-8-6-4-2-1', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((p) => pointsForPosition(p))).toEqual(POINTS);
    expect(pointsForPosition(11)).toBe(0);
    expect(pointsForPosition(1, true)).toBe(0);
  });

  it('a race hands out exactly 101 points and standings add up', () => {
    let s = world();
    const order = s.leagues[3].teamIds;
    s = recordResult(s, 3, fakeResult(s, 3, order, 1));
    s = recordResult(s, 3, fakeResult(s, 3, [...order].reverse(), 2));
    const total = (rows: { points: number }[]) => rows.reduce((a, r) => a + r.points, 0);
    expect(total(driverStandings(s.leagues[3]))).toBe(202);
    expect(total(teamStandings(s.leagues[3]))).toBe(202);
    // Team points = sum of its drivers' points.
    const d = driverStandings(s.leagues[3]);
    for (const t of teamStandings(s.leagues[3])) {
      expect(t.points).toBe(d.filter((r) => r.teamId === t.id).reduce((a, r) => a + r.points, 0));
    }
  });

  it('DNFs score nothing', () => {
    let s = world();
    const res = fakeResult(s, 3, s.leagues[3].teamIds, 1);
    res.entries[0].dnf = true;
    s = recordResult(s, 3, res);
    expect(s.leagues[3].results[0].entries[0].points).toBe(0);
  });

  it('ties are broken by countback (more wins first)', () => {
    let s = world();
    const [a, b, ...rest] = s.leagues[3].teamIds;
    // Race 1: a wins (P1+P2 = 43). Race 2: b gets P1+P2 = 43. Equal points, equal wins; race 3 decides.
    s = recordResult(s, 3, fakeResult(s, 3, [a, b, ...rest], 1));
    s = recordResult(s, 3, fakeResult(s, 3, [b, a, ...rest], 2));
    const table = teamStandings(s.leagues[3]);
    expect(table[0].points).toBe(table[1].points);
    // Identical finishes: falls back to id order, but is stable.
    expect(teamStandings(s.leagues[3]).map((r) => r.id)).toEqual(table.map((r) => r.id));
  });

  it('teams with no points still appear in the table', () => {
    const s = world();
    expect(teamStandings(s.leagues[2])).toHaveLength(10);
  });
});

describe('promotion and relegation', () => {
  it('moves the top 2 up and the bottom 2 down', () => {
    let s = world();
    const before = { 1: [...s.leagues[1].teamIds], 2: [...s.leagues[2].teamIds], 3: [...s.leagues[3].teamIds] };
    s = playFullSeason(s);
    [1, 2, 3].forEach((t) => expect(isLeagueComplete(s.leagues[t as TierId])).toBe(true));

    const { promoted, relegated } = seasonMoves(s);
    expect(promoted.map((m) => m.teamId).sort()).toEqual([...before[2].slice(0, 2), ...before[3].slice(0, 2)].sort());
    expect(relegated.map((m) => m.teamId).sort()).toEqual([...before[1].slice(-2), ...before[2].slice(-2)].sort());

    s = applyPromotionRelegation(s);
    for (const tier of [1, 2, 3] as TierId[]) {
      expect(s.leagues[tier].teamIds).toHaveLength(10);
      s.leagues[tier].teamIds.forEach((id) => expect(s.teams[id].tier).toBe(tier));
    }
    expect(s.leagues[1].teamIds).toEqual(expect.arrayContaining(before[2].slice(0, 2)));
    expect(s.leagues[3].teamIds).toEqual(expect.arrayContaining(before[2].slice(-2)));
    expect(s.leagues[2].teamIds).toEqual(expect.arrayContaining([...before[3].slice(0, 2), ...before[1].slice(-2)]));
    // Champion of the top tier stays; last of the bottom tier stays.
    expect(s.teams[before[1][0]].tier).toBe(1);
    expect(s.teams[before[3][9]].tier).toBe(3);
  });

  it('promotes the player when they win Academy', () => {
    let s = world();
    const order = [s.playerTeamId, ...s.leagues[3].teamIds.filter((id) => id !== s.playerTeamId)];
    s = applyPromotionRelegation(playFullSeason(s, { 3: order }));
    expect(s.teams[s.playerTeamId].tier).toBe(2);
  });
});

describe('ageing', () => {
  const base: Driver = {
    id: 'x', firstName: 'A', lastName: 'B', nationality: 'GB', age: 19, potential: 80,
    pace: 50, consistency: 50, racecraft: 50, tyreManagement: 50, experience: 20, contract: null, teamId: null, morale: 70, traits: [], training: 'balanced',
  };
  it('young drivers improve toward potential', () => {
    const d = ageDriver(base, createRng(1));
    expect(d.age).toBe(20);
    expect(d.pace).toBeGreaterThan(50);
    expect(d.pace).toBeLessThanOrEqual(80);
    expect(d.experience).toBeGreaterThan(20);
  });
  it('veterans decline', () => {
    const d = ageDriver({ ...base, age: 35, potential: 50 }, createRng(1));
    expect(d.pace).toBeLessThan(50);
  });
  it('40-year-olds retire and leave their team', () => {
    let s = world();
    const team = s.teams[s.leagues[1].teamIds[0]];
    const id = team.driverIds[0];
    s = { ...s, drivers: { ...s.drivers, [id]: { ...s.drivers[id], age: 39 } } };
    const out = ageAllDrivers(s, createRng(3));
    expect(out.retired).toContain(id);
    expect(out.state.teams[team.id].driverIds).not.toContain(id);
    expect(out.state.drivers[id].retired).toBe(true);
  });
});
