import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { buyUpgrade as engineBuyUpgrade } from '../engine/finance';
import { generateWorld, type PlayerSetup } from '../engine/generate';
import { hireDriver as engineHireDriver, hireStaff as engineHireStaff, negotiate, releaseDriver as engineReleaseDriver, releaseStaff as engineReleaseStaff, type ContractOffer, type TalkReply } from '../engine/market';
import { signSponsor as engineSignSponsor } from '../engine/sponsors';
import { fitPart as engineFitPart, replaceUnit as engineReplaceUnit, setConcept as engineSetConcept, startProject as engineStartProject } from '../engine/car';
import { previewReview, renewContract as engineRenew, runOffseason, syncOtherLeagues, type SeasonReview } from '../engine/offseason';
import { applyOrder, raceToResult, simulateToEnd, stepLap, type RaceState } from '../engine/raceSim';
import { checkRaceFeats, checkSeasonFeats } from '../engine/feats';
import type { RecordBreak } from '../engine/records';
import { completeRaceDetailed, prepareWeekend, startRace as engineStartRace, type Weekend } from '../engine/raceSetup';
import { isLeagueComplete } from '../engine/season';
import { buildFacility as engineBuild, promoteYouth as enginePromote, releaseYouth as engineReleaseYouth, sendOnCourse as engineCourse, setTraining as engineSetTraining, signYouth as engineSignYouth } from '../engine/development';
import type { FacilityKind, TrainingFocus, CarConcept, CarSetup, CarStat, Compound, DriverMode, GameState, RaceResult, TierId, UnitKind } from '../engine/types';

import { migrateSave, SAVE_VERSION } from './migrations';

export { SAVE_VERSION };

export type RaceSpeed = 1 | 4 | 16;

export interface LastRace {
  season: number;
  tier: TierId;
  round: number;
  result: RaceResult;
  budgetBefore: number;
  budgetAfter: number;
  /** All-time records that fell in this race (any league). */
  records?: RecordBreak[];
  /** Feats the player unlocked in this race. */
  feats?: string[];
}

export type ActionResult = { ok: true } | { ok: false; reason: string };

interface Data {
  saveVersion: number;
  game: GameState | null;
  weekend: Weekend | null;
  race: RaceState | null;
  raceSpeed: RaceSpeed;
  lastRace: LastRace | null;
  lastReview: SeasonReview | null;
}

export interface GameStore extends Data {
  newGame: (setup: PlayerSetup, opts?: { seed?: number; pickDriverId?: string }) => void;
  resetGame: () => void;
  hireDriver: (driverId: string, years?: number) => ActionResult;
  releaseDriver: (driverId: string) => ActionResult;
  hireStaff: (staffId: string, years?: number) => ActionResult;
  releaseStaff: (staffId: string) => ActionResult;
  /** Make a contract offer. On 'accept' the driver is signed straight away. */
  offerContract: (driverId: string, offer: ContractOffer) => TalkReply | { kind: 'error'; note: string };
  signSponsor: (offerId: string) => ActionResult;
  setBudgetCap: (on: boolean) => void;
  setConcept: (c: CarConcept) => ActionResult;
  startProject: (partId: string) => ActionResult;
  fitPart: (partId: string) => ActionResult;
  replaceUnit: (kind: UnitKind) => ActionResult;
  setSetup: (setup: CarSetup) => void;
  setTraining: (driverId: string, focus: TrainingFocus) => void;
  sendOnCourse: (staffId: string) => ActionResult;
  buildFacility: (kind: FacilityKind) => ActionResult;
  signYouth: (driverId: string) => ActionResult;
  promoteYouth: (driverId: string) => ActionResult;
  releaseYouth: (driverId: string) => ActionResult;
  buyUpgrade: (stat: CarStat) => ActionResult;
  /** Run qualifying for the player's next race. */
  prepareRace: () => ActionResult;
  startRace: (startCompounds?: Record<string, Compound>) => ActionResult;
  tick: () => void;
  pit: (driverId: string, compound: Compound | null) => void;
  setMode: (driverId: string, mode: DriverMode) => void;
  setSpeed: (s: RaceSpeed) => void;
  skipRace: () => void;
  finishRace: () => ActionResult;
  renewContract: (kind: 'driver' | 'staff', id: string, years: number) => void;
  endSeason: () => ActionResult;
}

