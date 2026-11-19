# Roadmap: v2 updates

The plan for the next big updates, in build order. Each phase is small enough for one or two work sessions.

**Model guide** (to save tokens):
- **Opus**: engine rules, maths and balance (anything in `src/engine/`).
- **Sonnet**: screens, tables, tooltips (`src/ui/`).
- **Haiku**: lists of content: names, sponsors, parts, glossary entries, achievements (`src/data/`).

Owner's rule: always pick whichever model can do the job with the fewest tokens. The labels per phase are a starting point; drop to a cheaper model for any step that doesn't need the bigger one.

Most phases have an engine part and a screen part. Do the engine part first with Opus, then switch to Sonnet for the screens, and use Haiku for the data files.

---

## What already exists (v1)
- Money: sponsor pay per race, prize money, salaries, signing fees, release cost, bankruptcy.
- People: driver market and staff market (4 roles), hire and release, contract renewals at season end.
- Car: 4 ratings (engine, aero, chassis, reliability) with R&D upgrades that get pricier.
- Development: young drivers grow toward a hidden "potential" each winter, veterans decline and retire. Staff never change.
- History: only the current season's results are kept. Past seasons are thrown away.

That last point matters: careers, trophies and records (areas c and d) need a history archive first, so it comes early (Phase 10).

---

## Phase 10: Foundations (Opus)
Groundwork the later phases need. No big visible change.
- **History archive:** at each season end, save a short summary: final tables, champions, each driver's and staff member's season line (team, races, wins, podiums, points). Kept compact so the save stays small.
- **Save upgrades instead of resets:** the game is live now, so real saves exist. From here on, old saves get migrated to the new shape instead of wiped.
- **Calendar dates:** each race gets a week number, so sponsors and training can run "per week" or "per race".
- Depends on: nothing. Blocks: Phases 13 to 16.

## Phase 11: Economy and finances (area a)
**Ideas from real racing**
- **Sponsor deals:** a title sponsor (big money, your car carries their name), plus 2 to 3 smaller sponsors. Each has a goal, for example "finish top 5 in the standings" or "score points in 6 races". Hit it for a bonus, miss it and they may leave.
- **Pay drivers:** some drivers bring their own sponsor money in exchange for a seat. Common in junior series. Cheap car, weaker driver.
- **Finance screen:** income and costs per race, a season forecast ("at this rate you'll have $X at season end"), and a chart of the balance.
- **Contract talks:** offer a salary, length and bonuses (per win, per podium). The driver accepts, refuses or counters.
- **Firing:** release a driver or staff member mid-contract and pay the rest of their contract as a settlement (already partly in v1). Morale of the team dips a little.
- **Scouting:** hire a Scout (5th staff role). Better scouts show a driver's true potential instead of a rough range.
- **Budget cap** (optional, Prime only): a spending limit per season, like real top-level racing.

**Scope:** engine (sponsors, negotiation, scouting) with **Opus**; Finance and Sponsors screens with **Sonnet**; sponsor names and goals list with **Haiku**.
**Depends on:** Phase 10 (save migration).

## Phase 12: Cars, parts and setup (area b)
**Ideas from real racing**
- **Car concepts:** at the start of each season pick a chassis design. Each has pros and cons:
  - Low-drag: fast on straights, weak in corners.
  - High-downforce: great in corners, slow on straights.
  - Balanced: no weakness, no strength.
  - Tyre-friendly: gentle on tyres, a bit slower per lap.
- **Parts with trade-offs:** engine, gearbox, front wing, rear wing, floor, suspension, brakes. Each part comes in versions, for example "Lightweight gearbox: +speed, -reliability". The parts feed the 4 car ratings the race sim already uses.
- **Weekend setup:** before a race, set wing level (more grip in corners vs more top speed) and suspension (soft or stiff). Matching setup to the track gives a small bonus.
- **Part wear:** engines and gearboxes wear out over races. Use too many in a season and you take a grid penalty (start further back), as in real racing.
- **R&D projects:** new parts take a few races to design and cost money up front. A better Technical Director makes them faster.

**Scope:** engine (parts, setup bonus, wear, projects) and balance testing with **Opus**; Car screen redesign and setup panel with **Sonnet**; parts catalogue with **Haiku**.
**Depends on:** Phase 10. Works best after Phase 11 (parts cost money).

