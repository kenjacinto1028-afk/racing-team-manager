// Hiring and releasing drivers and staff.
import { LEAGUES, DRIVERS_PER_TEAM, TIERS } from '../data/leagues';
import { clamp } from './rng';
import { driverOverall } from './generate';
import { askingSalary, capBlocks, signingFee, willingToJoin } from './finance';
import type { Contract, GameState, LedgerEntry, StaffRole, TierId } from './types';

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

/** Agreed terms from contract talks. Without them the driver signs at their asking salary. */
export interface DriverTerms { salary: number; winBonus?: number; podiumBonus?: number }

export function hireDriver(state: GameState, teamId: string, driverId: string, years = 2, free = false, terms?: DriverTerms): MarketResult {
  const team = state.teams[teamId];
  const d = state.drivers[driverId];
  if (!team || !d) return { ok: false, reason: 'Unknown team or driver' };
  if (d.teamId) return { ok: false, reason: 'Driver is already under contract' };
  if (d.retired) return { ok: false, reason: 'Driver has retired' };
  if (team.driverIds.length >= DRIVERS_PER_TEAM) return { ok: false, reason: 'Both seats are taken. Release a driver first.' };
  if (!free && !willingToJoin(driverOverall(d), team.tier)) return { ok: false, reason: `${d.lastName} won't race at this level` };
  const ask = driverOffer(state, teamId, driverId);
  const salary = terms?.salary ?? ask.salary;
  const cost = free ? 0 : signingFee(salary);
  if (team.budget < cost) return { ok: false, reason: 'Not enough money for the signing fee' };
  const capped = free ? null : capBlocks(state, team, cost);
  if (capped) return { ok: false, reason: capped };
  const contract: Contract = { salary, yearsLeft: clamp(years, 1, 3) };
  if (terms?.winBonus) contract.winBonus = terms.winBonus;
  if (terms?.podiumBonus) contract.podiumBonus = terms.podiumBonus;
  const next: GameState = {
    ...state,
    teams: { ...state.teams, [teamId]: { ...team, budget: team.budget - cost, spend: (team.spend ?? 0) + cost, driverIds: [...team.driverIds, driverId] } },
    drivers: { ...state.drivers, [driverId]: { ...d, teamId, contract } },
    driverMarket: state.driverMarket.filter((id) => id !== driverId),
  };
  return { ok: true, state: { ...next, finance: ledgerAdd(state, teamId, `Signed ${d.firstName} ${d.lastName}`, -cost) }, cost };
}

/** Releasing someone early costs 2 races of salary per remaining season (max 4 races): the settlement. */
export function releaseCost(salary: number, yearsLeft: number): number {
  return Math.max(0, salary) * Math.min(4, 2 * Math.max(1, yearsLeft));
}

/** Morale lost when the team fires a driver / a staff member. */
export const FIRE_MORALE = { driver: 8, staff: 4 };

const lowerMorale = (m: number | undefined, by: number) => Math.max(20, (m ?? 70) - by);

export function releaseDriver(state: GameState, teamId: string, driverId: string): MarketResult {
  const team = state.teams[teamId];
  const d = state.drivers[driverId];
  if (!team || !d || d.teamId !== teamId) return { ok: false, reason: 'Driver is not in this team' };
  const cost = d.contract ? releaseCost(d.contract.salary, d.contract.yearsLeft) : 0;
  if (team.budget < cost) return { ok: false, reason: 'Not enough money to pay off the contract' };
  const next: GameState = {
    ...state,
    teams: { ...state.teams, [teamId]: { ...team, budget: team.budget - cost, morale: lowerMorale(team.morale, FIRE_MORALE.driver), driverIds: team.driverIds.filter((x) => x !== driverId) } },
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
  const capped = capBlocks(state, team, fee);
  if (capped) return { ok: false, reason: capped };
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
    teams: { ...state.teams, [teamId]: { ...team, budget: team.budget - fee, spend: (team.spend ?? 0) + fee, staffIds: { ...team.staffIds, [role]: staffId } } },
    staff,
    staffMarket,
  };
  return { ok: true, state: { ...next, finance: ledgerAdd(state, teamId, `Hired ${s.name}`, -fee) }, cost: fee };
}

