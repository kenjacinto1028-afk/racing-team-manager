// Driver and staff development: training, race experience, traits, morale, youth academy, staff growth, facilities.
import { LEAGUES, TIERS } from '../data/leagues';
import { STREET_TRACKS, TRAIT_IDS, TRAITS, type TraitId } from '../data/traits';
import { askingSalary } from './finance';
import { createGenCtx, driverOverall, generateDriver } from './generate';
import type { Competitor } from './performance';
import { clamp, createRng, hashSeed, type Rng } from './rng';
import type { Driver, FacilityKind, GameState, LedgerEntry, RaceResult, Team, TierId, TrainingFocus } from './types';

export const FACILITIES: FacilityKind[] = ['factory', 'simulator', 'gym'];
export const MAX_FACILITY = 5;
export const ACADEMY_SIZE = 3;
export const ACADEMY_PROMOTE_AGE = 17;
export const FACILITY_BUILD_RACES = 3;

// ---- Traits ----

/** Turn a driver's traits into race modifiers (merged into the Competitor). */
export function traitEffects(traits: string[], trackId?: string): Partial<Competitor> {
  const has = (t: TraitId) => traits.includes(t);
  return {
    tyreWearMult: has('tyreWhisperer') ? 0.9 : 1,
    startDelta: has('strongStarter') ? -0.5 : 0,
    crashMult: (has('hotHeaded') ? 1.5 : 1) * 1,
    mistakeMult: has('calm') ? 0.6 : 1,
    qualiDelta: has('qualifyingAce') ? -0.15 : 0,
    lapDelta: has('streetSpecialist') && trackId && STREET_TRACKS.includes(trackId) ? -0.15 : 0,
    mechRisk: has('mechanicalSympathy') ? 0.75 : 1,
  };
}

/** Chance of a random trait for a new driver; bad traits are rarer. */
export function rollTrait(rng: Rng, existing: string[] = []): TraitId | null {
  const options = TRAIT_IDS.filter((t) => !existing.includes(t));
  if (!options.length) return null;
  const weighted = options.flatMap((t) => (TRAITS[t].good ? [t, t] : [t]));
  return rng.pick(weighted);
}

// ---- Morale ----

/** Driver morale effect on lap time (s): ±0.1 at the extremes. */
export function moraleDelta(morale: number): number {
  return -((morale ?? 70) - 70) * 0.004;
}

export function moraleLabel(m: number): string {
  return m >= 85 ? 'Delighted' : m >= 70 ? 'Happy' : m >= 50 ? 'Content' : m >= 35 ? 'Frustrated' : 'Wants out';
}

/** Below this a driver refuses to renew. */
export const UNHAPPY = 35;

// ---- Training & growth ----

const FOCUS_STATS: Record<TrainingFocus, (keyof Driver)[]> = {
  pace: ['pace'],
  racecraft: ['racecraft'],
  tyres: ['tyreManagement'],
  fitness: ['consistency'],
  balanced: ['pace', 'racecraft', 'tyreManagement', 'consistency'],
};

/** Base chance per race that a training session adds +1, by age. */
function ageRate(age: number): number {
  return age <= 19 ? 0.4 : age <= 23 ? 0.3 : age <= 28 ? 0.15 : age <= 32 ? 0.06 : 0.02;
}

/** One race's worth of training for a driver. Gains slow down near potential. */
export function trainDriver(d: Driver, rng: Rng, simulator: number, gym: number): Driver {
  const stats = FOCUS_STATS[d.training ?? 'balanced'];
  const stat = rng.pick(stats) as 'pace' | 'racecraft' | 'tyreManagement' | 'consistency';
  const room = Math.max(0, d.potential - d[stat]);
  const focused = stats.length === 1 ? 1.3 : 1;
  const facility = 1 + 0.12 * simulator + (stat === 'consistency' ? 0.12 * gym : 0);
  const learner = d.traits?.includes('fastLearner') ? 1.5 : 1;
  const p = ageRate(d.age) * focused * facility * learner * clamp(room / 10, 0, 1);
  return rng.chance(p) ? { ...d, [stat]: Math.min(99, d[stat] + 1) } : d;
}

// ---- After each race ----

/**
 * Called after each race in a tier: experience, training, morale for every racing driver;
 * academy kids train at the player's... and every team's academy; staff gain experience; facility builds progress.
 */
