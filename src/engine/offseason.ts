// Everything that happens between seasons.
import { LEAGUES, TIERS, DRIVERS_PER_TEAM } from '../data/leagues';
import { createRng, hashSeed, type Rng } from './rng';
import { applyPrizeMoney, askingSalary, capBlocks, upgradeCost, upgradeGain, techDirectorRating } from './finance';
import { calendarWeeks, createGenCtx, driverOverall, generateDriver, generateMarketDriver, generateStaff, makeCalendar, STAFF_ROLES } from './generate';
import { carNewSeason } from './car';
import { developOffseason, UNHAPPY } from './development';
import { refreshOffers, settleSponsors, type SponsorSeasonResult } from './sponsors';
import { addToHistory } from './history';
import { autoRaceNext } from './raceSetup';
import {
  ageAllDrivers, applyPromotionRelegation, driverStandings, isLeagueComplete, seasonMoves, teamStandings,
  type StandingRow, type TeamMove,
} from './season';
import type { CarStat, GameState, Team, TierId } from './types';
import { staffOffer } from './market';

export interface SeasonReview {
  season: number;
  year: number;
  teamTables: Record<TierId, StandingRow[]>;
  driverTables: Record<TierId, StandingRow[]>;
  promoted: TeamMove[];
  relegated: TeamMove[];
  playerTierBefore: TierId;
  playerTierAfter: TierId;
  playerPosition: number;
  playerPrize: number;
  retired: string[];
  sponsors: SponsorSeasonResult[];
  /** Feats the player unlocked at season end. */
  newFeats?: string[];
}

/** Race every tier to the end of its calendar (AI only). */
export function completeAllLeagues(state: GameState): GameState {
  let s = state;
  for (const tier of TIERS) {
    while (!isLeagueComplete(s.leagues[tier])) s = autoRaceNext(s, tier);
  }
  return s;
}

/** Keep the other leagues roughly in step with the player's: after player round r of M, a league of N races has run floor(r*N/M). */
export function syncOtherLeagues(state: GameState): GameState {
  const pTier = state.teams[state.playerTeamId].tier;
  const p = state.leagues[pTier];
  const r = p.results.length;
  const M = LEAGUES[pTier].races;
  let s = state;
  for (const tier of TIERS) {
    if (tier === pTier) continue;
    const target = r >= M ? LEAGUES[tier].races : Math.floor((r * LEAGUES[tier].races) / M);
    while (s.leagues[tier].results.length < target) s = autoRaceNext(s, tier);
  }
  return s;
}

export function previewReview(state: GameState): SeasonReview {
  const teamTables = {} as Record<TierId, StandingRow[]>;
  const driverTables = {} as Record<TierId, StandingRow[]>;
  for (const t of TIERS) {
    teamTables[t] = teamStandings(state.leagues[t]);
    driverTables[t] = driverStandings(state.leagues[t]);
  }
  const { promoted, relegated } = seasonMoves(state);
  const pid = state.playerTeamId;
  const before = state.teams[pid].tier;
  const move = [...promoted, ...relegated].find((m) => m.teamId === pid);
  const pos = teamTables[before].findIndex((r) => r.id === pid) + 1;
  return {
    season: state.season, year: state.year, teamTables, driverTables, promoted, relegated,
    playerTierBefore: before, playerTierAfter: move ? move.to : before, playerPosition: pos,
    playerPrize: LEAGUES[before].prizeMoney[pos - 1] ?? 0, retired: [], sponsors: [],
  };
}

/** What renewing would cost per race. Priced for the league the team will race in next (`tier`). */
export function renewalSalary(state: GameState, kind: 'driver' | 'staff', id: string, tier: TierId): number {
  if (kind === 'driver') {
    const d = state.drivers[id];
    return askingSalary(d, tier, driverOverall(d));
  }
  const pid = state.playerTeamId;
  const asIf = { ...state, teams: { ...state.teams, [pid]: { ...state.teams[pid], tier } } };
  return staffOffer(asIf, pid, id).salary;
}

