import { describe, expect, it } from 'vitest';
import { LEAGUES } from '../../data/leagues';
import { applyRaceFinances, askingSalary, BUDGET_CAP, buyUpgrade, payDriverIncome, willingToJoin } from '../finance';
import { driverOverall } from '../generate';
import { hireDriver, negotiate, offerValue, preferredYears, releaseDriver, releaseStaff, driverOffer } from '../market';
import { completeAllLeagues, runOffseason } from '../offseason';
import { createRng } from '../rng';
import { potentialRange } from '../scouting';
import { recordResult } from '../season';
import { goalProgress, MAX_PARTNERS, settleSponsors, signSponsor, sponsorPerRace } from '../sponsors';
import type { GameState } from '../types';
import { fakeResult, world } from './helpers';

const pidOf = (s: GameState) => s.playerTeamId;

describe('sponsors', () => {
  it('new team starts with a title sponsor, 2 partners and offers for the open slot', () => {
    const s = world();
    expect(s.sponsors.active.filter((d) => d.kind === 'title')).toHaveLength(1);
    expect(s.sponsors.active.filter((d) => d.kind === 'partner')).toHaveLength(2);
    expect(s.sponsors.offers.length).toBeGreaterThan(0);
    expect(s.sponsors.offers.every((o) => o.kind === 'partner')).toBe(true);
    // Roughly what a mid-table team got in v1.
    const total = sponsorPerRace(s);
    expect(total).toBeGreaterThan(LEAGUES[3].sponsorPerRace * 0.6);
    expect(total).toBeLessThan(LEAGUES[3].sponsorPerRace * 1.2);
  });

  it('signing fills a slot and withdraws the rest when full', () => {
    const s = world();
    const r = signSponsor(s, s.sponsors.offers[0].id);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.sponsors.active.filter((d) => d.kind === 'partner')).toHaveLength(MAX_PARTNERS);
    expect(r.state.sponsors.offers).toHaveLength(0);
    expect(signSponsor(r.state, s.sponsors.offers[1].id).ok).toBe(false);
  });

  it('goal bonus is paid only when the goal is met', () => {
    let s = world();
    const pid = pidOf(s);
    const order = [pid, ...s.leagues[3].teamIds.filter((id) => id !== pid)];
    for (let r = 1; r <= LEAGUES[3].races; r++) s = recordResult(s, 3, fakeResult(s, 3, order, r));
    // Player won every race: every goal type is met.
    s = { ...s, sponsors: { ...s.sponsors, active: [
      { id: 'a', name: 'A', kind: 'title', perRace: 1, goal: { kind: 'wins', target: 2 }, bonus: 50_000, seasons: 2 },
      { id: 'b', name: 'B', kind: 'partner', perRace: 1, goal: { kind: 'teamPos', target: 1 }, bonus: 10_000, seasons: 1 },
    ] } };
    expect(goalProgress(s, { kind: 'wins', target: 2 }).met).toBe(true);
    const out = settleSponsors(s, createRng(1));
    expect(out.state.teams[pid].budget).toBe(s.teams[pid].budget + 60_000);
    expect(out.results.every((r) => r.met)).toBe(true);
    // A deal that ran out leaves; a met multi-season deal stays.
    expect(out.state.sponsors.active.map((d) => d.name)).toEqual(['A']);
  });

  it('player race income uses the deals; offers refresh at season end', () => {
    const s = world();
    const next = runOffseason(s).state;
    expect(next.sponsors.offers.length + next.sponsors.active.length).toBeGreaterThan(0);
  });
});

describe('pay drivers', () => {
  it('ask for a negative salary, bring money each race, no signing fee', () => {
    let s = world(4);
    // Make a market driver a pay driver.
    const id = s.driverMarket.find((x) => willingToJoin(driverOverall(s.drivers[x]), 3))!;
    s = { ...s, drivers: { ...s.drivers, [id]: { ...s.drivers[id], payBudget: 20_000 } } };
    expect(askingSalary(s.drivers[id], 3, driverOverall(s.drivers[id]))).toBe(-20_000);
    const pid = pidOf(s);
    s = releaseDriver(s, pid, s.teams[pid].driverIds[0]).ok ? (releaseDriver(s, pid, s.teams[pid].driverIds[0]) as { state: GameState }).state : s;
    const before = s.teams[pid].budget;
    const r = hireDriver(s, pid, id, 1, false, undefined);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.teams[pid].budget).toBe(before);
    expect(payDriverIncome(r.state, pid)).toBe(20_000);
    expect(negotiate(r.state, pid, id, { salary: 0, years: 1, winBonus: 0, podiumBonus: 0 }).kind).toBe('refuse');
  });

  it('some lower-league market drivers are pay drivers', () => {
    let count = 0;
    for (let seed = 1; seed <= 5; seed++) {
      const s = world(seed);
      count += s.driverMarket.filter((id) => s.drivers[id].payBudget).length;
    }
    expect(count).toBeGreaterThan(0);
  });
});

