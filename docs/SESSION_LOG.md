# Session Log

Add one entry at the end of each work session, newest first.

---

## 2026-11-19: Phase 8 Teach and polish
- Glossary screen (search + category tabs, 60 terms). Tooltip sweep: ratings, KPIs, staff "vs yours", race controls. Alt+←/→ for back/forward. Favicon, page fade-in, reduced-motion support.
- Fixed: hidden tooltips caused sideways scrolling; tooltips stuck open after clicking; layout at 1024 px (tables scroll inside their card).
- Full browser playthrough: new team → hire staff → upgrade → live race with pit stops → 8-race season → Season Review with renewals → season 2 → reload keeps the save. No console errors. 55 tests passing, production build OK.
- **Next:** playtest and tune balance; then ideas from "Later" in PLAN.md (sponsor goals, safety cars, weather, save slots).

## 2026-11-19: Phase 7 Season loop
- Season Review screen: promoted/relegated/stayed headline, prize money, final tables for all 3 leagues with up/down markers, drivers' champion, contract renewals (1-3 years, priced for next season's league), "Start season N" button. HQ shows a welcome-back banner after the break.
- Balance pass: added "weekend form" (each driver/car has a good or bad weekend) and narrowed the gap between top and bottom teams. Academy now averages 3-4 different race-winning teams per season, the champion ~220 pts, and the starting player team ~28 pts without upgrades.
- Played season 1 into season 2 in the browser with no console errors. 55 tests passing.
- **Next:** Phase 8, Glossary screen, tooltip sweep, visual polish, full playthrough.

## 2026-11-19: Phase 6 Race weekend UI
- Race Weekend screen: pre-race track briefing, qualifying table with starting-tyre choice, live race (SVG track map with moving cars, timing tower with interval/gap toggle, tyre badges, pit wall per driver with tyre wear, mode and pit buttons, commentary feed with a "my team" filter, pause/1×/4×/16×/skip), results with grid gains and payout.
- Fixed: race clock ran laps back to back; duplicate driver surnames (now unique where possible).
- Played a full 8-race season in the browser with no console errors.
- **Next:** Phase 7, season loop (Season Review, renewals, new season).

## 2026-11-19: Phase 5 Management screens
- New Game (name, colours, livery preview, optional lead-driver pick), HQ Dashboard (KPIs, alerts, standings snapshot, next track, drivers, money log), Drivers (cards + sortable/filterable market), Staff (role cards + market by role tabs), Car / R&D (upgrades vs league average), Standings (all 3 leagues: teams, drivers, calendar).
- Shared components: Tip (glossary tooltips), StatBar, sortable DataTable, Tabs, ConfirmButton, flash messages. `data/glossary.ts` added early for tooltips. Team colour becomes the app accent.
- Fixed an exploit: star drivers and staff now ask for salaries at their own level, and stars refuse to drop more than one league.
- Checked in the browser: all screens render, back/forward work, save survives reload, no console errors. 55 tests passing.
- **Next:** Phase 6, race weekend UI.

## 2026-11-19: Phase 4 Store
- Added `store/gameStore.ts`: Zustand + persist (`saveVersion` 1, old saves reset). Actions for new game (with starting-driver pick), hire/release drivers, hire staff, upgrades, qualifying, live race (tick, pit, mode, speed, skip), finish race, contract renewals and end of season.
- Engine additions: `engine/market.ts` (hiring, release costs) and `engine/offseason.ts` (other leagues kept in step with the player's, prize money, promotion/relegation, contracts, ageing, new talent, AI teams refill and upgrade, new calendars).
- 54 tests passing, including save → reload and a full season into season 2.
- **Next:** Phase 5, management screens.

## 2026-11-19: Phase 3 Race simulation
- Added `engine/performance.ts` (lap-time model: car vs track profile, driver pace, engineer, tyres, fuel, mode, random spread, DNF and pit-stop odds), `engine/qualifying.ts`, `engine/raceSim.ts` (lap-by-lap `stepLap` with player orders, overtaking fights, pit stops, DNFs, commentary events, AI pit strategy, mandatory stop) and `engine/raceSetup.ts` (build a weekend from the game state, auto-race AI leagues).
- Tuned: ~40 overtakes, ~1.5 DNFs and ~1 stop per car per race; the strongest car wins most but not all races.
- 40 tests passing.
- **Next:** Phase 4, Zustand store.

## 2026-11-19: Phase 2 Engine core
- Added `engine/types.ts`, seeded `engine/rng.ts` (mulberry32 + `hashSeed`), `engine/generate.ts` (world, teams, drivers, staff, cars scaled per tier), `engine/season.ts` (points, standings with countback, promotion/relegation, ageing/retirement), `engine/finance.ts` (sponsors, salaries, points bonus, prize money, bankruptcy, R&D upgrades).
- Data: `data/leagues.ts` (money and stat ranges per tier), `data/tracks.ts` (12 fictional circuits with profiles and map shapes), `data/names.ts` (30 fictional teams, driver/staff names).
- 30 tests passing.
- **Next:** Phase 3, race simulation.

## 2026-11-19: Phase 1 Scaffold
- Installed all dependencies, added Vite, TypeScript and HTML setup, `theme.css` (dark motorsport look), and the app shell (sidebar, back/forward buttons, 7 placeholder screens).
- Checked in a browser: navigation and back/forward work, no console errors.
- `package.json` was missing, so it was recreated. `node_modules` can't live in `/mnt/project-files`, so work happens in `/home/user/racing-manager` and source is copied over.
- **Next:** Phase 2, engine core (types, seeded RNG, generators, season and finance logic, tests).

## 2026-11-19: Planning
- Explained racing basics and chose platform, style, race view and scope.
- Wrote `docs/PLAN.md`, `PROGRESS.md`, `docs/DECISIONS.md` and `CLAUDE.md`.
- Created `package.json`. The dependency install was interrupted, so `node_modules` is incomplete.
- **Next:** Phase 1. Re-run the install, then add the Vite config, theme and app shell.
