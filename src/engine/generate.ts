import { emptyRecords } from './records';
import { LEAGUES, TEAMS_PER_TIER, TIERS, STARTING_TIER, DRIVERS_PER_TEAM } from '../data/leagues';
import { NATIONS, STAFF_FIRST, STAFF_LAST, TEAM_NAMES } from '../data/names';
import { TRACKS } from '../data/tracks';
import { clamp, createRng, hashSeed, type Rng } from './rng';
import { initialSponsors } from './sponsors';
import { defaultCarFields } from './car';
import { defaultDevFields, defaultDriverFields, refreshYouthPool } from './development';
import type {
  CarStats, Driver, GameState, LeagueState, Staff, StaffRole, Team, TierId,
} from './types';

export const STAFF_ROLES: StaffRole[] = ['raceEngineer', 'chiefMechanic', 'pitCrewChief', 'technicalDirector', 'scout'];

/** Shared context for generators: randomness plus a sequential id counter. */
export interface GenCtx {
  rng: Rng;
  nextId: (prefix: string) => string;
  counter: () => number;
  /** Driver surnames already in use, so the timing tower never shows two of the same. */
  usedNames: Set<string>;
}

export function createGenCtx(rng: Rng, start = 1, usedNames: Iterable<string> = []): GenCtx {
  let n = start;
  return { rng, nextId: (p) => `${p}${n++}`, counter: () => n, usedNames: new Set(usedNames) };
}

const r1 = (v: number) => Math.round(clamp(v, 1, 99));

/** One number (0-100) that sums up a driver. */
export function driverOverall(d: Pick<Driver, 'pace' | 'consistency' | 'racecraft' | 'tyreManagement' | 'experience'>): number {
  return Math.round(d.pace * 0.4 + d.consistency * 0.15 + d.racecraft * 0.2 + d.tyreManagement * 0.15 + d.experience * 0.1);
}

export function carOverall(c: CarStats): number {
  return Math.round(c.engine * 0.3 + c.aero * 0.3 + c.chassis * 0.25 + c.reliability * 0.15);
}

/** Salary scaled by how good someone is relative to the tier. */
export function salaryFor(rating: number, range: [number, number], pay: [number, number]): number {
  const t = clamp((rating - range[0]) / (range[1] - range[0]), 0, 1);
  return Math.round((pay[0] + (pay[1] - pay[0]) * t * t) / 1000) * 1000;
}

export interface DriverOpts {
  /** 0-1 position inside the tier's range. Random if omitted. */
  quality?: number;
  age?: number;
  teamId?: string | null;
  /** Make this a pay driver who brings sponsor money. */
  payDriver?: boolean;
}

export function generateDriver(ctx: GenCtx, tier: TierId, opts: DriverOpts = {}): Driver {
  const { rng } = ctx;
  const L = LEAGUES[tier];
  // Prefer an unused surname; after a few tries accept a repeat.
  let nation = rng.pick(NATIONS);
  let lastName = rng.pick(nation.last);
  for (let i = 0; i < 12 && ctx.usedNames.has(lastName); i++) {
    nation = rng.pick(NATIONS);
    lastName = rng.pick(nation.last);
  }
  ctx.usedNames.add(lastName);
  const age = opts.age ?? (tier === 3 ? rng.int(17, 23) : tier === 2 ? rng.int(19, 28) : rng.int(21, 36));
  const q = opts.quality ?? rng.next();
  const base = L.driverRange[0] + (L.driverRange[1] - L.driverRange[0]) * q;
  const expBase = clamp((age - 16) * 5 + rng.int(-6, 6), 5, 95);
  const d: Driver = {
    id: ctx.nextId('d'),
    firstName: rng.pick(nation.first),
    lastName,
    nationality: nation.code,
    age,
    potential: 0,
    pace: r1(base + rng.normal(0, 5)),
    consistency: r1(base + rng.normal(0, 7)),
    racecraft: r1(base + rng.normal(0, 7)),
    tyreManagement: r1(base + rng.normal(0, 7)),
    experience: r1(expBase),
    contract: null,
    teamId: opts.teamId ?? null,
    ...defaultDriverFields(rng),
  };
  // Young drivers have headroom; veterans are near their peak.
  const headroom = age < 22 ? rng.int(8, 25) : age < 26 ? rng.int(3, 12) : rng.int(0, 3);
  d.potential = r1(Math.max(d.pace, driverOverall(d)) + headroom);
  if (opts.payDriver) d.payBudget = Math.round((L.driverSalary[1] * rng.float(0.35, 0.9)) / 1000) * 1000;
  if (d.teamId) {
    d.contract = { salary: salaryFor(driverOverall(d), L.driverRange, L.driverSalary), yearsLeft: rng.int(1, 3) };
  }
  return d;
}