## Phase 13: Driver and staff development (area f)
**Ideas from real racing**
- **Training plans:** between races, pick a focus per driver: pace, racecraft, tyre care or fitness. Slow, steady gains.
- **Race experience:** drivers improve a little from every race, more from good results.
- **Traits:** small strengths and quirks, for example "Rain master", "Tyre whisperer", "Strong starter", "Hot-headed" (more crashes). Drivers can gain traits over a career.
- **Morale:** wins, team orders and pay raise or lower morale. Low morale means slower laps and wanting to leave.
- **Youth academy:** sign 2 to 3 teenagers cheaply and grow them into future stars.
- **Staff growth:** staff now improve with experience and can be sent on courses (costs money).
- **Facilities:** upgrade the factory, simulator and gym. Slow, expensive, permanent boosts to development.

**Scope:** growth rules and balance with **Opus**; training and academy screens with **Sonnet**; trait list with **Haiku**.
**Depends on:** Phase 10. Phase 11 for costs.

## Phase 14: Career pages, trophies and records (area c)
**Ideas from real racing**
- **Profile page for every driver and staff member:** photo-style card, current stats, stat history chart, season-by-season table (team, league, wins, podiums, points, final position).
- **Trophy cabinet:** championships, race wins, promotions, for your team and each person.
- **Personal records:** best finish, most points in a season, longest points streak.
- **Team history page:** every season you've played, where you finished, who drove.
- Click any name in any table to open their profile.

**Scope:** mostly screens with **Sonnet**; the stats-from-history helper functions with **Opus** (small).
**Depends on:** Phase 10 (history archive). Better after Phase 13 (stat history to chart).

## Phase 15: World records and feats (area d)
**Ideas from real racing**
- **Record book** across every league and season: most wins, most titles, youngest winner, oldest winner, most podiums, biggest win margin.
- **Track records:** fastest lap ever at each track, with who set it and when.
- **Feats (achievements) for the player:** "Win from last on the grid", "Back-to-back promotions", "Win a race with a one-stop on hards", "Survive a season with $0 in the bank". A badge wall shows unlocked and locked feats.
- **Live alerts:** commentary and HQ shout when a record falls during a race.

**Scope:** record and feat detection with **Sonnet** (simple checks); record book and badge wall screens with **Sonnet**; feat list with **Haiku**.
**Depends on:** Phase 10 and Phase 14.

## Phase 16: More leagues (area e)
**Decided:** a 5-tier ladder plus side championships for the lower tiers.

**Ladder (top to bottom)**
| Tier | League | Races | Notes |
|---|---|---|---|
| 1 | Formula Prime | 12 | unchanged |
| 2 | Formula Challenger | 10 | unchanged |
| 3 | Formula Academy | 8 | unchanged |
| 4 | Formula Regional (new) | 7 | smaller budgets, older cars |
| 5 | Formula Rookie (new) | 6 | entry level, tiny budgets, teenage drivers |

Same rules on every tier: 10 teams, top 2 up, bottom 2 down.

**Side championships (tiers 3 to 5 only)**
In real racing, junior teams often enter extra series to earn money and give drivers mileage.
- **Endurance Cup:** a few long races where 2 to 3 drivers share one car in turns.
- **Winter Series:** a short off-season series (3 to 4 races) with prize money, good for testing young drivers.
- **Street Invitational:** a one-off race on a city street track, big prize, high crash risk.

Entering costs an entry fee and adds salaries and wear, so it's a choice, not free money. Once a team reaches Challenger or Prime, side series are closed to it.

**Decided:** new games start in tier 5 (Formula Rookie). Existing saves keep their current tier.

**Scope:** 5-tier rules, side-series calendar and the save upgrade with **Opus**; league screens with **Sonnet**; new tracks, teams and names with **Haiku**.
**Depends on:** Phases 10 to 12.

---

## Order at a glance

| # | Phase | Area | Main model | Size |
|---|---|---|---|---|
| 10 | Foundations | groundwork | Opus | S |
| 11 | Economy and finances | a | Opus + Sonnet | L |
| 12 | Cars, parts and setup | b | Opus + Sonnet | L |
| 13 | Driver and staff development | f | Opus + Sonnet | M |
| 14 | Career pages and trophies | c | Sonnet | M |
| 15 | World records and feats | d | Sonnet + Haiku | S |
| 16 | More leagues | e | Opus + Sonnet | L |

After each phase: run 100+ simulated races to check balance, play it in the browser, then ask before pushing (a push updates the live game).