export function developAfterRace(state: GameState, tier: TierId, result: RaceResult): GameState {
  const rng = createRng(hashSeed(state.seed, 'develop', state.season, tier, result.round));
  const drivers = { ...state.drivers };
  const staff = { ...state.staff };
  const teams = { ...state.teams };
  const byDriver = new Map(result.entries.map((e) => [e.driverId, e]));

  for (const teamId of state.leagues[tier].teamIds) {
    let team = teams[teamId];
    const fac = team.facilities ?? { factory: 0, simulator: 0, gym: 0 };
    // Racing drivers
    const entries = team.driverIds.map((id) => byDriver.get(id)).filter(Boolean);
    for (const id of team.driverIds) {
      let d = drivers[id];
      if (!d) continue;
      const e = byDriver.get(id);
      if (e) {
        if (rng.chance(e.points > 0 ? 0.5 : 0.3)) d = { ...d, experience: Math.min(99, d.experience + 1) };
        if (e.position <= 3 && !e.dnf && rng.chance(0.25)) d = { ...d, racecraft: Math.min(99, Math.max(d.racecraft, Math.min(d.potential, d.racecraft + 1))) };
        // Morale: points lift it, DNFs and losing to the team-mate hurt, being underpaid nags.
        const mate = entries.find((x) => x && x.driverId !== id);
        let m = d.morale ?? 70;
        m += e.dnf ? -3 : e.points > 0 ? 1 + Math.min(4, e.points / 6) : -1;
        if (mate && !e.dnf && !mate.dnf) m += e.position < mate.position ? 1 : -1;
        const ask = askingSalary(d, team.tier, driverOverall(d));
        if (d.contract && d.contract.salary > 0 && ask > 0 && d.contract.salary < ask * 0.75) m -= 1;
        m += (70 - m) * 0.05;
        d = { ...d, morale: Math.round(clamp(m, 20, 95)) };
      }
      d = trainDriver(d, rng, fac.simulator, fac.gym);
      drivers[id] = d;
    }
    // Academy kids train too (faster: they're young), helped by the simulator.
    for (const id of team.academy ?? []) {
      if (drivers[id]) drivers[id] = trainDriver(drivers[id], rng, fac.simulator + 1, fac.gym);
    }
    // Staff learn on the job: under 50 they improve slowly; past 60 they fade.
    for (const sid of Object.values(team.staffIds)) {
      if (!sid || !staff[sid]) continue;
      const p = staff[sid];
      if (p.age < 50 && p.rating < 95 && rng.chance(0.06)) staff[sid] = { ...p, rating: p.rating + 1 };
      else if (p.age >= 60 && rng.chance(0.04)) staff[sid] = { ...p, rating: Math.max(1, p.rating - 1) };
    }
    // Facility construction
    if (team.building) {
      const left = team.building.racesLeft - 1;
      team = left <= 0
        ? { ...team, building: null, facilities: { ...fac, [team.building.kind]: Math.min(MAX_FACILITY, fac[team.building.kind] + 1) } }
        : { ...team, building: { ...team.building, racesLeft: left } };
    }
    // Academy upkeep
    const upkeep = academyUpkeep(team.tier) * (team.academy?.length ?? 0);
    if (upkeep) team = { ...team, budget: team.budget - upkeep };
    teams[teamId] = team;
  }
  let finance = state.finance;
  const p = teams[state.playerTeamId];
  if (p.tier === tier && p.academy?.length) {
    const e: LedgerEntry = { season: state.season, round: result.round, label: 'Youth academy upkeep', amount: -academyUpkeep(p.tier) * p.academy.length };
    finance = { ...finance, ledger: [...finance.ledger, e].slice(-300) };
  }
  return { ...state, drivers, staff, teams, finance };
}

// ---- Training focus ----

export function setTraining(state: GameState, driverId: string, focus: TrainingFocus): GameState {
  const d = state.drivers[driverId];
  if (!d) return state;
  return { ...state, drivers: { ...state.drivers, [driverId]: { ...d, training: focus } } };
}

// ---- Staff courses ----

export function courseCost(state: GameState, staffId: string): number {
  const p = state.staff[staffId];
  return Math.max(5000, Math.round(((p.contract?.salary ?? 10_000) * 4) / 1000) * 1000);
}

export type DevResult = { ok: true; state: GameState; gain?: number } | { ok: false; reason: string };

/** Send a staff member on a course: +2 to +4 rating, once per season, costs 4 races of their salary. */
export function sendOnCourse(state: GameState, staffId: string): DevResult {
  const pid = state.playerTeamId;
  const team = state.teams[pid];
  const p = state.staff[staffId];
  if (!p || p.teamId !== pid) return { ok: false, reason: 'Not in your team' };
  if (p.courseSeason === state.season) return { ok: false, reason: 'Already on a course this season' };
  if (p.rating >= 95) return { ok: false, reason: 'Nothing left to learn' };
  const cost = courseCost(state, staffId);
  if (team.budget < cost) return { ok: false, reason: 'Not enough money' };
  const rng = createRng(hashSeed(state.seed, 'course', staffId, state.season));
  const gain = Math.min(95 - p.rating, rng.int(2, 4) - (p.age >= 55 ? 1 : 0));
  const e: LedgerEntry = { season: state.season, round: state.leagues[team.tier].results.length, label: `Course: ${p.name}`, amount: -cost };
  return {
    ok: true, gain,
    state: {
      ...state,
      staff: { ...state.staff, [staffId]: { ...p, rating: p.rating + gain, courseSeason: state.season } },
      teams: { ...state.teams, [pid]: { ...team, budget: team.budget - cost } },
      finance: { ...state.finance, ledger: [...state.finance.ledger, e].slice(-300) },
    },
  };
}

