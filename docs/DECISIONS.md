# Decision Log

Record every design or technical decision here, newest first, so future sessions don't re-open settled questions.

| Date | Decision | Why |
|---|---|---|
| 2026-11-20 | Live race screen: map left (big), timing list + Team battle stacked on the right, driver cards under the map | Kenneth wanted the map bigger and team battle beside the driver rankings |
| 2026-11-20 | Car numbers come from a hash of the driver id (2-99, unique in the race) | Each driver keeps the same number across races without a save change |
| 2026-11-20 | Race colours: two teams closer than a set colour distance get a palette colour instead; the player always keeps their own | Every team must be easy to tell apart on the map |
| 2026-11-20 | Map spreads bunched cars into rows of two (shown slightly apart) | Keeps every number readable in a train of cars; true order is in the timing list |
| 2026-11-19 | Side series money scales with your league's sponsor income; entry fee + running costs mean only a top-5 finish usually pays | A choice, not free money |
| 2026-11-19 | Side races are simulated instantly after the matching league round (Winter Series at season end), not watched live | Keeps the season moving; results show as headlines |
| 2026-11-19 | Endurance Cup: one car per team, the two drivers' skills averaged | Simple way to model drivers sharing a car |
| 2026-11-19 | Old saves get the two new leagues added below; their team stays where it is | Matches the "existing saves keep their tier" decision |
| 2026-11-19 | All-time race records (lap per track, youngest/oldest winner, biggest margin) are stored in the save; career records stay computed from the archive | Lap times aren't in the archive; the rest already is |
| 2026-11-19 | The first race at a track sets its record quietly; only later beats are announced | Avoids a flood of "new record" alerts in season 1 |
| 2026-11-19 | Records get their own sidebar screen; History stays for teams and champions | Easier to find, keeps History focused |
| 2026-11-19 | Careers, trophies and records are computed from the season archive plus the live season, not stored separately | One source of truth; no save change |
| 2026-11-19 | Profiles open through the nav history (a 'profile' screen with a driver/staff/team id) | Back/Forward work like any other screen |
| 2026-11-19 | Driver growth comes from per-race training plus the existing winter jump, capped at potential | Visible progress during a season |
| 2026-11-19 | Driver morale stacks with team morale (each worth up to ~±0.1 s/lap) | Small, but felt over a race |
| 2026-11-19 | Unsigned youth prospects are deleted at season end | Keeps the save from growing |
| 2026-11-19 | AI teams get facility levels 0-3 from team strength; they don't build more | Keeps AI simple |
| 2026-11-19 | Parts add to the base ratings (effective car); quick stat upgrades stay | Keeps v1 R&D working; parts add choices |
| 2026-11-19 | Engine/gearbox wear and grid penalties are per team, not per car | Half the UI, same decision |
| 2026-11-19 | Setup is one per team (wing + suspension), hinted by a race engineer rated 50+ | Gives the engineer a visible job |
| 2026-11-19 | Concept effect is about ±0.2 s/lap on extreme tracks; locked after round 1 | Meaningful, never decisive |
| 2026-11-19 | Player sponsor money comes from deals (title ~60%, partners ~15% each of the league's sponsor rate); AI teams keep the position-based formula | Player gets choices; AI stays simple |
| 2026-11-19 | Missed sponsor goal: 60% chance the sponsor leaves at season end | A miss hurts but isn't certain |
| 2026-11-19 | Pay drivers have a negative salary in their contract | Reuses all salary code; no signing fee |
| 2026-11-19 | Drivers accept offers worth 98%+ of their ask, counter from 80%, refuse below; bonuses valued by expected win/podium rate | Simple, readable talks |
| 2026-11-19 | Budget cap is off by default, Prime only, $15M of R&D and signing fees per season, applies to AI too | Optional, matches real top-level racing |
| 2026-11-19 | Team morale (20-95) is team-wide for now; driver morale comes in Phase 13 | Firing needed a cost now |
| 2026-11-19 | Owner approved Phases 10-16. Always use the model that spends the fewest tokens for each step | Owner's choice |
| 2026-11-19 | Once Phase 16 is built, new games start in tier 5 (Formula Rookie); existing saves keep their tier | Longer climb to the top |
| 2026-11-19 | Phase 16: expand to a 5-tier ladder (new Formula Regional and Formula Rookie below Academy) and add side championships for tiers 3-5 only. Replaces the 3-tier rule once built | Owner's choice: a longer climb plus extra events for junior teams |
| 2026-11-19 | v2 build order: Foundations, Economy, Cars/parts, Development, Careers, Records, More leagues (`docs/ROADMAP.md`) | Careers and records need a history archive; new leagues touch everything, so they go last |
| 2026-11-19 | Model split: Opus for engine/balance, Sonnet for screens, Haiku for data/content | Saves tokens |
| 2026-11-19 | New car parts feed the existing 4 car ratings rather than replacing them | Keeps the race sim and its tests working |
| 2026-11-19 | Hosted on GitHub Pages, deployed by GitHub Actions on every push to `main` | Free, public play link that updates itself |
| 2026-11-19 | Tooltips open on hover or keyboard focus only (not mouse click) | Stops tooltips sticking open on buttons |
| 2026-11-19 | Below 1200 px wide, wide tables scroll inside their card | Keeps the page itself from scrolling sideways at 1024 px |
| 2026-11-19 | Each driver gets a random "weekend form" (±~0.3 s/lap) shared by qualifying and the race | Underdogs can win on their day; seasons aren't decided by the grid alone |
| 2026-11-19 | Contract renewals are priced for the league the team races in next season | Promotion brings higher wage demands, as in real life |
| 2026-11-19 | One lap takes 3 s at 1× (about 1.5 min per race; 6 s at 16×) | Watchable without dragging |
| 2026-11-19 | AI never makes pit calls for the player's cars (except the forced mandatory stop) | The player owns their strategy |
| 2026-11-19 | Drivers and staff are priced at their own level, not the hiring team's league; star drivers refuse to drop more than one league | Stops buying a Prime star for Academy money |
| 2026-11-19 | Destructive buttons (release, new game) use a two-click confirm, no browser pop-ups | Safer, and pop-ups block the browser preview |
| 2026-11-19 | The other two leagues race in the background, kept in step with the player's league | Their tables are live all season and finish together |
| 2026-11-19 | Between seasons every car drifts 20% back toward its tier average | Rivals develop too; stops stats inflating to 99 |
| 2026-11-19 | Player contracts that run out are lost unless renewed in the Season Review | Gives a real decision each off-season |
| 2026-11-19 | Old saves are upgraded step by step (`store/migrations.ts`); only unknown or future versions reset | The game is live, real saves exist |
| 2026-11-19 | Season history keeps summaries only (tables, champions, per-person season lines), not every race result | Keeps the save small over many seasons |
| 2026-11-19 | Race weeks are spread evenly from week 10 to week 46, same pattern every season | Simple, predictable base for per-week sponsors and training |
| 2026-11-19 | Race runs lap by lap (`stepLap`); each lap uses its own derived seed | The live race view and a full skip give identical results |
| 2026-11-19 | A car that hasn't pitted is called in automatically one lap before the end | Enforces the one-stop rule without the player losing the race |
| 2026-11-19 | No lapped traffic or safety cars in v1 | Keeps the sim simple; safety cars are on the "Later" list |
| 2026-11-19 | Ties in standings broken by countback (most wins, then most 2nds...) | Matches real championships |
| 2026-11-19 | Sponsors pay per race, x1.4 for P1 down to x0.7 for P10, plus a bonus per point | Rewards results every race, not just at season end |
| 2026-11-19 | R&D upgrades get 35% pricier each time the same stat is upgraded in a season; a better Technical Director makes them cheaper and bigger | Stops one stat being maxed out instantly |
| 2026-11-19 | Each race and season derives its own seed with `hashSeed` | Results are replayable without storing RNG state |
| 2026-11-19 | In-app navigation uses a simple history list, no router library | Only back/forward between screens is needed |
| 2026-11-19 | Develop in a local folder, sync source to the project folder | The project folder can't hold node_modules |
| 2026-11-19 | League names are fictional: Formula Academy, Challenger and Prime | Real series names (F1, F2, F3, F4) are trademarked |
| 2026-11-19 | Race engine is pure TypeScript with a seeded RNG | Testable, replayable, and separate from the UI |
| 2026-11-19 | Zustand persisted to localStorage | Simple saves with no backend |
| 2026-11-19 | Vite, React 18 and TypeScript | Fast to build, runs in any browser |
| 2026-11-19 | Core loop first, extras later | Keeps v1 finishable |
| 2026-11-19 | Live timing tower and 2D SVG track map | Exciting to watch without needing a game engine |
| 2026-11-19 | Open-wheel tier ladder (3 tiers, 10 teams each) | Fits the promotion/relegation idea |
| 2026-11-19 | Web browser platform | Easiest to build and share |

## 2026-11-23: Track leaderboards keep one lap per driver, top 20 per league
Top 20 per track per league (not overall), one best lap per driver. Reason: lower leagues are slower, so an overall top 20 would only show the top league. The "All" view shows the 20 fastest of the lot.
