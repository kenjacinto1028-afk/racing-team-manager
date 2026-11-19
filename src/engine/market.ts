// Hiring and releasing drivers and staff.
import { LEAGUES, DRIVERS_PER_TEAM, TIERS } from '../data/leagues';
import { clamp } from './rng';
import { driverOverall } from './generate';
import { askingSalary, signingFee, willingToJoin } from './finance';
import type { GameState, LedgerEntry, StaffRole, TierId } from './types';

export type MarketResult = { ok: true; state: GameState; cost: number } | { ok: false; reason: string };

function ledgerAdd(state: GameState, teamId: string, label: string, amount: number): GameState['finance'] {
  if (teamId !== state.playerTeamId || amount === 0) return state.finance;
  const team = state.teams[teamId];
  const e: LedgerEntry = { season: state.season, round: state.leagues[team.tier].results.length, label, amount };
  return { ...state.finance, ledger: [...state.finance.ledger, e].slice(-300) };
}

/** What signing a free agent would cost this team. */
export function driverOffer(state: GameState, teamId: string, driverId: string): { salary: number; fee: number } {
  const team = state.teams[teamId];
  const d = state.drivers[driverId];
  const salary = askingSalary(d, team.tier, driverOverall(d));
  return { salary, fee: signingFee(salary) };
}

export function hireDriver(state: GameState, teamId: string, driverId: string, years = 2, free = false): MarketResult {
  const team = state.teams[teamId];
  const d = state.drivers[driverId];
  if (!team || !d) return { ok: false, reason: 'Unknown team or driver' };
  if (d.teamId) return { ok: false, reason: 'Driver is already under contract' };
  if (d.retired) return { ok: false, reason: 'Driver has retired' };
  if (team.driverIds.length >= DRIVERS_PER_TEAM) return { ok: false, reason: 'Both seats are taken. Release a driver first.' };
  if (!free && !willingToJoin(driverOverall(d), team.tier)) return { ok: false, reason: `${d.lastName} won't race at this level` };
  const { salary, fee } = driverOffer(state, teamId, driverId);
  const cost = free ? 0 : fee;
  if (team.budget < cost) return { ok: false, reason: 'Not enough money for the signing fee' };
  const next: GameState = {
    ...state,
    teams: { ...state.teams, [teamId]: { ...team, budget: team.budget - cost, driverIds: [...team.driverIds, driverId] } },
    drivers: { ...state.drivers, [driverId]: { ...d, teamId, contract: { salary, yearsLeft: clamp(years, 1, 3) } } },
    driverMarket: state.driverMarket.filter((id) => id !== driverId),
  };
  return { ok: true, state: { ...next, finance: ledgerAdd(state, teamId, `Signed ${d.firstName} ${d.lastName}`, -cost) }, cost };
}

/** Releasing a driver early costs 2 races of salary per remaining season (max 4 races). */
export function releaseCost(salary: number, yearsLeft: number): number {
  return salary * Math.min(4, 2 * Math.max(1, yearsLeft));
}

export function releaseDriver(state: GameState, teamId: string, driverId: string): MarketResult {
  const team = state.teams[teamId];
  const d = state.drivers[driverId];
  if (!team || !d || d.teamId !== teamId) return { ok: false, reason: 'Driver is not in this team' };
  const cost = d.contract ? releaseCost(d.contract.salary, d.contract.yearsLeft) : 0;
  if (team.budget < cost) return { ok: false, reason: 'Not enough money to pay off the contract' };
  const next: GameState = {
    ...state,
    teams: { ...state.teams, [teamId]: { ...team, budget: team.budget - cost, driverIds: team.driverIds.filter((x) => x !== driverId) } },
    drivers: { ...state.drivers, [driverId]: { ...d, teamId: null, contract: null } },
    driverMarket: [...state.driverMarket, driverId],
  };
  return { ok: true, state: { ...next, finance: ledgerAdd(state, teamId, `Released ${d.firstName} ${d.lastName}`, -cost) }, cost };
}

export function staffOffer(state: GameState, teamId: string, staffId: string): { salary: number; fee: number } {
  const team = state.teams[teamId];
  const s = state.staff[staffId];
  // Priced at their own level: a Prime-grade engineer wants Prime money.
  const own = TIERS.find((t) => s.rating >= LEAGUES[t].staffRange[0] + 4) ?? 3;
  const L = LEAGUES[Math.min(team.tier, own) as TierId];
  const t = clamp((s.rating - L.staffRange[0]) / (L.staffRange[1] - L.staffRange[0]), 0, 1);
  const salary = Math.round((L.staffSalary[0] + (L.staffSalary[1] - L.staffSalary[0]) * t * t) / 1000) * 1000;
  return { salary, fee: salary * 2 };
}

/** Hire a staff member. Whoever held the role leaves for the market. */
export function hireStaff(state: GameState, teamId: string, staffId: string, years = 2): MarketResult {
  const team = state.teams[teamId];
  const s = state.staff[staffId];
  if (!team || !s) return { ok: false, reason: 'Unknown team or staff member' };
  if (s.teamId) return { ok: false, reason: 'Already employed' };
  const { salary, fee } = staffOffer(state, teamId, staffId);
  if (team.budget < fee) return { ok: false, reason: 'Not enough money for the signing fee' };
  const role: StaffRole = s.role;
  const oldId = team.staffIds[role];
  const staff = { ...state.staff, [staffId]: { ...s, teamId, contract: { salary, yearsLeft: clamp(years, 1, 3) } } };
  let staffMarket = state.staffMarket.filter((id) => id !== staffId);
  if (oldId) {
    staff[oldId] = { ...staff[oldId], teamId: null, contract: null };
    staffMarket = [...staffMarket, oldId];
  }
  const next: GameState = {
    ...state,
    teams: { ...state.teams, [teamId]: { ...team, budget: team.budget - fee, staffIds: { ...team.staffIds, [role]: staffId } } },
    staff,
    staffMarket,
  };
  return { ok: true, state: { ...next, finance: ledgerAdd(state, teamId, `Hired ${s.name}`, -fee) }, cost: fee };
}
