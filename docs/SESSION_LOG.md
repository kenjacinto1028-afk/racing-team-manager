# Session Log

Add one entry at the end of each work session, newest first.

---

## 2026-11-20: QoL Live race screen upgrade
- Mockups approved first (saved in project files: `screenshots/race-map-mockup*.png`, `timing-tower-laps-mockup.png`, `live-race-screen-mockup.png`).
- Race map: number badge per car, clearly different team colours (look-alike colours swapped for a palette colour; your team keeps its own), wider road with two lanes so side-by-side cars show, bunched cars spread into rows of two, chequered start/finish line, pit lane outside the track with IN/OUT signs and team garages, sector lines, dashed rings on the 3 closest battles, YOU and P1 tags.
- Timing list: car number, full surname, LAP column (amber when lapped, PIT while in the pit lane), "+1 LAP" instead of a huge time gap.
- New Team battle list: points each team would score if the race ended now; rows slide when the order changes, with ▲/▼ for the change since last lap.
- Layout: map and your two driver cards on the left, timing list and team battle on the right, commentary full width. Below 1200 px the map goes full width.
- New `engine/raceView.ts` (car numbers, colours, laps down, team battle) with 6 tests. 125 tests pass; browser check at 1440 and 1024 px, all 15 tracks drawn, no console errors.
- **Next:** push live once approved; then visual effects (Kenneth to pick) and sound.

## 2026-11-20: QoL Highlight your drivers
- Your team's rows now stand out everywhere: team-colour tint, a bright edge bar, bold names. A lighter shade of the team colour keeps dark team colours visible.
- Live timing tower: your cars get a "YOU" tag and coloured names. Commentary lines about your team get an edge bar.
- Also highlighted: calendar rounds your team won, Records rows held by your team or drivers.
- 119 tests pass; browser check (qualifying, live race, results, standings), no console errors.
- Pushed live.
- **Next:** nothing planned.

## 2026-11-19: Phase 16 More leagues
- Five leagues now: Formula Rookie (6 races) and Formula Regional (7) sit below Academy. New careers start in Rookie with $400k. Old saves keep their league and get the two new ones.
- Side series for Academy, Regional and Rookie teams: Endurance Cup (3 double-length races, two drivers share one car), Street Invitational (one street race, big prize, more crashes), Winter Series (4 short races at season end, young drivers gain experience). Each has an entry fee and running costs.
- New Leagues screen: the ladder and the side series (enter, schedule, results, last season).
- 3 new tracks (Fjordbakken, Savanna Speedway, Docklands Street Circuit) and 20 new teams.
- History's Champions table now shows one column per league.
- 119 tests pass; browser check (new game and an old save), no console errors.
- **Next:** push Phases 11-16 to the live game once approved.

## 2026-11-19: Phase 15 World records and feats
- New Records screen (sidebar): Record book (most wins, podiums, points, starts, titles, best season, youngest/oldest winner, biggest winning margin), Track records (fastest lap ever per track), and a Feats badge wall.
- 18 feats for the player, e.g. win from 15th or lower, grand slam, one-two, back-to-back promotions, close shave with money.
- When a record falls: headlines on the race result, an HQ alert, and a purple "lap record pace" banner during the live race.
- Save version 6; old saves keep playing and fill in records from this season's races.
- 110 tests pass; browser check, no console errors.
- **Next:** Phase 16 More leagues.

## 2026-11-19: Phase 14 Career pages and trophies
- Profile pages for drivers, staff and teams: current stats, rating-by-season chart, season-by-season table (live season included), personal records (titles, wins, podiums, points, best finish, best season, points streak), trophy cabinet.
- History screen: your team's seasons and trophies (league titles, promotions, drivers' titles) plus a Champions table for every league and season.
- Names are clickable across the game; Back/Forward work between profiles.
- Season archive now also stores each driver's rating, best finish, points streak and age, and each staff member's rating (older archives just show less).
- 102 tests pass; browser check, no console errors.
- **Next:** Phase 15 World records and feats.

## 2026-11-19: Phase 13 Driver and staff development
- Training: pick a focus per driver (pace, racecraft, tyres, fitness, balanced). Each race a chance of +1, faster when young, slower near potential. Race experience grows too.
- Traits (8): tyre whisperer, strong starter, hot-headed, qualifying ace, street specialist, calm, mechanical sympathy, fast learner. ~30% of drivers start with one; more come after good seasons.
- Driver morale: points, beating the team-mate, DNFs and low pay move it; worth up to ±0.1 s/lap; below 35 they won't renew.
- Youth academy: 6 teenagers each season, sign up to 3, they train every race, promote from 17, leave at 19.
- Staff improve slowly under 50 and fade after 60; courses give +2 to +4 once per season.
- Facilities: factory (cheaper R&D), simulator (faster training), gym (fewer crashes); 5 levels, 3 races to build each.
- Development screen added. Save v5. 99 tests pass; browser checks on an old save and a new game, no console errors.
- **Next:** Phase 14 Career pages and trophies.

