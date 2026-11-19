# Decision Log

Record every design or technical decision here, newest first, so future sessions don't re-open settled questions.

| Date | Decision | Why |
|---|---|---|
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
| 2026-11-19 | Old saves with a different `saveVersion` are reset, not migrated (for now) | No real saves exist yet |
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
