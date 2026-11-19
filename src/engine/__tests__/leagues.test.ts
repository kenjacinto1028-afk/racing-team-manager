import { describe, expect, it } from 'vitest';
import { LEAGUES, STARTING_TIER, TIERS } from '../../data/leagues';
import { SIDE_BY_ID } from '../../data/sideSeries';
import { TRACK_BY_ID } from '../../data/tracks';
import { STREET_TRACKS } from '../../data/traits';
import { driverOverall, generateWorld } from '../generate';
import { completeAllLeagues, runOffseason } from '../offseason';
import { autoRaceNext } from '../raceSetup';
import { canEnter, enterSide, runDueSideRaces, runSideRace, sideFee, sideRounds, sideStandings } from '../sideSeries';
import type { GameState } from '../types';
import { PLAYER, world } from './helpers';

/** Play the player's own league up to `round` (AI drives the player's cars too). */
function playTo(s: GameState, round: number): GameState {
  const tier = s.teams[s.playerTeamId].tier;
  while (s.leagues[tier].results.length < round) s = runDueSideRaces(autoRaceNext(s, tier)).state;
  return s;
}

describe('5-tier ladder', () => {
  it('new careers start in Formula Rookie with 5 leagues of 10 teams', () => {
    const g = generateWorld(1, PLAYER);
    expect(STARTING_TIER).toBe(5);
    expect(g.teams[g.playerTeamId].tier).toBe(5);
    expect(g.teams[g.playerTeamId].budget).toBe(LEAGUES[5].startBudget);
    for (const t of TIERS) {
      expect(g.leagues[t].teamIds).toHaveLength(10);
      expect(g.leagues[t].calendar).toHaveLength(LEAGUES[t].races);
    }
    expect(new Set(Object.values(g.teams).map((t) => t.name)).size).toBe(50);
  });

  it('lower leagues are slower, cheaper and younger', () => {
    const g = generateWorld(2, PLAYER);
    const avg = (t: 1 | 2 | 3 | 4 | 5, f: (id: string) => number) => { const ids = g.leagues[t].teamIds.flatMap((id) => g.teams[id].driverIds); return ids.reduce((a, id) => a + f(id), 0) / ids.length; };
    const ovr = (id: string) => driverOverall(g.drivers[id]);
    const age = (id: string) => g.drivers[id].age;
    expect(avg(5, ovr)).toBeLessThan(avg(4, ovr));
    expect(avg(4, ovr)).toBeLessThan(avg(3, ovr));
    expect(avg(5, age)).toBeLessThan(avg(3, age));
    expect(LEAGUES[5].startBudget).toBeLessThan(LEAGUES[4].startBudget);
  });

  it('teams move between all five leagues at season end', () => {
    const { state, review } = runOffseason(completeAllLeagues(generateWorld(3, PLAYER)));
    expect(review.promoted.map((m) => m.from).sort()).toEqual([2, 2, 3, 3, 4, 4, 5, 5]);
    expect(review.relegated.map((m) => m.to).sort()).toEqual([2, 2, 3, 3, 4, 4, 5, 5]);
    for (const t of TIERS) expect(state.leagues[t].teamIds).toHaveLength(10);
  });
});

describe('side championships', () => {
  it('entering costs the fee and closes after the first race', () => {
    const s0 = generateWorld(4, PLAYER);
    const pid = s0.playerTeamId;
    const r = enterSide(s0, 'endurance');
    if (!r.ok) throw new Error(r.reason);
    expect(r.state.teams[pid].budget).toBe(s0.teams[pid].budget - sideFee(s0, 'endurance'));
    expect(canEnter(r.state, 'endurance').ok).toBe(false);
    const later = playTo(s0, sideRounds(s0, 'street')[0]);
    expect(canEnter(later, 'street').ok).toBe(false);
  });

  it('is closed to Challenger and Prime teams', () => {
    const s = world(5, 2);
    expect(canEnter(s, 'street').ok).toBe(false);
  });

  it('endurance races run on schedule with one shared car per team', () => {
    let s = generateWorld(6, PLAYER);
    const e = enterSide(s, 'endurance');
    if (!e.ok) throw new Error(e.reason);
    s = playTo(e.state, LEAGUES[5].races);
    const res = s.side.results.endurance!;
    expect(res).toHaveLength(3);
    for (const r of res) {
      expect(r.entries).toHaveLength(12);
      expect(new Set(r.entries.map((x) => x.teamId)).size).toBe(12);
      expect(r.entries.filter((x) => !x.dnf)[0].laps).toBeGreaterThan(TRACK_BY_ID[r.trackId].laps * 1.5);
    }
    expect(sideStandings(res)[0].points).toBeGreaterThan(0);
    expect(s.finance.ledger.some((l) => l.label.startsWith('Endurance Cup race 1'))).toBe(true);
  });

  it('the street race is on a street circuit with more crashes', () => {
    const s = generateWorld(7, PLAYER);
    let street = 0; let normal = 0;
    for (let season = 1; season <= 30; season++) {
      const g = { ...s, season };
      const r = runSideRace(g, 'street', 1);
      expect(STREET_TRACKS).toContain(r.trackId);
      street += r.entries.filter((x) => x.dnf).length;
      normal += runSideRace(g, 'winter', 1).entries.filter((x) => x.dnf).length;
    }
    expect(SIDE_BY_ID.street.crashMult).toBeGreaterThan(1);
    expect(street).toBeGreaterThan(normal * 0.9);
  });

  it('winter series runs at season end and gives young drivers mileage', () => {
    let s = completeAllLeagues(generateWorld(8, PLAYER));
    const e = enterSide(s, 'winter');
    if (!e.ok) throw new Error(e.reason);
    s = e.state;
    const pid = s.playerTeamId;
    const young = s.teams[pid].driverIds.filter((id) => s.drivers[id].age <= 22);
    const before = Object.fromEntries(young.map((id) => [id, s.drivers[id].experience]));
    const { state, review } = runOffseason(s);
    expect(review.sideNews).toHaveLength(4);
    expect(state.side.season).toBe(2);
    expect(state.side.last?.results.winter).toHaveLength(4);
    for (const id of young) expect(state.drivers[id].experience).toBeGreaterThanOrEqual(Math.min(99, before[id]));
  });
});
