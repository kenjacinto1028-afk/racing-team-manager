import { describe, expect, it } from 'vitest';
import { driverOffer, hireDriver, hireStaff, releaseDriver } from '../market';
import { willingToJoin } from '../finance';
import { driverOverall } from '../generate';
import { world } from './helpers';

describe('market', () => {
  it('cannot hire with both seats full', () => {
    const s = world();
    const r = hireDriver(s, s.playerTeamId, s.driverMarket[0]);
    expect(r.ok).toBe(false);
  });

  it('release then hire swaps a driver and charges money', () => {
    const s0 = world();
    const pid = s0.playerTeamId;
    const out = s0.teams[pid].driverIds[0];
    const rel = releaseDriver(s0, pid, out);
    if (!rel.ok) throw new Error(rel.reason);
    expect(rel.state.teams[pid].driverIds).not.toContain(out);
    expect(rel.state.driverMarket).toContain(out);
    expect(rel.state.teams[pid].budget).toBe(s0.teams[pid].budget - rel.cost);

    const target = rel.state.driverMarket.find((id) => id !== out && willingToJoin(driverOverall(rel.state.drivers[id]), 3))!;
    const offer = driverOffer(rel.state, pid, target);
    const hire = hireDriver(rel.state, pid, target);
    if (!hire.ok) throw new Error(hire.reason);
    expect(hire.cost).toBe(offer.fee);
    expect(hire.state.drivers[target].teamId).toBe(pid);
    expect(hire.state.drivers[target].contract?.salary).toBe(offer.salary);
    expect(hire.state.driverMarket).not.toContain(target);
    expect(hire.state.finance.ledger.length).toBe(2);
  });

  it('hiring staff replaces the old one, who joins the market', () => {
    const s0 = world();
    const pid = s0.playerTeamId;
    const newId = s0.staffMarket.find((id) => s0.staff[id].role === 'raceEngineer')!;
    const oldId = s0.teams[pid].staffIds.raceEngineer!;
    const r = hireStaff(s0, pid, newId);
    if (!r.ok) throw new Error(r.reason);
    expect(r.state.teams[pid].staffIds.raceEngineer).toBe(newId);
    expect(r.state.staff[oldId].teamId).toBeNull();
    expect(r.state.staffMarket).toContain(oldId);
  });

  it('refuses when the team cannot afford it', () => {
    const s0 = world();
    const pid = s0.playerTeamId;
    const broke = { ...s0, teams: { ...s0.teams, [pid]: { ...s0.teams[pid], budget: 0 } } };
    expect(hireStaff(broke, pid, s0.staffMarket[0]).ok).toBe(false);
  });
});

describe('market pricing', () => {
  it('stars ask for their own level of salary and refuse leagues far below them', async () => {
    const { askingSalary, willingToJoin } = await import('../finance');
    const d = { age: 28 } as Parameters<typeof askingSalary>[0];
    expect(askingSalary(d, 3, 85)).toBeGreaterThan(askingSalary(d, 3, 50) * 3);
    expect(willingToJoin(85, 3)).toBe(false);
    expect(willingToJoin(85, 2)).toBe(true);
    expect(willingToJoin(50, 3)).toBe(true);
  });
});
