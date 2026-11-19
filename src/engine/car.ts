// Car concepts, parts, R&D projects, weekend setup, and power-unit wear.
import { LEAGUES } from '../data/leagues';
import { PART_BY_ID, PART_SLOTS, STANDARD_PARTS, type PartSlot } from '../data/parts';
import { clamp, createRng, hashSeed, type Rng } from './rng';
import type {
  CarConcept, CarSetup, CarStat, CarStats, GameState, LedgerEntry, SuspensionSetting, Team, TierId, Track, UnitKind, WingLevel,
} from './types';

export const CONCEPTS: CarConcept[] = ['balanced', 'lowDrag', 'highDownforce', 'tyreFriendly'];
export const MAX_PROJECTS = 2;
const STATS: CarStat[] = ['engine', 'aero', 'chassis', 'reliability'];

// ---- Effective car ----

/** Car ratings with fitted parts applied. This is what races use. */
export function effectiveCar(team: Team): CarStats {
  const car = { ...team.car };
  for (const id of Object.values(team.parts ?? {})) {
    const p = PART_BY_ID[id];
    if (!p) continue;
    for (const k of STATS) car[k] += p.effects[k] ?? 0;
  }
  for (const k of STATS) car[k] = Math.round(clamp(car[k], 1, 99));
  return car;
}

// ---- Concepts ----

/** Seconds per lap a concept gains (negative) or loses on this track. */
export function conceptDelta(concept: CarConcept, track: Track): number {
  const bias = track.profile.power - track.profile.downforce; // + = power track
  switch (concept) {
    case 'lowDrag': return -bias * 0.4;
    case 'highDownforce': return bias * 0.4;
    case 'tyreFriendly': return 0.06;
    default: return 0;
  }
}

/** Tyre wear multiplier from the concept. */
export function conceptWear(concept: CarConcept): number {
  return concept === 'tyreFriendly' ? 0.85 : 1;
}

/** The concept can only change before the first race of a season. */
export function canChangeConcept(state: GameState): boolean {
  const t = state.teams[state.playerTeamId];
  return state.leagues[t.tier].results.length === 0;
}

export type CarResult = { ok: true; state: GameState } | { ok: false; reason: string };

export function setConcept(state: GameState, concept: CarConcept): CarResult {
  if (!canChangeConcept(state)) return { ok: false, reason: 'The concept is locked once the season starts' };
  const pid = state.playerTeamId;
  return { ok: true, state: { ...state, teams: { ...state.teams, [pid]: { ...state.teams[pid], concept } } } };
}

// ---- Setup ----

const WINGS: WingLevel[] = ['low', 'medium', 'high'];
const SUSP: SuspensionSetting[] = ['soft', 'medium', 'stiff'];

/** The best setup for a track: wings follow downforce vs power; suspension follows tyre wear (soft is kinder). */
export function idealSetup(track: Track): CarSetup {
  const bias = track.profile.downforce - track.profile.power;
  const wing: WingLevel = bias > 0.2 ? 'high' : bias < -0.2 ? 'low' : 'medium';
  const w = track.profile.tyreWear;
  const suspension: SuspensionSetting = w > 0.6 ? 'soft' : w < 0.4 ? 'stiff' : 'medium';
  return { wing, suspension };
}

/** Seconds per lap from setup: spot on = -0.08 per setting, one step off = 0, two off = +0.12. */
export function setupDelta(setup: CarSetup, track: Track): number {
  const ideal = idealSetup(track);
  const step = (d: number) => (d === 0 ? -0.08 : d === 1 ? 0 : 0.12);
  return step(Math.abs(WINGS.indexOf(setup.wing) - WINGS.indexOf(ideal.wing))) + step(Math.abs(SUSP.indexOf(setup.suspension) - SUSP.indexOf(ideal.suspension)));
}

/** AI setup: a better race engineer is more likely to nail it. */
export function aiSetup(track: Track, engineer: number, rng: Rng): CarSetup {
  const ideal = idealSetup(track);
  const nudge = <T,>(arr: T[], v: T): T => {
    if (rng.chance(clamp(engineer / 100, 0.2, 0.95))) return v;
    const i = arr.indexOf(v);
    return arr[clamp(i + (rng.chance(0.5) ? 1 : -1), 0, arr.length - 1)];
  };
  return { wing: nudge(WINGS, ideal.wing), suspension: nudge(SUSP, ideal.suspension) };
}

