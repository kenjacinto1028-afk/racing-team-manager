// Sponsor deals: a title sponsor plus up to 3 partners, each with a season goal.
import { LEAGUES } from '../data/leagues';
import { PARTNER_SPONSORS, TITLE_SPONSORS } from '../data/sponsors';
import { clamp, createRng, hashSeed, type Rng } from './rng';
import { teamStandings } from './season';
import type { GameState, LedgerEntry, SponsorDeal, SponsorGoal, SponsorKind, TierId } from './types';

export const MAX_PARTNERS = 3;
/** Share of the league's mid-table sponsor money a deal pays per race. */
const SHARE: Record<SponsorKind, number> = { title: 0.6, partner: 0.15 };

export interface GoalProgress {
  current: number;
  target: number;
  met: boolean;
  /** Can it still be met this season? */
  possible: boolean;
  text: string;
}

export function goalText(goal: SponsorGoal): string {
  switch (goal.kind) {
    case 'teamPos': return `Finish P${goal.target} or better in the teams' table`;
    case 'pointsFinishes': return `Score points in ${goal.target} races`;
    case 'podiums': return `Get ${goal.target} podium${goal.target > 1 ? 's' : ''}`;
    case 'wins': return `Win ${goal.target} race${goal.target > 1 ? 's' : ''}`;
  }
}

/** How the player's team is doing against a goal this season. */
export function goalProgress(state: GameState, goal: SponsorGoal): GoalProgress {
  const pid = state.playerTeamId;
  const tier = state.teams[pid].tier;
  const league = state.leagues[tier];
  const left = LEAGUES[tier].races - league.results.length;
  const text = goalText(goal);
  if (goal.kind === 'teamPos') {
    const pos = teamStandings(league).findIndex((r) => r.id === pid) + 1;
    const current = league.results.length === 0 ? 0 : pos;
    return { current, target: goal.target, met: current > 0 && current <= goal.target, possible: true, text };
  }
  let current = 0;
  for (const r of league.results) {
    const mine = r.entries.filter((e) => e.teamId === pid && !e.dnf);
    if (goal.kind === 'pointsFinishes' && mine.some((e) => e.points > 0)) current++;
    if (goal.kind === 'podiums') current += mine.filter((e) => e.position <= 3).length;
    if (goal.kind === 'wins') current += mine.filter((e) => e.position === 1).length;
  }
  const perRace = goal.kind === 'pointsFinishes' ? 1 : goal.kind === 'podiums' ? 2 : 1;
  return { current, target: goal.target, met: current >= goal.target, possible: current + left * perRace >= goal.target, text };
}

/**
 * 0-1: how attractive the team is to sponsors. Based on the latest finished season's position
 * in the current tier; a new team counts as lower mid-table.
 */
export function reputation(state: GameState): number {
  const pid = state.playerTeamId;
  const last = state.history[state.history.length - 1];
  if (!last) return 0.4;
  const pos = last.playerPos;
  const tierBonus = last.playerTier > state.teams[pid].tier ? -0.1 : last.playerTier < state.teams[pid].tier ? 0.15 : 0;
  return clamp(1 - (pos - 1) / 9 + tierBonus, 0, 1);
}

/** A goal for this tier at a given difficulty (0 easy - 1 hard). */
function makeGoal(rng: Rng, tier: TierId, difficulty: number): SponsorGoal {
  const races = LEAGUES[tier].races;
  const kinds: SponsorGoal['kind'][] = difficulty > 0.75 ? ['wins', 'podiums', 'teamPos'] : difficulty > 0.4 ? ['podiums', 'teamPos', 'pointsFinishes'] : ['pointsFinishes', 'teamPos'];
  const kind = rng.pick(kinds);
  switch (kind) {
    case 'teamPos': return { kind, target: Math.round(clamp(8 - difficulty * 6, 2, 8)) };
    case 'pointsFinishes': return { kind, target: Math.max(2, Math.round(races * (0.3 + difficulty * 0.45))) };
    case 'podiums': return { kind, target: Math.max(1, Math.round(1 + difficulty * 3)) };
    case 'wins': return { kind, target: difficulty > 0.9 ? 2 : 1 };
  }
}

/** Generate sponsor offers. Better reputation and harder goals mean more money. */
export function makeOffers(rng: Rng, tier: TierId, rep: number, kind: SponsorKind, count: number, idPrefix: string, taken: string[] = []): SponsorDeal[] {
  const pool = (kind === 'title' ? TITLE_SPONSORS : PARTNER_SPONSORS).filter((n) => !taken.includes(n));
  const names = rng.shuffle(pool).slice(0, count);
  return names.map((name, i) => {
    const difficulty = clamp((i / Math.max(1, count - 1)) * 0.8 + rng.float(-0.1, 0.2), 0, 1);
    const repFactor = 0.8 + 0.5 * rep;
    const perRace = Math.round((LEAGUES[tier].sponsorPerRace * SHARE[kind] * repFactor * (0.9 + difficulty * 0.25)) / 1000) * 1000;
    const bonus = Math.round((perRace * LEAGUES[tier].races * (0.15 + difficulty * 0.35)) / 1000) * 1000;
    return { id: `${idPrefix}${i}`, name, kind, perRace, goal: makeGoal(rng, tier, difficulty), bonus, seasons: rng.int(1, 2) };
  });
}

