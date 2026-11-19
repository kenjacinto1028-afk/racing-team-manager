# Racing Team Manager — Game Plan

A browser-based management game: run a racing team, hire drivers and staff, upgrade the car, and climb a three-tier league ladder through promotion and relegation.

The player (and project owner) is new to motorsport, so the game teaches racing as it goes: every stat and term has a tooltip, and there is a Glossary page.

---

## 1. Decisions locked in

| Topic | Decision |
|---|---|
| Platform | Web browser |
| Racing style | Open-wheel (single-seater) tier ladder |
| Race presentation | Live timing tower, 2D SVG track map and a commentary feed |
| Scope for v1 | Core loop first; expand later |
| Stack | Vite, React 18, TypeScript, Zustand (persisted to localStorage), Vitest |
| Visual style | Premium dark motorsport look: Barlow Condensed (display) and Inter (body), team-colour accents, generous spacing |

---

## 2. Racing 101 (why the game works this way)

- **Team:** 2 cars and 2 drivers, plus staff. You are the **team principal** (the boss).
- **Car:** rated on four things:
  - engine: speed on straights
  - aero: grip in corners
  - chassis: overall balance
  - reliability: how rarely it breaks down

  Money spent on **R&D** (research and development) raises these ratings.
- **Qualifying:** each driver sets a timed lap, and the order of those times becomes the **grid** (the starting order).
- **Race:** cars lap the track. **Tyres** wear out, so cars **pit** for fresh ones:
  - Soft: fast, but wears out quickly
  - Medium: in between
  - Hard: slow, but lasts a long time
- **DNF** ("did not finish"): the car broke down or crashed.
- **Points:** the top 10 finishers score 25-18-15-12-10-8-6-4-2-1.
- **Promotion and relegation:** at season end, the top 2 teams in each tier move up and the bottom 2 move down, like football leagues.

---

## 3. League ladder

The league names are made up, because real series names are trademarked.

| Tier | League | Teams | Races | Money |
|---|---|---|---|---|
| 1 | Formula Prime | 10 | 12 | Big budgets |
| 2 | Formula Challenger | 10 | 10 | Medium |
| 3 | Formula Academy | 10 | 8 | Tight (player starts here) |

---

## 4. Systems

### Drivers
- **Stats (0–100):**
  - pace: raw speed
  - consistency: smaller lap-time spread and fewer mistakes
  - racecraft: overtaking and defending
  - tyre management: slower tyre wear
  - experience
- **Age and potential:** under-25s grow toward their potential, and over-32s decline.
- **Contract:** salary per race and years remaining. Hiring a driver costs a **signing fee**.
- **Driver market:** free agents, refreshed each season.

### Staff
The team has one of each role. Each role has a rating (0–100) and a salary.

| Role | Effect |
|---|---|
| Race Engineer | Better car setup, so faster laps |
| Chief Mechanic | Better reliability, so fewer DNFs |
| Pit Crew Chief | Shorter pit-stop time |
| Technical Director | R&D is cheaper and gives bigger gains |

### Car and R&D
- Four ratings: engine, aero, chassis and reliability.
- Each upgrade costs money, and each further level costs more.
- Every track has a **profile** (power, downforce, tyre wear, overtaking difficulty) that decides which car ratings matter most there.

### Money
- **Income:**
  - sponsor pay per race, scaled by tier and championship position
  - prize money at season end
- **Costs:** driver and staff salaries, R&D and signing fees.
- A balance below zero for 2 races in a row means **game over** (bankruptcy).

### AI teams
- Generated drivers, staff and cars, scaled to their tier.
- Between seasons they upgrade according to budget, and they replace drivers who retire.
- They follow the same promotion and relegation rules as the player.

---

## 5. Race simulation

The engine is pure TypeScript and uses a seeded RNG, so the same seed always produces the same race.

**Lap time** =
- the track's base time
- − car performance, weighted by the track profile
- − driver pace and setup bonus
- \+ tyre wear penalty, depending on compound and tyre age
- \+ fuel load, which gets lighter each lap
- \+ a random spread that shrinks as consistency rises
- ± driver mode: push is faster but wears tyres more; conserve is slower but saves them

**Other rules:**
- **Overtaking:** when a car is within about 0.8 s of the car ahead, it rolls racecraft (attacker vs. defender) against the track's overtaking difficulty.
- **Pit stop:** costs pit-lane time plus a stop time based on the Pit Crew Chief. **Each car must make at least one stop.**
- **DNF:** a small chance each lap, based on car reliability and the Chief Mechanic.
- **Qualifying:** one simulated lap per driver on fresh softs, which sets the grid.

**Player controls during the race:**
- Pit now, choosing the next compound
- Driver mode: push, normal or conserve
- Speed: 1×, 4× or 16×, or skip to the end

**AI strategy:** pits once tyre wear crosses a threshold.

---

## 6. Screens

1. **New Game:** team name, primary and secondary colours, and a starting driver pick.
2. **HQ Dashboard:** next race, budget, standings snapshot, and alerts such as an expiring contract or a missing staff role.
3. **Drivers and Market:** your drivers' stats and contracts; hire and release.
4. **Staff:** current staff and the market.
5. **Car / R&D:** the four ratings and upgrade buttons with their costs.
6. **Calendar and Standings:** race list and team and driver tables.
7. **Race Weekend:** qualifying, then the live race (timing tower, track map, commentary, controls), then results and payouts.
8. **Season Review:** final table, promotion and relegation, contract renewals and driver ageing.
9. **Glossary:** every racing term in plain English.

---

## 7. File layout

```
racing-manager/
  CLAUDE.md               project instructions
  PROGRESS.md             live checklist
  docs/PLAN.md            this file
  docs/DECISIONS.md       decision log
  docs/SESSION_LOG.md     what each work session did
  src/
    engine/      types.ts, rng.ts, generate.ts, qualifying.ts, raceSim.ts, season.ts, finance.ts
    engine/__tests__/
    data/        leagues.ts, tracks.ts, names.ts, glossary.ts
    store/       gameStore.ts
    ui/screens/  one file per screen
    ui/components/  TimingTower, TrackMap, StatBar, Tooltip, Card, ...
    styles/      theme.css
```

---

## 8. Build phases

| # | Phase | Done when |
|---|---|---|
| 1 | Scaffold | `npm run dev` shows the themed app shell with navigation |
| 2 | Engine core | Types, RNG, generators, season and finance logic, with passing tests |
| 3 | Race sim | Qualifying and lap-by-lap race, with passing tests |
| 4 | Store | Zustand store persists and reloads a save |
| 5 | Management screens | HQ, Drivers, Staff, Car and Standings all work |
| 6 | Race weekend UI | Live race with map, tower and controls plays to the finish |
| 7 | Season loop | Season Review applies promotion and relegation, then a new season starts |
| 8 | Teach and polish | Glossary, tooltips everywhere, visual polish |

---

## 9. Verification

`npm test` must check that:
- the same seed always gives the same result
- points add up
- promotion and relegation move the right teams
- finances update correctly
- across 100 races, a fast car with a strong driver usually beats a slow one

Then play it in the browser:
- create a team, hire, upgrade
- run a full race and see pit stops and overtakes
- simulate the rest of the season
- check promotion or relegation
- reload the page to confirm the save persists
- check the console for errors

---

## 10. Later (after v1)

- Sponsors with goals
- Youth academy
- R&D tree
- Weather
- Safety cars
- Multiple save slots
- Driver morale
- Endurance and touring series