describe('contract talks', () => {
  const setup = () => {
    const s = world(6);
    const id = s.driverMarket.find((x) => !s.drivers[x].payBudget && driverOffer(s, s.playerTeamId, x).salary > 0)!;
    return { s, id, ask: driverOffer(s, s.playerTeamId, id).salary, years: preferredYears(s.drivers[id].age) };
  };

  it('accepts the asking salary at the preferred length', () => {
    const { s, id, ask, years } = setup();
    expect(negotiate(s, s.playerTeamId, id, { salary: ask, years, winBonus: 0, podiumBonus: 0 }).kind).toBe('accept');
  });

  it('counters a slightly low offer and accepts the counter', () => {
    const { s, id, ask, years } = setup();
    const reply = negotiate(s, s.playerTeamId, id, { salary: Math.round(ask * 0.88), years, winBonus: 0, podiumBonus: 0 });
    expect(reply.kind).toBe('counter');
    if (reply.kind !== 'counter') return;
    expect(negotiate(s, s.playerTeamId, id, reply.offer).kind).toBe('accept');
  });

  it('refuses a lowball offer', () => {
    const { s, id, ask, years } = setup();
    expect(negotiate(s, s.playerTeamId, id, { salary: Math.round(ask * 0.5), years, winBonus: 0, podiumBonus: 0 }).kind).toBe('refuse');
  });

  it('bonuses add value, so a lower salary can work', () => {
    const { s, id, ask, years } = setup();
    const plain = offerValue(s, s.playerTeamId, id, { salary: Math.round(ask * 0.9), years, winBonus: 0, podiumBonus: 0 });
    const withBonus = offerValue(s, s.playerTeamId, id, { salary: Math.round(ask * 0.9), years, winBonus: ask, podiumBonus: ask / 2 });
    expect(withBonus).toBeGreaterThan(plain);
  });

  it('win and podium bonuses are paid after the race', () => {
    let s = world(8);
    const pid = pidOf(s);
    const [d1] = s.teams[pid].driverIds;
    s = { ...s, drivers: { ...s.drivers, [d1]: { ...s.drivers[d1], contract: { ...s.drivers[d1].contract!, winBonus: 5000, podiumBonus: 1000 } } } };
    const order = [pid, ...s.leagues[3].teamIds.filter((x) => x !== pid)];
    const a = applyRaceFinances(recordResult(s, 3, fakeResult(s, 3, order, 1)), 3);
    const b = applyRaceFinances(recordResult({ ...s, drivers: { ...s.drivers, [d1]: { ...s.drivers[d1], contract: { ...s.drivers[d1].contract!, winBonus: 0, podiumBonus: 0 } } } }, 3, fakeResult(s, 3, order, 1)), 3);
    expect(b.teams[pid].budget - a.teams[pid].budget).toBe(6000);
  });
});

describe('firing and morale', () => {
  it('firing a driver or staff member costs a settlement and morale', () => {
    const s = world();
    const pid = pidOf(s);
    const r = releaseDriver(s, pid, s.teams[pid].driverIds[0]);
    expect(r.ok && r.state.teams[pid].morale).toBe(62);
    const sid = s.teams[pid].staffIds.raceEngineer!;
    const r2 = releaseStaff(s, pid, sid);
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    expect(r2.cost).toBeGreaterThan(0);
    expect(r2.state.teams[pid].staffIds.raceEngineer).toBeUndefined();
    expect(r2.state.staffMarket).toContain(sid);
    expect(r2.state.teams[pid].morale).toBe(66);
  });
});

describe('scouting', () => {
  it('no scout: a range; great scout: exact', () => {
    let s = world();
    const pid = pidOf(s);
    const d = s.drivers[s.driverMarket[0]];
    const scout = s.teams[pid].staffIds.scout!;
    s = { ...s, staff: { ...s.staff, [scout]: { ...s.staff[scout], rating: 10 } } };
    const r = potentialRange(s, d);
    expect(r.exact).toBe(false);
    expect(r.lo).toBeLessThanOrEqual(d.potential);
    expect(r.hi).toBeGreaterThanOrEqual(d.potential);
    expect(r.hi - r.lo).toBeGreaterThan(10);
    s = { ...s, staff: { ...s.staff, [scout]: { ...s.staff[scout], rating: 90 } } };
    expect(potentialRange(s, d)).toEqual({ lo: d.potential, hi: d.potential, exact: true });
  });
});

describe('budget cap', () => {
  it('blocks Prime spending over the cap only when switched on', () => {
    let s = world();
    const pid = pidOf(s);
    s = { ...s, teams: { ...s.teams, [pid]: { ...s.teams[pid], tier: 1, budget: 1e9, spend: BUDGET_CAP - 1000 } } };
    expect(buyUpgrade(s, pid, 'engine').ok).toBe(true);
    s = { ...s, settings: { budgetCap: true } };
    expect(buyUpgrade(s, pid, 'engine').ok).toBe(false);
  });

  it('AI Prime teams stay under the cap', () => {
    const s = { ...completeAllLeagues(world(2)), settings: { budgetCap: true } };
    const next = runOffseason(s).state;
    for (const id of next.leagues[1].teamIds) expect(next.teams[id].spend).toBeLessThanOrEqual(BUDGET_CAP);
  });
});