export function setPlayerSetup(state: GameState, setup: CarSetup): GameState {
  return { ...state, setup };
}

// ---- Parts and R&D projects ----

/** Cost of designing a part for this team. A better Technical Director makes it cheaper. */
export function projectCost(tier: TierId, partId: string, td: number): number {
  const p = PART_BY_ID[partId];
  const tdFactor = 1.15 - td / 200;
  return Math.round((LEAGUES[tier].upgradeBaseCost * p.cost * tdFactor) / 1000) * 1000;
}

/** Races a design takes. TD 70+ saves a race (never below 1). */
export function projectRaces(partId: string, td: number): number {
  return Math.max(1, PART_BY_ID[partId].races - (td >= 70 ? 1 : 0));
}

function tdOf(state: GameState, team: Team): number {
  const id = team.staffIds.technicalDirector;
  return id ? state.staff[id]?.rating ?? 0 : 0;
}

function ledger(state: GameState, team: Team, label: string, amount: number): GameState['finance'] {
  if (team.id !== state.playerTeamId) return state.finance;
  const e: LedgerEntry = { season: state.season, round: state.leagues[team.tier].results.length, label, amount };
  return { ...state.finance, ledger: [...state.finance.ledger, e].slice(-300) };
}

export function startProject(state: GameState, teamId: string, partId: string): CarResult {
  const team = state.teams[teamId];
  const part = PART_BY_ID[partId];
  if (!team || !part || part.cost === 0) return { ok: false, reason: 'Unknown part' };
  if (team.ownedParts.includes(partId)) return { ok: false, reason: 'Already designed' };
  if (team.projects.some((p) => p.partId === partId)) return { ok: false, reason: 'Already in development' };
  if (team.projects.length >= MAX_PROJECTS) return { ok: false, reason: `The factory can run ${MAX_PROJECTS} projects at once` };
  const td = tdOf(state, team);
  const cost = projectCost(team.tier, partId, td);
  if (team.budget < cost) return { ok: false, reason: 'Not enough money' };
  if (state.settings?.budgetCap && team.tier === 1 && team.spend + cost > 15_000_000) return { ok: false, reason: 'That would break the budget cap' };
  const next: Team = { ...team, budget: team.budget - cost, spend: team.spend + cost, projects: [...team.projects, { partId, racesLeft: projectRaces(partId, td) }] };
  return { ok: true, state: { ...state, teams: { ...state.teams, [teamId]: next }, finance: ledger(state, team, `R&D project: ${part.name}`, -cost) } };
}

export function fitPart(state: GameState, teamId: string, partId: string): CarResult {
  const team = state.teams[teamId];
  const part = PART_BY_ID[partId];
  if (!team || !part) return { ok: false, reason: 'Unknown part' };
  if (part.cost > 0 && !team.ownedParts.includes(partId)) return { ok: false, reason: 'Design it first' };
  return { ok: true, state: { ...state, teams: { ...state.teams, [teamId]: { ...team, parts: { ...team.parts, [part.slot]: partId } } } } };
}

// ---- Power-unit wear and grid penalties ----

/** Units allowed per season before grid penalties: 1 engine per ~4 races, 1 gearbox per ~3. */
export function unitAllowance(tier: TierId, kind: UnitKind): number {
  return Math.ceil(LEAGUES[tier].races / (kind === 'engine' ? 4 : 3));
}

/** Grid places lost for each unit over the allowance. */
export const UNIT_PENALTY: Record<UnitKind, number> = { engine: 5, gearbox: 3 };

/** Average wear per race, so one unit lasts about one allowance-share of the season. */
export function wearPerRace(tier: TierId, kind: UnitKind): number {
  return (100 * unitAllowance(tier, kind)) / LEAGUES[tier].races * 0.9;
}

/** Mechanical-failure multiplier from a worn engine or gearbox (1 = fresh). */
export function wearRisk(team: Team): number {
  const w = Math.max(team.units?.engine.wear ?? 0, team.units?.gearbox.wear ?? 0);
  return 1 + Math.max(0, w - 60) / 25;
}

export function freshUnits(): Record<UnitKind, { used: number; wear: number }> {
  return { engine: { used: 1, wear: 0 }, gearbox: { used: 1, wear: 0 } };
}