/** A market driver: in the lower two leagues, about 1 in 4 is a weaker pay driver. */
export function generateMarketDriver(ctx: GenCtx, tier: TierId, opts: DriverOpts = {}): Driver {
  if (tier > 1 && ctx.rng.chance(0.25)) return generateDriver(ctx, tier, { ...opts, quality: ctx.rng.float(0, 0.35), payDriver: true });
  return generateDriver(ctx, tier, opts);
}

export function generateStaff(ctx: GenCtx, tier: TierId, role: StaffRole, quality?: number, teamId: string | null = null): Staff {
  const { rng } = ctx;
  const L = LEAGUES[tier];
  const q = quality ?? rng.next();
  const rating = r1(L.staffRange[0] + (L.staffRange[1] - L.staffRange[0]) * q + rng.normal(0, 4));
  return {
    id: ctx.nextId('s'),
    name: `${rng.pick(STAFF_FIRST)} ${rng.pick(STAFF_LAST)}`,
    role,
    rating,
    age: rng.int(28, 62),
    contract: teamId ? { salary: salaryFor(rating, L.staffRange, L.staffSalary), yearsLeft: rng.int(1, 3) } : null,
    teamId,
  };
}

export function generateCar(rng: Rng, tier: TierId, quality?: number): CarStats {
  const [lo, hi] = LEAGUES[tier].carRange;
  const base = lo + (hi - lo) * (quality ?? rng.next());
  return {
    engine: r1(base + rng.normal(0, 4)),
    aero: r1(base + rng.normal(0, 4)),
    chassis: r1(base + rng.normal(0, 4)),
    reliability: r1(base + 5 + rng.normal(0, 5)),
  };
}

export function makeCalendar(rng: Rng, tier: TierId): string[] {
  return rng.shuffle(TRACKS.map((t) => t.id)).slice(0, LEAGUES[tier].races);
}

/** First and last race week of a season (roughly March to November). */
export const SEASON_WEEKS: [number, number] = [10, 46];

/** Spread `races` evenly across the season weeks. Same for every tier size, no randomness. */
export function calendarWeeks(races: number): number[] {
  const [first, last] = SEASON_WEEKS;
  if (races <= 1) return [first];
  return Array.from({ length: races }, (_, i) => first + Math.round((i * (last - first)) / (races - 1)));
}

export interface PlayerSetup {
  name: string;
  short: string;
  primary: string;
  secondary: string;
}

interface Bundle { team: Team; drivers: Driver[]; staff: Staff[] }