/** Fresh offers for any empty slots. */
export function refreshOffers(state: GameState, rng: Rng): GameState {
  const tier = state.teams[state.playerTeamId].tier;
  const rep = reputation(state);
  const active = state.sponsors.active;
  const taken = active.map((d) => d.name);
  const prefix = `sp${state.season}-`;
  const hasTitle = active.some((d) => d.kind === 'title');
  const partners = active.filter((d) => d.kind === 'partner').length;
  const offers = [
    ...(hasTitle ? [] : makeOffers(rng, tier, rep, 'title', 3, `${prefix}t`, taken)),
    ...(partners >= MAX_PARTNERS ? [] : makeOffers(rng, tier, rep, 'partner', 4, `${prefix}p`, taken)),
  ];
  return { ...state, sponsors: { active, offers } };
}

/** Starting deals for a new team: one title sponsor and two partners, plus offers for the open slot. */
export function initialSponsors(state: GameState): GameState {
  const rng = createRng(hashSeed(state.seed, 'sponsors', state.season));
  const tier = state.teams[state.playerTeamId].tier;
  const rep = reputation(state);
  const title = makeOffers(rng, tier, rep, 'title', 1, 'sp0-t')[0];
  const partners = makeOffers(rng, tier, rep, 'partner', 2, 'sp0-p', [title.name]).map((d) => ({ ...d, seasons: 1 }));
  title.seasons = 2;
  return refreshOffers({ ...state, sponsors: { active: [title, ...partners], offers: [] } }, rng);
}

export type SponsorResult = { ok: true; state: GameState } | { ok: false; reason: string };

export function signSponsor(state: GameState, offerId: string): SponsorResult {
  const offer = state.sponsors.offers.find((o) => o.id === offerId);
  if (!offer) return { ok: false, reason: 'That offer is no longer available' };
  const active = state.sponsors.active;
  if (offer.kind === 'title' && active.some((d) => d.kind === 'title')) return { ok: false, reason: 'You already have a title sponsor' };
  if (offer.kind === 'partner' && active.filter((d) => d.kind === 'partner').length >= MAX_PARTNERS) return { ok: false, reason: `All ${MAX_PARTNERS} partner slots are full` };
  const nowFull = (k: SponsorDeal['kind'], list: SponsorDeal[]) => (k === 'title' ? list.some((d) => d.kind === 'title') : list.filter((d) => d.kind === 'partner').length >= MAX_PARTNERS);
  const nextActive = [...active, offer];
  // Once a slot type is full, the other offers of that type are withdrawn.
  const offers = state.sponsors.offers.filter((o) => o.id !== offerId && !(o.kind === offer.kind && nowFull(o.kind, nextActive)));
  return { ok: true, state: { ...state, sponsors: { active: nextActive, offers } } };
}

/** Money from the player's sponsors after a race. */
export function sponsorPerRace(state: GameState): number {
  return state.sponsors.active.reduce((s, d) => s + d.perRace, 0);
}

export interface SponsorSeasonResult {
  name: string;
  kind: SponsorKind;
  goal: string;
  met: boolean;
  bonus: number;
  staying: boolean;
}

/**
 * Season end: pay bonuses for goals met, then each deal runs down a season.
 * A missed goal makes the sponsor walk away 60% of the time. Call before results are cleared.
 */
export function settleSponsors(state: GameState, rng: Rng): { state: GameState; results: SponsorSeasonResult[] } {
  const pid = state.playerTeamId;
  const results: SponsorSeasonResult[] = [];
  const keep: SponsorDeal[] = [];
  let bonusTotal = 0;
  const ledger: LedgerEntry[] = [];
  const round = state.leagues[state.teams[pid].tier].results.length;
  for (const d of state.sponsors.active) {
    const p = goalProgress(state, d.goal);
    const seasons = d.seasons - 1;
    const staying = seasons > 0 && (p.met || !rng.chance(0.6));
    if (p.met) {
      bonusTotal += d.bonus;
      ledger.push({ season: state.season, round, label: `Sponsor bonus: ${d.name}`, amount: d.bonus });
    }
    results.push({ name: d.name, kind: d.kind, goal: p.text, met: p.met, bonus: p.met ? d.bonus : 0, staying });
    if (staying) keep.push({ ...d, seasons });
  }
  const team = state.teams[pid];
  return {
    state: {
      ...state,
      teams: { ...state.teams, [pid]: { ...team, budget: team.budget + bonusTotal } },
      finance: { ...state.finance, ledger: [...state.finance.ledger, ...ledger].slice(-300) },
      sponsors: { active: keep, offers: [] },
    },
    results,
  };
}