/** Player keeps someone whose contract is ending, at the salary for `tier`. */
export function renewContract(state: GameState, kind: 'driver' | 'staff', id: string, years: number, tier?: TierId): GameState {
  const t = tier ?? state.teams[state.playerTeamId].tier;
  const salary = renewalSalary(state, kind, id, t);
  if (kind === 'driver') {
    const d = state.drivers[id];
    if (!d?.contract) return state;
    if ((d.morale ?? 70) < UNHAPPY) return state; // unhappy drivers won't re-sign
    return { ...state, drivers: { ...state.drivers, [id]: { ...d, contract: { salary, yearsLeft: d.contract.yearsLeft + years } } } };
  }
  const s = state.staff[id];
  if (!s?.contract) return state;
  return { ...state, staff: { ...state.staff, [id]: { ...s, contract: { salary, yearsLeft: s.contract.yearsLeft + years } } } };
}

function tierMid(tier: TierId): number {
  const [lo, hi] = LEAGUES[tier].carRange;
  return (lo + hi) / 2;
}

const STATS: CarStat[] = ['engine', 'aero', 'chassis', 'reliability'];

/** New-season car: rivals catch up, so every car drifts 20% back toward the tier average. */
function carCarryOver(team: Team): Team {
  const mid = tierMid(team.tier);
  const car = { ...team.car };
  for (const k of STATS) car[k] = Math.round(car[k] - (car[k] - mid) * 0.2);
  return { ...team, car, upgrades: { engine: 0, aero: 0, chassis: 0, reliability: 0 }, spend: 0, morale: Math.round(((team.morale ?? 70) + 70) / 2) };
}

/** AI spends part of its budget on upgrades, keeping a reserve for salaries. */
function aiDevelop(state: GameState, team: Team, rng: Rng): Team {
  let t = team;
  const reserve = LEAGUES[t.tier].sponsorPerRace * 3;
  for (let i = 0; i < 8; i++) {
    const stat = rng.pick(STATS);
    const cost = upgradeCost(t.tier, t.upgrades[stat], techDirectorRating(state, t));
    if (t.budget - cost < reserve || capBlocks(state, t, cost)) break;
    t = {
      ...t, budget: t.budget - cost, spend: (t.spend ?? 0) + cost,
      car: { ...t.car, [stat]: Math.min(99, t.car[stat] + upgradeGain(t.car[stat], techDirectorRating(state, t))) },
      upgrades: { ...t.upgrades, [stat]: t.upgrades[stat] + 1 },
    };
  }
  return t;
}