## 2026-11-19: Phase 12 Cars, parts and setup
- Car concept per season (balanced, low-drag, high-downforce, tyre-friendly): worth up to ~0.2 s/lap depending on the track; locked after round 1. AI picks one each winter.
- Parts: 7 slots, 14 alternative parts with trade-offs on the 4 ratings. Design them as R&D projects (cost up front, 1-4 races, 2 at a time, TD 70+ is a race quicker), then fit for free. AI sometimes designs one over the winter.
- Weekend setup: wing level and suspension; the ideal is worth -0.16 s/lap, a bad one +0.24. A race engineer rated 50+ tells you the ideal.
- Engine and gearbox wear: allowance per season (engine 1 per ~4 races, gearbox 1 per ~3); worn units break down more; extra units cost 5 / 3 grid places.
- Car screen redesigned with tabs: Overview, Parts, Quick upgrades, Engine & gearbox. Qualifying shows grid penalties.
- Save v4. 89 tests pass incl. a 120-race balance check; browser play of 3 races, no console errors.
- **Next:** Phase 13 Driver and staff development.

## 2026-11-19: Phase 11 Economy and finances
- Sponsors: title sponsor + up to 3 partners, each pays per race and has a season goal (team position, points finishes, podiums, wins). Goal met = bonus; missed = 60% chance they leave. New offers each season, better with a better finish. New games start with a title + 2 partners.
- Pay drivers (about 1 in 4 lower-league market drivers): bring money per race, no signing fee, fixed deals.
- Contract talks (Drivers > Talk): salary, length, win/podium bonuses; accept / counter / refuse.
- Firing drivers or staff pays a settlement and lowers team morale; morale (top bar) is worth up to ~0.1 s a lap.
- Scout (5th staff role) narrows the potential range; 85+ shows it exactly.
- Finance screen: KPIs, balance chart with season-end forecast, income/cost breakdown, sponsors tab, sortable ledger, optional Prime budget cap ($15M R&D + fees).
- Save v3 (old saves get sponsors, morale and scouts). 79 tests pass; browser check with an old save, no console errors.
- **Next:** Phase 12 Cars, parts and setup.

## 2026-11-19: Phase 10 Foundations
- History archive: at each season end the game keeps final tables, champions, and a season line for every driver (team, league, races, wins, podiums, points, position) and staff member. About 10 KB per season. Helpers `driverCareer` / `staffCareer` ready for Phase 14.
- Save upgrades: `store/migrations.ts` upgrades saves one version at a time (now v2). A v1 save loads with its career intact; only unknown versions reset.
- Calendar: each race has a week number (week 10 to 46), shown on Standings > Calendar and HQ.
- 64 tests pass. Browser check: loaded a v1 save, finished the season, history saved, no console errors. Not pushed.
- **Next:** Phase 11 Economy and finances.

## 2026-11-19: v2 roadmap
- Wrote `docs/ROADMAP.md`: 7 phases (10-16) covering economy, cars and parts, development, careers, records and more leagues, with model picks per phase. Added them to `PROGRESS.md`.
- Phase 16 decided: 5 tiers plus side championships for tiers 3-5. New games will start in tier 5. Still open: migrating saves instead of resetting (Phase 10).
- **Next:** Phase 10 Foundations with Opus.

## 2026-11-19: Tutorial and tooltip gaps
- Added a 10-step guided tour (`src/ui/components/Tutorial.tsx`, steps in `src/data/tutorial.ts`). Shows on first launch, can be skipped, replayed with "Replay tutorial" in the sidebar. "Seen" flag lives in its own localStorage key, so the save shape and `saveVersion` are unchanged.
- Filled tooltip gaps: race controls, commentary, tyre cliff, Pos/Age headings, sidebar hover hints; 7 new glossary entries.
- 55 tests pass, no console errors in the browser. Not pushed yet (waiting for approval).
- **Next:** push after approval, then playtest and balance.

## 2026-11-19: Published online
- Game pushed to GitHub (`kenjacinto1028-afk/racing-team-manager`) and published with GitHub Pages: https://kenjacinto1028-afk.github.io/racing-team-manager/
- `.github/workflows/deploy.yml` runs the tests, builds and deploys on every push to `main`. Vite `base` is `./` so it works under the Pages sub-path.
- Also published a private Claude link (single-file build in `play/racing-team-manager.html`): https://claude.ai/artifact/Nxc8j3XmR8xqzrBMDf91JX
- **Next:** playtest and tune balance.

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
