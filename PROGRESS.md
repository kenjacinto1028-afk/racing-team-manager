# Progress

**Current phase:** v1 complete. Next: playtest, then pick items from "Later" in PLAN.md
**Last updated:** 2026-11-19

Tick each box when it's done. Update "Current phase" and add an entry to `docs/SESSION_LOG.md` at the end of each session.

---

## Phase 0: Planning ✅
- [x] Choose platform, racing style, race view and scope
- [x] Write game plan (`docs/PLAN.md`)
- [x] Write project instructions (`CLAUDE.md`)

## Phase 1: Scaffold ✅
- [x] `package.json` created
- [x] Dependencies installed (react, react-dom, zustand)
- [x] Dev dependencies installed (vite, plugin-react, typescript, vitest, types)
- [x] `vite.config.ts`, `tsconfig.json`, `index.html`
- [x] `src/styles/theme.css` (colour tokens, fonts, spacing)
- [x] App shell: sidebar navigation, back/forward buttons, screen routing
- [x] `.claude/launch.json` entry for `npm run dev` (port 5173)

## Phase 2: Engine core ✅
- [x] `engine/types.ts`: Driver, Staff, Car, Team, League, Track, Season, GameState
- [x] `engine/rng.ts`: seeded RNG
- [x] `engine/generate.ts`: drivers, staff and AI teams, scaled per tier
- [x] `data/leagues.ts`, `data/tracks.ts`, `data/names.ts`
- [x] `engine/season.ts`: points, standings, promotion/relegation, ageing
- [x] `engine/finance.ts`: sponsor income, salaries, prize money, bankruptcy
- [x] Tests: points, promotion/relegation, finance

## Phase 3: Race simulation ✅
- [x] `engine/qualifying.ts`
- [x] `engine/raceSim.ts`: lap times, tyres, fuel, pit stops, overtakes, DNFs, driver modes
- [x] AI pit strategy
- [x] Tests: same seed gives the same result, the stronger car usually wins, at least one stop is enforced

## Phase 4: Store ✅
- [x] `store/gameStore.ts` (Zustand with persist)
- [x] Actions: newGame, hireDriver, releaseDriver, hireStaff, buyUpgrade, startRace, pit, setMode, finishRace, endSeason

## Phase 5: Management screens ✅
- [x] New Game
- [x] HQ Dashboard
- [x] Drivers and Market
- [x] Staff
- [x] Car / R&D
- [x] Calendar and Standings

## Phase 6: Race weekend UI ✅
- [x] Qualifying results view
- [x] TrackMap (SVG with moving car dots)
- [x] TimingTower
- [x] Commentary feed
- [x] Controls: pit, mode, speed, skip
- [x] Results and payout screen

## Phase 7: Season loop ✅
- [x] Season Review: final table, promotion/relegation
- [x] Contract renewals and expiries
- [x] AI teams upgrade between seasons (engine: `engine/offseason.ts`)
- [x] New season starts in the correct tier

## Phase 8: Teach and polish ✅
- [x] `data/glossary.ts` (done early, Phase 5) and Glossary screen
- [x] Tooltips on every stat and term
- [x] Visual polish pass (premium look)
- [x] Full browser playthrough with no console errors

---

## Known issues / notes
- Balance is first-pass. Watch whether Academy feels too easy or too hard over 2-3 seasons and tune `engine/performance.ts` and `data/leagues.ts`.
- Old drivers who drop out of the market stay in the save file (small, but grows slowly over many seasons).
- `node_modules` can't be installed inside `/mnt/project-files` (that folder blocks the links npm needs). Run `npm install` in a normal folder; the project's source is synced to `/mnt/project-files`.