/** End the season and set up the next. Returns the new state and a summary of what happened. */
export function runOffseason(input: GameState): { state: GameState; review: SeasonReview } {
  let s = completeAllLeagues(input);
  const review = previewReview(s);
  // Archive before anything changes: tables, champions, and who drove / worked where.
  s = addToHistory(s);
  const rng = createRng(hashSeed(s.seed, 'offseason', s.season));
  const ctx = createGenCtx(rng, s.nextId, Object.values(s.drivers).filter((d) => !d.retired).map((d) => d.lastName));

  const settled = settleSponsors(s, rng);
  s = settled.state;
  review.sponsors = settled.results;
  s = applyPrizeMoney(s);
  s = applyPromotionRelegation(s);

  // Contracts: one season passes. Expired people leave; AI teams often re-sign theirs.
  const drivers = { ...s.drivers };
  const staff = { ...s.staff };
  const teams = { ...s.teams };
  const driverMarket = new Set(s.driverMarket);
  const staffMarket = new Set(s.staffMarket);
  for (const d of Object.values(drivers)) {
    if (!d.contract || !d.teamId) continue;
    const yearsLeft = d.contract.yearsLeft - 1;
    const team = teams[d.teamId];
    if (yearsLeft > 0) { drivers[d.id] = { ...d, contract: { ...d.contract, yearsLeft } }; continue; }
    if (!team.isPlayer && rng.chance(0.6)) {
      drivers[d.id] = { ...d, contract: { salary: askingSalary(d, team.tier, driverOverall(d)), yearsLeft: rng.int(1, 3) } };
      continue;
    }
    drivers[d.id] = { ...d, teamId: null, contract: null };
    teams[team.id] = { ...teams[team.id], driverIds: teams[team.id].driverIds.filter((x) => x !== d.id) };
    driverMarket.add(d.id);
  }
  for (const p of Object.values(staff)) {
    if (!p.contract || !p.teamId) continue;
    const yearsLeft = p.contract.yearsLeft - 1;
    const team = teams[p.teamId];
    if (yearsLeft > 0 || (!team.isPlayer && rng.chance(0.7))) {
      staff[p.id] = { ...p, contract: { ...p.contract, yearsLeft: yearsLeft > 0 ? yearsLeft : rng.int(1, 3) } };
      continue;
    }
    staff[p.id] = { ...p, teamId: null, contract: null };
    const staffIds = { ...teams[team.id].staffIds };
    delete staffIds[p.role];
    teams[team.id] = { ...teams[team.id], staffIds };
    staffMarket.add(p.id);
  }
  s = { ...s, drivers, staff, teams, driverMarket: [...driverMarket], staffMarket: [...staffMarket] };

  // Everyone gets a year older.
  const aged = ageAllDrivers(s, rng);
  s = aged.state;
  review.retired = aged.retired;

  // Fresh talent joins the market; very old or weak free agents drop out.
  const newDrivers = { ...s.drivers };
  let market = s.driverMarket.filter((id) => newDrivers[id].age < 34);
  for (const tier of TIERS) {
    for (let i = 0; i < 4; i++) {
      const d = generateMarketDriver(ctx, tier, { quality: rng.float(0.1, 0.85), age: tier === 3 ? rng.int(16, 19) : undefined });
      newDrivers[d.id] = d;
      market.push(d.id);
    }
  }
  const newStaff = { ...s.staff };
  const sMarket = [...s.staffMarket];
  for (const role of STAFF_ROLES) {
    for (const tier of TIERS) {
      const p = generateStaff(ctx, tier, role, rng.float(0.2, 0.9));
      newStaff[p.id] = p;
      sMarket.push(p.id);
    }
  }
  s = { ...s, drivers: newDrivers, staff: newStaff, driverMarket: market, staffMarket: sMarket };

  // AI teams fill empty seats and roles, then develop their cars.
  const teams2 = { ...s.teams };
  const drivers2 = { ...s.drivers };
  const staff2 = { ...s.staff };
  for (const tier of TIERS) {
    for (const teamId of s.leagues[tier].teamIds) {
      let team = carNewSeason(carCarryOver(teams2[teamId]), rng);
      if (!team.isPlayer) {
        while (team.driverIds.length < DRIVERS_PER_TEAM) {
          // Best affordable free agent; otherwise sign a rookie.
          const options = market
            .map((id) => drivers2[id])
            .filter((d) => !d.retired && !d.teamId)
            .sort((a, b) => driverOverall(b) - driverOverall(a) || (a.id < b.id ? -1 : 1));
          const cap = LEAGUES[tier].driverRange[1] - (tier === 1 ? 0 : 4);
          let pick = options.find((d) => driverOverall(d) <= cap && rng.chance(0.5)) ?? options.find((d) => driverOverall(d) <= cap);
          if (!pick) {
            pick = generateDriver(ctx, tier, { quality: rng.float(0.2, 0.6) });
          }
          market = market.filter((id) => id !== pick!.id);
          drivers2[pick.id] = { ...pick, teamId, contract: { salary: askingSalary(pick, tier, driverOverall(pick)), yearsLeft: rng.int(1, 3) } };
          team = { ...team, driverIds: [...team.driverIds, pick.id] };
        }
        for (const role of STAFF_ROLES) {
          if (team.staffIds[role]) continue;
          const p = generateStaff(ctx, tier, role, rng.float(0.2, 0.8), teamId);
          staff2[p.id] = p;
          team = { ...team, staffIds: { ...team.staffIds, [role]: p.id } };
        }
        team = aiDevelop({ ...s, staff: staff2 }, team, rng);
      }
      teams2[teamId] = team;
    }
  }

  const leagues = { ...s.leagues };
  for (const tier of TIERS) leagues[tier] = { ...leagues[tier], calendar: makeCalendar(rng, tier), weeks: calendarWeeks(LEAGUES[tier].races), results: [] };

  s = {
    ...s,
    teams: teams2, drivers: drivers2, staff: staff2, leagues,
    driverMarket: market,
    season: s.season + 1,
    year: s.year + 1,
    nextId: ctx.counter(),
  };
  // Traits, morale reset, academy graduates, new youth pool (uses nextId, so it runs last).
  s = developOffseason(s, rng);
  s = refreshOffers(s, rng);
  return { state: s, review };
}
