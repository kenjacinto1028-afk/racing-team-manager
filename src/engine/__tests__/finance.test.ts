import { describe, expect, it } from 'vitest';
import { LEAGUES } from '../../data/leagues';
import {
  applyPrizeMoney, applyRaceFinances, buyUpgrade, raceSalaries, sponsorIncome, upgradeCost, upgradeGain,
} from '../finance';
import { recordResult, teamStandings } from '../season';
import type { GameState } from '../types';
import { fakeResult, world } from './helpers';

function raceOnce(s: GameState, order: string[], round: number): GameState {
  return applyRaceFinances(recordResult(s, 3, fakeResult(s, 3, order, round)), 3);
}

describe('finance', () => {
  it('sponsors pay more to leaders', () => {
    expect(sponsorIncome(3, 1)).toBeGreaterThan(sponsorIncome(3, 10));
    expect(sponsorIncome(1, 5)).toBeGreaterThan(sponsorIncome(3, 5));
  });

  it('race payout = sponsor + points bonus - salaries', () => {
    const s0 = world();
    const order = [s0.playerTeamId, ...s0.leagues[3].teamIds.filter((id) => id !== s0.playerTeamId)];
    const s1 = raceOnce(s0, order, 1);
    const expected = s0.teams[s0.playerTeamId].budget + sponsorIncome(3, 1) + 43 * LEAGUES[3].pointBonus - raceSalaries(s0, s0.playerTeamId);
    expect(s1.teams[s1.playerTeamId].budget).toBe(expected);
    const net = s1.finance.ledger.reduce((a, e) => a + e.amount, 0);
    expect(net).toBe(expected - s0.teams[s0.playerTeamId].budget);
  });

  it('bankrupt after 2 races in a row below zero', () => {
    let s = world();
    const pid = s.playerTeamId;
    const order = s.leagues[3].teamIds.filter((id) => id !== pid).concat(pid); // player last
    s = { ...s, teams: { ...s.teams, [pid]: { ...s.teams[pid], budget: -1_000_000 } } };
    s = raceOnce(s, order, 1);
    expect(s.finance.negativeStreak).toBe(1);
    expect(s.finance.bankrupt).toBe(false);
    s = raceOnce(s, order, 2);
    expect(s.finance.bankrupt).toBe(true);
  });

  it('streak resets when the balance recovers', () => {
    let s = world();
    const pid = s.playerTeamId;
    const order = s.leagues[3].teamIds;
    s = { ...s, teams: { ...s.teams, [pid]: { ...s.teams[pid], budget: -1_000 - raceSalaries(s, pid) - 500_000 } } };
    s = raceOnce(s, order, 1);
    expect(s.finance.negativeStreak).toBe(1);
    s = { ...s, teams: { ...s.teams, [pid]: { ...s.teams[pid], budget: 5_000_000 } } };
    s = raceOnce(s, order, 2);
    expect(s.finance.negativeStreak).toBe(0);
    expect(s.finance.bankrupt).toBe(false);
  });

  it('prize money pays by final position', () => {
    let s = world();
    const order = s.leagues[3].teamIds;
    s = recordResult(s, 3, fakeResult(s, 3, order, 1));
    const before = s.teams[order[0]].budget;
    const champ = teamStandings(s.leagues[3])[0].id;
    s = applyPrizeMoney(s);
    expect(champ).toBe(order[0]);
    expect(s.teams[champ].budget).toBe(before + LEAGUES[3].prizeMoney[0]);
  });

  it('upgrades cost money, raise the stat and get pricier', () => {
    const s0 = world();
    const pid = s0.playerTeamId;
    const r1 = buyUpgrade(s0, pid, 'engine');
    if (!r1.ok) throw new Error(r1.reason);
    expect(r1.state.teams[pid].car.engine).toBe(s0.teams[pid].car.engine + r1.gain);
    expect(r1.state.teams[pid].budget).toBe(s0.teams[pid].budget - r1.cost);
    const r2 = buyUpgrade(r1.state, pid, 'engine');
    if (!r2.ok) throw new Error(r2.reason);
    expect(r2.cost).toBeGreaterThan(r1.cost);
  });

  it('refuses upgrades you cannot afford', () => {
    const s0 = world();
    const pid = s0.playerTeamId;
    const broke = { ...s0, teams: { ...s0.teams, [pid]: { ...s0.teams[pid], budget: 0 } } };
    expect(buyUpgrade(broke, pid, 'aero').ok).toBe(false);
  });

  it('a better Technical Director means cheaper, bigger upgrades', () => {
    expect(upgradeCost(3, 0, 90)).toBeLessThan(upgradeCost(3, 0, 30));
    expect(upgradeGain(50, 90)).toBeGreaterThan(upgradeGain(50, 20));
    expect(upgradeGain(95, 50)).toBeLessThan(upgradeGain(40, 50));
  });
});