const initial: Data = {
  saveVersion: SAVE_VERSION, game: null, weekend: null, race: null, raceSpeed: 4, lastRace: null, lastReview: null,
};

const playerTier = (g: GameState): TierId => g.teams[g.playerTeamId].tier;

/** True when the player's league has run all its races. */
export function seasonOver(g: GameState): boolean {
  return isLeagueComplete(g.leagues[playerTier(g)]);
}

export function createGameStore(storage?: StateStorage, name = 'rtm-save') {
  return create<GameStore>()(
    persist(
      (set, get) => {
        const withGame = (fn: (g: GameState) => { ok: true; state: GameState } | { ok: false; reason: string }): ActionResult => {
          const g = get().game;
          if (!g) return { ok: false, reason: 'No game in progress' };
          if (get().race) return { ok: false, reason: 'Not during a race' };
          const r = fn(g);
          if (!r.ok) return r;
          set({ game: r.state });
          return { ok: true };
        };

        return {
          ...initial,

          newGame: (setup, opts = {}) => {
            const seed = opts.seed ?? (Date.now() % 2147483647);
            let g = generateWorld(seed, setup);
            if (opts.pickDriverId && g.driverMarket.includes(opts.pickDriverId)) {
              // Swap out the weaker starting driver for the chosen one, at no fee.
              const [a, b] = g.teams[g.playerTeamId].driverIds;
              const weaker = g.drivers[a].pace <= g.drivers[b].pace ? a : b;
              const rel = engineReleaseDriver({ ...g, teams: { ...g.teams, [g.playerTeamId]: { ...g.teams[g.playerTeamId], budget: 1e12 } } }, g.playerTeamId, weaker);
              if (rel.ok) {
                const hired = engineHireDriver(rel.state, g.playerTeamId, opts.pickDriverId, 2, true);
                if (hired.ok) {
                  g = { ...hired.state, teams: { ...hired.state.teams, [g.playerTeamId]: { ...hired.state.teams[g.playerTeamId], budget: g.teams[g.playerTeamId].budget } }, finance: g.finance };
                }
              }
            }
            set({ ...initial, game: g });
          },

          resetGame: () => set({ ...initial }),

          hireDriver: (id, years) => withGame((g) => engineHireDriver(g, g.playerTeamId, id, years)),
          releaseDriver: (id) => withGame((g) => engineReleaseDriver(g, g.playerTeamId, id)),
          hireStaff: (id, years) => withGame((g) => engineHireStaff(g, g.playerTeamId, id, years)),
          releaseStaff: (id) => withGame((g) => engineReleaseStaff(g, g.playerTeamId, id)),
          offerContract: (id, offer) => {
            const g = get().game;
            if (!g) return { kind: 'error', note: 'No game in progress' };
            if (get().race) return { kind: 'error', note: 'Not during a race' };
            const reply = negotiate(g, g.playerTeamId, id, offer);
            if (reply.kind !== 'accept') return reply;
            const r = engineHireDriver(g, g.playerTeamId, id, offer.years, false, offer);
            if (!r.ok) return { kind: 'error', note: r.reason };
            set({ game: r.state });
            return reply;
          },
          signSponsor: (offerId) => withGame((g) => engineSignSponsor(g, offerId)),
          setConcept: (c) => withGame((g) => engineSetConcept(g, c)),
          startProject: (id) => withGame((g) => engineStartProject(g, g.playerTeamId, id)),
          fitPart: (id) => withGame((g) => engineFitPart(g, g.playerTeamId, id)),
          replaceUnit: (kind) => withGame((g) => engineReplaceUnit(g, g.playerTeamId, kind)),
          setSetup: (setup) => {
            const g = get().game;
            if (g && !get().weekend) set({ game: { ...g, setup } });
          },
          setTraining: (id, focus) => {
            const g = get().game;
            if (g) set({ game: engineSetTraining(g, id, focus) });
          },
          sendOnCourse: (id) => withGame((g) => engineCourse(g, id)),
          buildFacility: (kind) => withGame((g) => engineBuild(g, kind)),
          signYouth: (id) => withGame((g) => engineSignYouth(g, id)),
          promoteYouth: (id) => withGame((g) => enginePromote(g, id)),
          releaseYouth: (id) => withGame((g) => engineReleaseYouth(g, id)),
          setBudgetCap: (on) => {
            const g = get().game;
            if (g) set({ game: { ...g, settings: { ...g.settings, budgetCap: on } } });
          },
          buyUpgrade: (stat) => withGame((g) => engineBuyUpgrade(g, g.playerTeamId, stat)),

          prepareRace: () => {
            const { game: g, race } = get();
            if (!g) return { ok: false, reason: 'No game in progress' };
            if (race) return { ok: false, reason: 'A race is already running' };
            if (g.finance.bankrupt) return { ok: false, reason: 'The team is bankrupt' };
            if (g.teams[g.playerTeamId].driverIds.length < 2) return { ok: false, reason: 'You need two drivers to race' };
            const w = prepareWeekend(g, playerTier(g));
            if (!w) return { ok: false, reason: 'The season is over' };
            set({ weekend: w });
            return { ok: true };
          },

          startRace: (startCompounds) => {
            const { game: g, weekend: w } = get();
            if (!g || !w) return { ok: false, reason: 'Run qualifying first' };
            const trackId = g.leagues[w.tier].calendar[w.round - 1];
            const race = engineStartRace(w, trackId, { playerDriverIds: g.teams[g.playerTeamId].driverIds, startCompounds });
            set({ race });
            return { ok: true };
          },

          tick: () => {
            const r = get().race;
            if (r && !r.finished) set({ race: stepLap(r) });
          },
          pit: (driverId, compound) => {
            const r = get().race;
            if (r) set({ race: applyOrder(r, driverId, { pit: compound }) });
          },
          setMode: (driverId, mode) => {
            const r = get().race;
            if (r) set({ race: applyOrder(r, driverId, { mode }) });
          },
          setSpeed: (raceSpeed) => set({ raceSpeed }),
          skipRace: () => {
            const r = get().race;
            if (r) set({ race: simulateToEnd(r) });
          },

          finishRace: () => {
            const { game: g, weekend: w, race } = get();
            if (!g || !w || !race) return { ok: false, reason: 'No race to finish' };
            if (!race.finished) return { ok: false, reason: 'The race is still running' };
            const before = g.teams[g.playerTeamId].budget;
            const done = completeRaceDetailed(g, w.tier, race, w.round);
            const result = raceToResult(race, w.round);
            const fe = checkRaceFeats(done.state, result, done.broken, before);
            let next = fe.state;
            const after = next.teams[next.playerTeamId].budget;
            next = syncOtherLeagues(next);
            set({
              game: next, race: null, weekend: null,
              lastRace: { season: g.season, tier: w.tier, round: w.round, result, budgetBefore: before, budgetAfter: after, records: done.broken, feats: fe.unlocked },
            });
            return { ok: true };
          },

          renewContract: (kind, id, years) => {
            const g = get().game;
            if (g) set({ game: engineRenew(g, kind, id, years, previewReview(g).playerTierAfter) });
          },

          endSeason: () => {
            const g = get().game;
            if (!g) return { ok: false, reason: 'No game in progress' };
            if (!seasonOver(g)) return { ok: false, reason: 'The season is not finished' };
            const off = runOffseason(g);
            const fe = checkSeasonFeats(off.state, off.review);
            const review = { ...off.review, newFeats: fe.unlocked };
            set({ game: fe.state, lastReview: review, lastRace: null, weekend: null, race: null });
            return { ok: true };
          },
        };
      },
      {
        name,
        version: SAVE_VERSION,
        storage: createJSONStorage(() => storage ?? localStorage),
        partialize: (s): Data => ({
          saveVersion: s.saveVersion, game: s.game, weekend: s.weekend, race: s.race,
          raceSpeed: s.raceSpeed, lastRace: s.lastRace, lastReview: s.lastReview,
        }),
        // Old save shape: upgrade it step by step. Only start fresh if it can't be upgraded.
        migrate: (saved, version) => (migrateSave(saved, version) ?? { ...initial }) as unknown as GameStore,
      },
    ),
  );
}

export const useGame = createGameStore();

/** Season review preview for the current (finished) season. */
export function currentReview(g: GameState): SeasonReview {
  return previewReview(g);
}

