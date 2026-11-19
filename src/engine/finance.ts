import { LEAGUES, TIERS } from '../data/leagues';
import { clamp } from './rng';
import { teamStandings } from './season';
import { sponsorPerRace } from './sponsors';
import type { CarStat, Driver, GameState, LedgerEntry, Team, TierId } from './types';

/** Races in a row with a negative balance before the game ends. */
export const BANKRUPT_STREAK = 2;
const LEDGER_MAX = 300;

/** Sponsors pay more to teams higher in the table: x1.4 for P1 down to x0.7 for P10. */
export function sponsorIncome(tier: TierId, position: number, teamsInTier = 10): number {
  const t = teamsInTier > 1 ? clamp((position - 1) / (teamsInTier - 1), 0, 1) : 0.5;
  return Math.round(LEAGUES[tier].sponsorPerRace * (1.4 - 0.7 * t));
}

/** Driver plus staff salaries paid each race (pay drivers excluded: see payDriverIncome). */
export function raceSalaries(state: GameState, teamId: string): number {
  const team = state.teams[teamId];
  let sum = 0;
  for (const id of team.driverIds) sum += Math.max(0, state.drivers[id]?.contract?.salary ?? 0);
  for (const id of Object.values(team.staffIds)) if (id) sum += state.staff[id]?.contract?.salary ?? 0;
  return sum;
}

/** Money pay drivers bring each race (their contract salary is negative). */
export function payDriverIncome(state: GameState, teamId: string): number {
  return state.teams[teamId].driverIds.reduce((s, id) => s + Math.max(0, -(state.drivers[id]?.contract?.salary ?? 0)), 0);
}

/** Formula Prime spending limit per season (R&D and signing fees), when the option is on. */
export const BUDGET_CAP = 15_000_000;

/** Null if the spend is allowed, otherwise the reason it isn't. */
export function capBlocks(state: GameState, team: Team, cost: number): string | null {
  if (!state.settings?.budgetCap || team.tier !== 1) return null;
  return team.spend + cost > BUDGET_CAP ? 'That would break the budget cap' : null;
}

/** Team morale after a race: drifts back toward 70, up for points, down for a pointless day. */
export function moraleAfterRace(morale: number, points: number): number {
  const m = morale + (70 - morale) * 0.1 + (points > 0 ? Math.min(6, 1 + points / 8) : -1);
  return Math.round(clamp(m, 20, 95));
}

function pushLedger(ledger: LedgerEntry[], entries: LedgerEntry[]): LedgerEntry[] {
  return [...ledger, ...entries].slice(-LEDGER_MAX);
}

/**
 * Pay every team in the tier after its latest race: sponsor money + points bonus - salaries.
 * Call after recordResult. Also tracks the player's bankruptcy streak.
 */
export function applyRaceFinances(state: GameState, tier: TierId): GameState {
  const league = state.leagues[tier];
  const last = league.results[league.results.length - 1];
  if (!last) return state;
  const table = teamStandings(league);
  const teams = { ...state.teams };
  let ledger = state.finance.ledger;
  let finance = state.finance;

  for (const teamId of league.teamIds) {
    const pos = table.findIndex((r) => r.id === teamId) + 1;
    const isPlayer = teamId === state.playerTeamId;
    const sponsor = isPlayer && state.sponsors ? sponsorPerRace(state) : sponsorIncome(tier, pos, league.teamIds.length);
    const mine = last.entries.filter((e) => e.teamId === teamId);
    const pts = mine.reduce((s, e) => s + e.points, 0);
    const bonus = pts * LEAGUES[tier].pointBonus;
    const salaries = raceSalaries(state, teamId);
    const payIn = payDriverIncome(state, teamId);
    let resultBonuses = 0;
    for (const e of mine) {
      const c = state.drivers[e.driverId]?.contract;
      if (!c || e.dnf) continue;
      if (e.position === 1) resultBonuses += c.winBonus ?? 0;
      if (e.position <= 3) resultBonuses += c.podiumBonus ?? 0;
    }
    const budget = teams[teamId].budget + sponsor + bonus + payIn - salaries - resultBonuses;
    teams[teamId] = { ...teams[teamId], budget, morale: moraleAfterRace(teams[teamId].morale ?? 70, pts) };

    if (isPlayer) {
      const base = { season: state.season, round: last.round };
      const lines: LedgerEntry[] = [
        { ...base, label: 'Sponsor payment', amount: sponsor },
        ...(bonus ? [{ ...base, label: `Points bonus (${pts} pts)`, amount: bonus }] : []),
        ...(payIn ? [{ ...base, label: 'Pay driver money', amount: payIn }] : []),
        { ...base, label: 'Salaries', amount: -salaries },
        ...(resultBonuses ? [{ ...base, label: 'Driver win/podium bonuses', amount: -resultBonuses }] : []),
      ];
      ledger = pushLedger(ledger, lines);
      const negativeStreak = budget < 0 ? finance.negativeStreak + 1 : 0;
      finance = { ...finance, negativeStreak, bankrupt: finance.bankrupt || negativeStreak >= BANKRUPT_STREAK };
    }
  }
  return { ...state, teams, finance: { ...finance, ledger } };
}

