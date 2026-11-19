import { describe, expect, it } from 'vitest';
import { TIERS } from '../../data/leagues';
import { calendarWeeks } from '../generate';
import { addToHistory, driverCareer, staffCareer } from '../history';
import { completeAllLeagues, runOffseason } from '../offseason';
import { driverStandings, teamStandings } from '../season';
import { world } from './helpers';

describe('calendar weeks', () => {
  it('spreads races evenly from week 10 to week 46, in order', () => {
    for (const n of [6, 7, 8, 10, 12]) {
      const w = calendarWeeks(n);
      expect(w).toHaveLength(n);
      expect(w[0]).toBe(10);
      expect(w[n - 1]).toBe(46);
      for (let i = 1; i < n; i++) expect(w[i]).toBeGreaterThan(w[i - 1]);
    }
  });

  it('every league has one week per race, new game and new season', () => {
    const g = world(5);
    for (const t of TIERS) expect(g.leagues[t].weeks).toHaveLength(g.leagues[t].calendar.length);
    const next = runOffseason(g).state;
    for (const t of TIERS) expect(next.leagues[t].weeks).toHaveLength(next.leagues[t].calendar.length);
  });
});

describe('season history', () => {
  it('new games start with empty history', () => {
    expect(world(1).history).toEqual([]);
  });

  it('archives final tables, champions and season lines at season end', () => {
    const g = world(7);
    const done = completeAllLeagues(g);
    const { state } = runOffseason(g);
    expect(state.history).toHaveLength(1);
    const h = state.history[0];
    expect(h.season).toBe(1);
    expect(h.year).toBe(g.year);
    for (const t of TIERS) {
      const table = teamStandings(done.leagues[t]);
      expect(h.tables[t].map((r) => r.teamId)).toEqual(table.map((r) => r.id));
      expect(h.tables[t][0].points).toBe(table[0].points);
      expect(h.champions[t]).toBe(driverStandings(done.leagues[t])[0].id);
    }
    // Player line matches their final position.
    const pTier = g.teams[g.playerTeamId].tier;
    expect(h.playerTier).toBe(pTier);
    expect(h.tables[pTier][h.playerPos - 1].teamId).toBe(g.playerTeamId);
    // Every racing driver gets a line; wins add up to the number of races.
    for (const t of TIERS) {
      const lines = h.drivers.filter((d) => d.tier === t);
      expect(lines.length).toBeGreaterThanOrEqual(20);
      expect(lines.reduce((a, d) => a + d.wins, 0)).toBe(done.leagues[t].results.length);
    }
    // 10 teams x 3 tiers x 4 roles.
    expect(h.staff).toHaveLength(120);
  });

  it('keeps growing across seasons and career helpers read it', () => {
    let s = world(9);
    for (let i = 0; i < 3; i++) s = runOffseason(s).state;
    expect(s.history.map((h) => h.season)).toEqual([1, 2, 3]);
    const champ = s.history[0].champions[1]!;
    expect(driverCareer(s, champ)[0]).toMatchObject({ season: 1, pos: 1, tier: 1 });
    const someStaff = s.history[0].staff[0].staffId;
    expect(staffCareer(s, someStaff).length).toBeGreaterThanOrEqual(1);
    // Compact: three seasons stay well under 100 KB.
    expect(JSON.stringify(s.history).length).toBeLessThan(100_000);
  });

  it('does not archive the same season twice', () => {
    const g = completeAllLeagues(world(3));
    expect(addToHistory(addToHistory(g)).history).toHaveLength(1);
  });
});