// ---- Facilities ----

/** Cost of the next level: grows quickly, scaled to the league. */
export function facilityCost(tier: TierId, level: number): number {
  return Math.round((LEAGUES[tier].upgradeBaseCost * 1.5 * Math.pow(1.6, level)) / 1000) * 1000;
}

/** Factory: R&D projects and quick upgrades cost 6% less per level. */
export function factoryDiscount(team: Team): number {
  return 1 - 0.06 * (team.facilities?.factory ?? 0);
}

/** Gym: 5% fewer crashes per level. */
export function gymCrashMult(team: Team): number {
  return 1 - 0.05 * (team.facilities?.gym ?? 0);
}

export function buildFacility(state: GameState, kind: FacilityKind): DevResult {
  const pid = state.playerTeamId;
  const team = state.teams[pid];
  if (team.building) return { ok: false, reason: 'Already building something' };
  const level = team.facilities[kind];
  if (level >= MAX_FACILITY) return { ok: false, reason: 'Already at the top level' };
  const cost = facilityCost(team.tier, level);
  if (team.budget < cost) return { ok: false, reason: 'Not enough money' };
  const e: LedgerEntry = { season: state.season, round: state.leagues[team.tier].results.length, label: `Build ${kind} level ${level + 1}`, amount: -cost };
  return {
    ok: true,
    state: {
      ...state,
      teams: { ...state.teams, [pid]: { ...team, budget: team.budget - cost, building: { kind, racesLeft: FACILITY_BUILD_RACES } } },
      finance: { ...state.finance, ledger: [...state.finance.ledger, e].slice(-300) },
    },
  };
}

// ---- Youth academy ----

/** One-off fee to sign a teenager, and per-race upkeep. */
export function academyFee(tier: TierId): number {
  return Math.round(LEAGUES[tier].driverSalary[0] * 2 / 1000) * 1000;
}
export function academyUpkeep(tier: TierId): number {
  return Math.round(LEAGUES[tier].driverSalary[0] * 0.15 / 100) * 100;
}

/** Fresh youth pool for the season: 6 teenagers (14-16) with a wide spread of potential. */
export function refreshYouthPool(state: GameState): GameState {
  const rng = createRng(hashSeed(state.seed, 'youth', state.season));
  const ctx = createGenCtx(rng, state.nextId, Object.values(state.drivers).filter((d) => !d.retired).map((d) => d.lastName));
  const drivers = { ...state.drivers };
  // Unsigned teenagers from last year's pool drop out of the game.
  for (const id of state.youthPool ?? []) if (!drivers[id]?.academyTeamId) delete drivers[id];
  const pool: string[] = [];
  for (let i = 0; i < 6; i++) {
    const d = generateDriver(ctx, 3, { quality: rng.float(0, 0.35), age: rng.int(14, 16) });
    // Raw, but with real headroom.
    const potential = Math.round(clamp(55 + rng.float(0, 40), 1, 99));
    drivers[d.id] = { ...d, experience: Math.min(d.experience, 12), potential };
    pool.push(d.id);
  }
  return { ...state, drivers, youthPool: pool, nextId: ctx.counter() };
}

export function signYouth(state: GameState, driverId: string): DevResult {
  const pid = state.playerTeamId;
  const team = state.teams[pid];
  const d = state.drivers[driverId];
  if (!d || !state.youthPool.includes(driverId)) return { ok: false, reason: 'Not available' };
  if (team.academy.length >= ACADEMY_SIZE) return { ok: false, reason: `The academy holds ${ACADEMY_SIZE}` };
  const fee = academyFee(team.tier);
  if (team.budget < fee) return { ok: false, reason: 'Not enough money' };
  const e: LedgerEntry = { season: state.season, round: state.leagues[team.tier].results.length, label: `Academy: ${d.firstName} ${d.lastName}`, amount: -fee };
  return {
    ok: true,
    state: {
      ...state,
      drivers: { ...state.drivers, [driverId]: { ...d, academyTeamId: pid } },
      teams: { ...state.teams, [pid]: { ...team, budget: team.budget - fee, academy: [...team.academy, driverId] } },
      youthPool: state.youthPool.filter((x) => x !== driverId),
      finance: { ...state.finance, ledger: [...state.finance.ledger, e].slice(-300) },
    },
  };
}