function buildTeam(
  ctx: GenCtx, tier: TierId, quality: number,
  info: { name: string; short: string; primary: string; secondary: string }, isPlayer: boolean,
): Bundle {
  const { rng } = ctx;
  const id = ctx.nextId('t');
  const jitter = () => clamp(quality + rng.normal(0, 0.12), 0, 1);
  const drivers = Array.from({ length: DRIVERS_PER_TEAM }, () => generateDriver(ctx, tier, { quality: jitter(), teamId: id }));
  const staff = STAFF_ROLES.map((role) => generateStaff(ctx, tier, role, jitter(), id));
  const team: Team = {
    id,
    name: info.name,
    short: info.short,
    colors: { primary: info.primary, secondary: info.secondary },
    tier,
    isPlayer,
    driverIds: drivers.map((d) => d.id),
    staffIds: Object.fromEntries(staff.map((s) => [s.role, s.id])),
    car: generateCar(rng, tier, quality),
    upgrades: { engine: 0, aero: 0, chassis: 0, reliability: 0 },
    budget: Math.round(LEAGUES[tier].startBudget * (0.8 + quality * 0.5)),
    morale: 70,
    spend: 0,
    ...defaultCarFields(isPlayer ? undefined : rng),
    ...defaultDevFields(isPlayer ? undefined : rng, quality),
  };
  return { team, drivers, staff };
}

/** Build a brand-new world: 3 tiers of 10 teams, the player in Formula Academy, plus job markets. */
export function generateWorld(seed: number, player: PlayerSetup): GameState {
  const rng = createRng(hashSeed(seed, 'world'));
  const ctx = createGenCtx(rng);
  const teams: Record<string, Team> = {};
  const drivers: Record<string, Driver> = {};
  const staff: Record<string, Staff> = {};
  const leagues = {} as Record<TierId, LeagueState>;
  const add = (b: Bundle) => {
    teams[b.team.id] = b.team;
    b.drivers.forEach((d) => (drivers[d.id] = d));
    b.staff.forEach((s) => (staff[s.id] = s));
    return b.team.id;
  };

  let nameIdx = 0;
  let playerTeamId = '';
  for (const tier of TIERS) {
    const teamIds: string[] = [];
    const aiCount = tier === STARTING_TIER ? TEAMS_PER_TIER - 1 : TEAMS_PER_TIER;
    for (let i = 0; i < aiCount; i++) {
      // Earlier names are stronger teams: quality falls from ~0.76 to ~0.34 across the tier.
      const quality = clamp(0.76 - (i / (TEAMS_PER_TIER - 1)) * 0.42 + rng.normal(0, 0.06), 0.05, 1);
      teamIds.push(add(buildTeam(ctx, tier, quality, TEAM_NAMES[nameIdx++], false)));
    }
    if (tier === STARTING_TIER) {
      playerTeamId = add(buildTeam(ctx, tier, 0.45, player, true));
      teams[playerTeamId].budget = LEAGUES[tier].startBudget;
      teamIds.push(playerTeamId);
    }
    leagues[tier] = { tier, teamIds, calendar: makeCalendar(rng, tier), weeks: calendarWeeks(LEAGUES[tier].races), results: [] };
  }

  const driverMarket: string[] = [];
  for (const tier of TIERS) {
    for (let i = 0; i < 5; i++) {
      const d = generateMarketDriver(ctx, tier, { quality: rng.float(0.1, 0.8) });
      drivers[d.id] = d;
      driverMarket.push(d.id);
    }
  }
  const staffMarket: string[] = [];
  for (const role of STAFF_ROLES) {
    for (const tier of TIERS) {
      const s = generateStaff(ctx, tier, role, rng.float(0.2, 0.9));
      staff[s.id] = s;
      staffMarket.push(s.id);
    }
  }

  const world: GameState = {
    seed,
    season: 1,
    year: 2027,
    playerTeamId,
    nextId: ctx.counter(),
    teams,
    drivers,
    staff,
    leagues,
    driverMarket,
    staffMarket,
    finance: { negativeStreak: 0, bankrupt: false, ledger: [] },
    history: [],
    sponsors: { active: [], offers: [] },
    settings: { budgetCap: false },
    setup: { wing: 'medium', suspension: 'medium' },
    youthPool: [],
    records: emptyRecords(),
    feats: {},
  };
  return refreshYouthPool(initialSponsors(world));
}
