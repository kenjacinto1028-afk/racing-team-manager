# Progress

**Current phase:** QoL: record book upgrade built (not pushed yet). Before that: live race screen upgrade is live. Next: visual effects (Kenneth to pick) and sound
**Last updated:** 2026-11-23
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

## Phase 10: Foundations ✅
- [x] History archive saved at each season end (`engine/history.ts`)
- [x] Migrate old saves instead of resetting them (`store/migrations.ts`, save v2)
- [x] Week numbers on the calendar

## Phase 11: Economy and finances ✅
- [x] Sponsor deals with goals (title sponsor + up to 3 partners) (`engine/sponsors.ts`, `data/sponsors.ts`)
- [x] Pay drivers (bring their own money)
- [x] Contract talks: salary, length, win/podium bonuses, counter-offers
- [x] Firing with settlement and morale hit (drivers and staff); team morale
- [x] Scout staff role (narrows the potential estimate) (`engine/scouting.ts`)
- [x] Finance screen: overview, balance chart with forecast, sponsors, ledger
- [x] Optional budget cap in Prime (Finance > Overview)

## Phase 12: Cars, parts and setup ✅
- [x] Car concepts with pros and cons (low-drag, high-downforce, balanced, tyre-friendly) (`engine/car.ts`)
- [x] Parts with trade-offs feeding the 4 car ratings (`data/parts.ts`, 7 slots)
- [x] Weekend setup (wing level, suspension) on the Race Weekend screen
- [x] Engine and gearbox wear, allowances and grid penalties
- [x] R&D projects that take several races (2 at a time)
- [x] Balance check over 120 races (`car.test.ts`)

## Phase 13: Driver and staff development ✅
- [x] Training focus per driver and race experience (`engine/development.ts`)
- [x] Driver traits (8, in `data/traits.ts`)
- [x] Driver morale (unhappy drivers won't renew)
- [x] Youth academy (3 places, promote at 17, leave at 19)
- [x] Staff growth and courses
- [x] Facilities (factory, simulator, gym; 5 levels each)
- [x] New Development screen (Training, Youth academy, Facilities)

## Phase 14: Career pages and trophies ✅
- [x] Driver and staff profile pages with season-by-season history and a rating chart (`ui/screens/Profile.tsx`, `engine/careers.ts`)
- [x] Trophy cabinet and personal records
- [x] Team history page (History screen: your team + all past champions)
- [x] Click any name to open its profile (Standings, HQ, Drivers, Staff, Race, Season Review)

## Phase 15: World records and feats ✅
- [x] Record book (all leagues, all seasons) (`engine/records.ts`, Records screen)
- [x] Track records (fastest lap ever at each track)
- [x] Player feats (18) and badge wall (`data/feats.ts`, `engine/feats.ts`)
- [x] Record-broken alerts: race results headlines, HQ alerts, live "lap record pace" banner
- [x] Save v6 (old saves seed records from the current season)

## Phase 16: More leagues ✅
- [x] Decide: 5-tier ladder + side championships for tiers 3-5
- [x] Decide: new games start in tier 5 (Formula Rookie)
- [x] Add Formula Regional (tier 4, 7 races) and Formula Rookie (tier 5, 6 races)
- [x] Side championships: Endurance Cup, Winter Series, Street Invitational (`engine/sideSeries.ts`)
- [x] Leagues screen (ladder + side series), 3 new tracks, 20 new teams
- [x] Save v7: old saves keep their league and gain the two new ones

---

## Known issues / notes
- Balance is first-pass. Watch whether Academy feels too easy or too hard over 2-3 seasons and tune `engine/performance.ts` and `data/leagues.ts`.
- Old drivers who drop out of the market stay in the save file (small, but grows slowly over many seasons).
- `node_modules` can't be installed inside `/mnt/project-files` (that folder blocks the links npm needs). Run `npm install` in a normal folder; the project's source is synced to `/mnt/project-files`.

## QoL updates
- [x] Highlight your team's drivers and team in every ranking table (live timing tower, commentary, qualifying, results, standings, side series, calendar winners, records)
- [x] Live race screen upgrade: bigger map with car numbers, clearly different team colours, wide two-lane road, chequered start/finish line, pit lane with garages, sector lines, battle rings; lap column in the timing list; live Team battle list; new layout
- [x] Push the live race screen upgrade to the live game
- [x] Record book upgrade: top 20 fastest laps per track (one lap per driver, kept per league), league filter on the record book and track records, track picker, sortable tables. Save v8 (`trackTop`).
- [ ] Visual effects elsewhere (start lights, confetti, count-ups, etc.): waiting for Kenneth to pick
- [ ] Sound: engine sound made in the browser, free CC0 effects, mute and volume control