/** Move an academy driver (17+) into a free race seat on a 2-season deal, no signing fee. */
export function promoteYouth(state: GameState, driverId: string): DevResult {
  const pid = state.playerTeamId;
  const team = state.teams[pid];
  const d = state.drivers[driverId];
  if (!d || !team.academy.includes(driverId)) return { ok: false, reason: 'Not in your academy' };
  if (d.age < ACADEMY_PROMOTE_AGE) return { ok: false, reason: `Too young to race (${ACADEMY_PROMOTE_AGE}+)` };
  if (team.driverIds.length >= 2) return { ok: false, reason: 'Both seats are taken' };
  const salary = Math.max(LEAGUES[team.tier].driverSalary[0], Math.round(askingSalary(d, team.tier, driverOverall(d)) * 0.7 / 1000) * 1000);
  return {
    ok: true,
    state: {
      ...state,
      drivers: { ...state.drivers, [driverId]: { ...d, academyTeamId: null, teamId: pid, contract: { salary, yearsLeft: 2 } } },
      teams: { ...state.teams, [pid]: { ...team, academy: team.academy.filter((x) => x !== driverId), driverIds: [...team.driverIds, driverId] } },
    },
  };
}

/** Release an academy driver (free). */
export function releaseYouth(state: GameState, driverId: string): DevResult {
  const pid = state.playerTeamId;
  const team = state.teams[pid];
  if (!team.academy.includes(driverId)) return { ok: false, reason: 'Not in your academy' };
  const d = state.drivers[driverId];
  return {
    ok: true,
    state: {
      ...state,
      drivers: { ...state.drivers, [driverId]: { ...d, academyTeamId: null } },
      teams: { ...state.teams, [pid]: { ...team, academy: team.academy.filter((x) => x !== driverId) } },
      driverMarket: d.age >= ACADEMY_PROMOTE_AGE ? [...state.driverMarket, driverId] : state.driverMarket,
    },
  };
}

// ---- Season end ----

/**
 * Season-end development: some drivers pick up a trait (more likely after a good season, or when young);
 * morale drifts back toward normal; the youth pool is refreshed.
 */
export function developOffseason(state: GameState, rng: Rng): GameState {
  const drivers = { ...state.drivers };
  const last = state.history[state.history.length - 1];
  const lines = new Map((last?.drivers ?? []).map((l) => [l.driverId, l]));
  for (const id of Object.keys(drivers).sort()) {
    const d = drivers[id];
    if (d.retired || (!d.teamId && !d.academyTeamId)) continue;
    const line = lines.get(id);
    const good = line ? line.podiums >= 2 || line.wins > 0 : false;
    const chance = (d.age <= 24 ? 0.12 : 0.06) + (good ? 0.12 : 0);
    let next: Driver = { ...d, morale: Math.round(((d.morale ?? 70) + 70) / 2) };
    if ((d.traits?.length ?? 0) < 3 && rng.chance(chance)) {
      const t = rollTrait(rng, d.traits ?? []);
      if (t) next = { ...next, traits: [...(d.traits ?? []), t] };
    }
    drivers[id] = next;
  }
  // Academy kids who are too old for the academy (19+) leave for the market unless promoted.
  const teams = { ...state.teams };
  let market = [...state.driverMarket];
  for (const t of Object.values(teams)) {
    const stay: string[] = [];
    for (const id of t.academy ?? []) {
      if ((drivers[id]?.age ?? 0) >= 19) { drivers[id] = { ...drivers[id], academyTeamId: null }; market.push(id); }
      else stay.push(id);
    }
    if ((t.academy ?? []).length !== stay.length) teams[t.id] = { ...t, academy: stay };
  }
  market = [...new Set(market)];
  return refreshYouthPool({ ...state, drivers, teams, driverMarket: market });
}

/** New fields for a team (facilities from team strength for AI). */
export function defaultDevFields(rng?: Rng, quality = 0.5): Pick<Team, 'facilities' | 'building' | 'academy'> {
  const lv = () => (rng ? clamp(Math.round(quality * 3 + rng.float(-1, 1)), 0, 3) : 0);
  return { facilities: { factory: lv(), simulator: lv(), gym: lv() }, building: null, academy: [] };
}

/** New fields for a driver. */
export function defaultDriverFields(rng?: Rng): Pick<Driver, 'morale' | 'traits' | 'training'> {
  const traits: string[] = [];
  if (rng && rng.chance(0.3)) { const t = rollTrait(rng); if (t) traits.push(t); }
  return { morale: 70, traits, training: 'balanced' };
}

export const ALL_TIERS = TIERS;
