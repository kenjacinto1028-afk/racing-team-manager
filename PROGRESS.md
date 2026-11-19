# Progress

**Current phase:** v1 complete. v2 roadmap written (`docs/ROADMAP.md`). Next: Phase 10 Foundations
**Last updated:** 2026-11-19
**Play:** https://kenjacinto1028-afk.github.io/racing-team-manager/

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

## Phase 9: Tutorial and tooltip gaps ✅
- [x] 10-step guided tour (skippable, replay from sidebar, Esc / arrow keys)
- [x] Tooltips: race controls (pause, speed, skip, driver mode, commentary, tyre cliff), Pos and Age headings, sidebar hints

## v2 roadmap (details in `docs/ROADMAP.md`)

## Phase 10: Foundations (Opus)
- [ ] History archive saved at each season end
- [ ] Migrate old saves instead of resetting them
- [ ] Week numbers on the calendar

## Phase 11: Economy and finances (Opus engine, Sonnet screens, Haiku data)
- [ ] Sponsor deals with goals (title sponsor + 2-3 smaller)
- [ ] Pay drivers (bring their own money)
- [ ] Contract talks: salary, length, win/podium bonuses, counter-offers
- [ ] Firing with settlement and morale hit
- [ ] Scout staff role (reveals true potential)
- [ ] Finance screen: breakdown, forecast, balance chart
- [ ] Optional budget cap in Prime

## Phase 12: Cars, parts and setup (Opus engine, Sonnet screens, Haiku data)
- [ ] Car concepts with pros and cons (low-drag, high-downforce, balanced, tyre-friendly)
- [ ] Parts with trade-offs feeding the 4 car ratings
- [ ] Weekend setup (wing level, suspension)
- [ ] Part wear and grid penalties
- [ ] R&D projects that take several races
- [ ] Balance check over 100+ races

## Phase 13: Driver and staff development (Opus engine, Sonnet screens, Haiku data)
- [ ] Training plans and race experience
- [ ] Driver traits
- [ ] Morale
- [ ] Youth academy
- [ ] Staff growth and courses
- [ ] Facilities (factory, simulator, gym)

## Phase 14: Career pages and trophies (Sonnet)
- [ ] Driver and staff profile pages with season-by-season history
- [ ] Trophy cabinet and personal records
- [ ] Team history page
- [ ] Click any name to open its profile

## Phase 15: World records and feats (Sonnet, Haiku data)
- [ ] Record book (all leagues, all seasons)
- [ ] Track records
- [ ] Player feats and badge wall
- [ ] Record-broken alerts

## Phase 16: More leagues (Opus engine, Sonnet screens, Haiku data)
- [x] Decide: 5-tier ladder + side championships for tiers 3-5
- [x] Decide: new games start in tier 5 (Formula Rookie)
- [ ] Add Formula Regional (tier 4) and Formula Rookie (tier 5)
- [ ] Side championships: Endurance Cup, Winter Series, Street Invitational
- [ ] League screens, new tracks and teams

---

## Known issues / notes
- Balance is first-pass. Watch whether Academy feels too easy or too hard over 2-3 seasons and tune `engine/performance.ts` and `data/leagues.ts`.
- Old drivers who drop out of the market stay in the save file (small, but grows slowly over many seasons).
- `node_modules` can't be installed inside `/mnt/project-files` (that folder blocks the links npm needs). Run `npm install` in a normal folder; the project's source is synced to `/mnt/project-files`.