/** Fire a staff member: pay the settlement, the role becomes vacant, morale dips. */
export function releaseStaff(state: GameState, teamId: string, staffId: string): MarketResult {
  const team = state.teams[teamId];
  const p = state.staff[staffId];
  if (!team || !p || p.teamId !== teamId) return { ok: false, reason: 'Not in this team' };
  const cost = p.contract ? releaseCost(p.contract.salary, p.contract.yearsLeft) : 0;
  if (team.budget < cost) return { ok: false, reason: 'Not enough money to pay off the contract' };
  const staffIds = { ...team.staffIds };
  delete staffIds[p.role];
  const next: GameState = {
    ...state,
    teams: { ...state.teams, [teamId]: { ...team, budget: team.budget - cost, morale: lowerMorale(team.morale, FIRE_MORALE.staff), staffIds } },
    staff: { ...state.staff, [staffId]: { ...p, teamId: null, contract: null } },
    staffMarket: [...state.staffMarket, staffId],
  };
  return { ok: true, state: { ...next, finance: ledgerAdd(state, teamId, `Released ${p.name}`, -cost) }, cost };
}

// ---- Contract talks ----

export interface ContractOffer { salary: number; years: number; winBonus: number; podiumBonus: number }
export type TalkReply =
  | { kind: 'accept' }
  | { kind: 'counter'; offer: ContractOffer; note: string }
  | { kind: 'refuse'; note: string };

/** Contract length the driver wants: youngsters want short deals to move up, veterans want security. */
export function preferredYears(age: number): number {
  return age <= 22 ? 1 : age >= 31 ? 3 : 2;
}

/** 0-1: how often the driver expects to win / reach the podium, from where they rank in the team's league. */
function expectedRates(state: GameState, teamId: string, driverId: string): { win: number; podium: number } {
  const L = LEAGUES[state.teams[teamId].tier];
  const t = clamp((driverOverall(state.drivers[driverId]) - L.driverRange[0]) / (L.driverRange[1] - L.driverRange[0]), 0, 1);
  return { win: 0.02 + t * 0.15, podium: 0.06 + t * 0.35 };
}

/** What an offer is worth to the driver per race, relative to their asking salary (1 = exactly what they want). */
export function offerValue(state: GameState, teamId: string, driverId: string, o: ContractOffer): number {
  const ask = driverOffer(state, teamId, driverId).salary;
  if (ask <= 0) return 1;
  const r = expectedRates(state, teamId, driverId);
  const perRace = o.salary + o.winBonus * r.win + o.podiumBonus * r.podium;
  const yearsOff = Math.abs(o.years - preferredYears(state.drivers[driverId].age));
  return (perRace / ask) * (1 - 0.06 * yearsOff);
}

/** The driver's answer: accept at 98% of their value or more, counter from 80%, refuse below. */
export function negotiate(state: GameState, teamId: string, driverId: string, o: ContractOffer): TalkReply {
  const d = state.drivers[driverId];
  if (d.payBudget) return { kind: 'refuse', note: `${d.lastName} is a pay driver: the deal is fixed.` };
  const v = offerValue(state, teamId, driverId, o);
  if (v >= 0.98) return { kind: 'accept' };
  if (v < 0.8) return { kind: 'refuse', note: `${d.lastName}'s camp says that's not a serious offer.` };
  const pref = preferredYears(d.age);
  const r = expectedRates(state, teamId, driverId);
  const ask = driverOffer(state, teamId, driverId).salary;
  // Counter at their preferred length with your bonuses, salary topped up to make it worth it.
  const salary = Math.ceil((ask - o.winBonus * r.win - o.podiumBonus * r.podium) / 1000) * 1000;
  return { kind: 'counter', offer: { ...o, years: pref, salary: Math.max(salary, Math.round(ask * 0.5 / 1000) * 1000) }, note: pref !== o.years ? `${d.lastName} wants ${pref} season${pref > 1 ? 's' : ''} and a bit more money.` : `${d.lastName} wants a bit more money.` };
}