/** Season-end prize money for every tier, by final team position. */
export function applyPrizeMoney(state: GameState): GameState {
  const teams = { ...state.teams };
  let ledger = state.finance.ledger;
  for (const tier of TIERS) {
    const league = state.leagues[tier];
    teamStandings(league).forEach((row, i) => {
      const prize = LEAGUES[tier].prizeMoney[i] ?? 0;
      teams[row.id] = { ...teams[row.id], budget: teams[row.id].budget + prize };
      if (row.id === state.playerTeamId) {
        ledger = pushLedger(ledger, [{ season: state.season, round: league.results.length, label: `Prize money (P${i + 1})`, amount: prize }]);
      }
    });
  }
  return { ...state, teams, finance: { ...state.finance, ledger } };
}

/** One-off fee to sign a driver: 3 races of salary. */
export function signingFee(salary: number): number {
  return Math.max(0, salary) * 3;
}

/** The highest tier a driver's level fits (1 = Formula Prime). */
export function driverLevelTier(overall: number): TierId {
  return TIERS.find((t) => overall >= LEAGUES[t].driverRange[0] + 4) ?? 3;
}

/**
 * Salary a driver would ask for when joining a team in `tier`.
 * Good drivers price themselves at their own level, so a Prime-level star costs Prime money even in Academy.
 */
export function askingSalary(d: Driver, tier: TierId, overall: number): number {
  // Pay drivers bring money instead: a negative salary.
  if (d.payBudget) return -d.payBudget;
  const priceTier = Math.min(tier, driverLevelTier(overall)) as TierId;
  const L = LEAGUES[priceTier];
  const t = clamp((overall - L.driverRange[0]) / (L.driverRange[1] - L.driverRange[0]), 0, 1);
  const youthDiscount = d.age < 21 ? 0.85 : 1;
  return Math.round(((L.driverSalary[0] + (L.driverSalary[1] - L.driverSalary[0]) * t * t) * youthDiscount) / 1000) * 1000;
}

/** Stars won't drop more than one league below their level. */
export function willingToJoin(overall: number, tier: TierId): boolean {
  return tier - driverLevelTier(overall) <= 1;
}

/** Technical Director rating (0 when the role is empty). */
export function techDirectorRating(state: GameState, team: Team): number {
  const id = team.staffIds.technicalDirector;
  return id ? state.staff[id]?.rating ?? 0 : 0;
}

/** Each extra upgrade of the same stat in a season costs 35% more. A good Technical Director makes it cheaper. */
export function upgradeCost(tier: TierId, timesUpgraded: number, tdRating: number): number {
  const tdFactor = 1.15 - tdRating / 200; // TD 30 → 1.0x, TD 90 → 0.7x
  return Math.round((LEAGUES[tier].upgradeBaseCost * Math.pow(1.35, timesUpgraded) * tdFactor) / 1000) * 1000;
}

/** Upgrade price for a team, after the factory discount (6% per level). */
export function teamUpgradeCost(team: Team, stat: CarStat, tdRating: number): number {
  const factory = 1 - 0.06 * (team.facilities?.factory ?? 0);
  return Math.round((upgradeCost(team.tier, team.upgrades[stat], tdRating) * factory) / 1000) * 1000;
}

/** Rating points gained from one upgrade. Harder to improve an already-great car. */
export function upgradeGain(current: number, tdRating: number): number {
  return Math.max(1, Math.round((2 + tdRating / 35) * (1 - current / 115)));
}

export type UpgradeResult = { ok: true; state: GameState; cost: number; gain: number } | { ok: false; reason: string };

export function buyUpgrade(state: GameState, teamId: string, stat: CarStat): UpgradeResult {
  const team = state.teams[teamId];
  if (!team) return { ok: false, reason: 'Unknown team' };
  if (team.car[stat] >= 99) return { ok: false, reason: 'Already at maximum' };
  const td = techDirectorRating(state, team);
  const cost = teamUpgradeCost(team, stat, td);
  if (team.budget < cost) return { ok: false, reason: 'Not enough money' };
  const capped = capBlocks(state, team, cost);
  if (capped) return { ok: false, reason: capped };
  const gain = upgradeGain(team.car[stat], td);
  const next: Team = {
    ...team,
    budget: team.budget - cost,
    spend: (team.spend ?? 0) + cost,
    car: { ...team.car, [stat]: Math.min(99, team.car[stat] + gain) },
    upgrades: { ...team.upgrades, [stat]: team.upgrades[stat] + 1 },
  };
  let finance = state.finance;
  if (teamId === state.playerTeamId) {
    finance = {
      ...finance,
      ledger: pushLedger(finance.ledger, [{ season: state.season, round: state.leagues[team.tier].results.length, label: `R&D: ${stat} +${gain}`, amount: -cost }]),
    };
  }
  return { ok: true, state: { ...state, teams: { ...state.teams, [teamId]: next }, finance }, cost, gain };
}