/** Fit a new engine or gearbox. Over the allowance, the team drops grid places at the next race. */
export function replaceUnit(state: GameState, teamId: string, kind: UnitKind): CarResult {
  const team = state.teams[teamId];
  const used = team.units[kind].used + 1;
  const over = used > unitAllowance(team.tier, kind);
  const next: Team = {
    ...team,
    units: { ...team.units, [kind]: { used, wear: 0 } },
    gridPenalty: team.gridPenalty + (over ? UNIT_PENALTY[kind] : 0),
  };
  return { ok: true, state: { ...state, teams: { ...state.teams, [teamId]: next } } };
}

/**
 * After each race in a tier: units wear, R&D projects advance, penalties are served.
 * AI teams swap units once they pass 80% wear. Finished designs are fitted automatically for AI.
 */
export function afterRace(state: GameState, tier: TierId): GameState {
  const league = state.leagues[tier];
  const round = league.results.length;
  const rng = createRng(hashSeed(state.seed, 'wear', state.season, tier, round));
  let s = state;
  for (const teamId of league.teamIds) {
    let t = s.teams[teamId];
    const units = { ...t.units };
    for (const kind of ['engine', 'gearbox'] as UnitKind[]) {
      units[kind] = { ...units[kind], wear: Math.min(100, Math.round(units[kind].wear + wearPerRace(tier, kind) * rng.float(0.85, 1.15))) };
    }
    const done: string[] = [];
    const projects = t.projects
      .map((p) => ({ ...p, racesLeft: p.racesLeft - 1 }))
      .filter((p) => (p.racesLeft <= 0 ? (done.push(p.partId), false) : true));
    t = { ...t, units, projects, ownedParts: [...t.ownedParts, ...done], gridPenalty: 0 };
    if (!t.isPlayer) {
      for (const id of done) t = { ...t, parts: { ...t.parts, [PART_BY_ID[id].slot]: id } };
    }
    s = { ...s, teams: { ...s.teams, [teamId]: t } };
    if (!t.isPlayer && round < LEAGUES[tier].races) {
      for (const kind of ['engine', 'gearbox'] as UnitKind[]) {
        if (s.teams[teamId].units[kind].wear >= 80) {
          const r = replaceUnit(s, teamId, kind);
          if (r.ok) s = r.state;
        }
      }
    }
    if (done.length && t.isPlayer) {
      s = { ...s, finance: { ...s.finance, ledger: [...s.finance.ledger, ...done.map((id) => ({ season: s.season, round, label: `Design ready: ${PART_BY_ID[id].name}`, amount: 0 }))].slice(-300) } };
    }
  }
  return s;
}

/** Move each penalised team's cars back down the grid. Returns the new grid and who was penalised. */
export function applyGridPenalties(grid: { driverId: string; teamId: string }[], penaltyOf: (teamId: string) => number): { order: string[]; penalties: Record<string, number> } {
  const order = grid.map((g) => g.driverId);
  const penalties: Record<string, number> = {};
  // Apply from the back of the grid forward so earlier moves don't shuffle later ones.
  for (const g of [...grid].reverse()) {
    const n = penaltyOf(g.teamId);
    if (!n) continue;
    const i = order.indexOf(g.driverId);
    const to = Math.min(order.length - 1, i + n);
    order.splice(i, 1);
    order.splice(to, 0, g.driverId);
    penalties[g.driverId] = to - i;
  }
  return { order, penalties };
}

// ---- New team / new season ----

export function defaultCarFields(rng?: Rng): Pick<Team, 'concept' | 'parts' | 'ownedParts' | 'projects' | 'units' | 'gridPenalty'> {
  return {
    concept: rng ? rng.pick(CONCEPTS) : 'balanced',
    parts: { ...STANDARD_PARTS },
    ownedParts: [],
    projects: [],
    units: freshUnits(),
    gridPenalty: 0,
  };
}

/** Between seasons: new units; AI picks a concept and sometimes designs a part over the winter. */
export function carNewSeason(team: Team, rng: Rng): Team {
  let t: Team = { ...team, units: freshUnits(), gridPenalty: 0 };
  if (!t.isPlayer) {
    t = { ...t, concept: rng.pick(CONCEPTS) };
    if (rng.chance(0.4)) {
      const slot = rng.pick(PART_SLOTS).slot as PartSlot;
      const options = Object.values(PART_BY_ID).filter((p) => p.slot === slot && p.cost > 0);
      const pick = rng.pick(options);
      t = { ...t, ownedParts: [...new Set([...t.ownedParts, pick.id])], parts: { ...t.parts, [slot]: pick.id } };
    }
  }
  return t;
}
