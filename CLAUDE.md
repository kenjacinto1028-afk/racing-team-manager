# Racing Team Manager: Project Instructions

## What this is
A browser racing **team management** game. The player runs a team, hires drivers and staff, upgrades the car, and climbs a 3-tier league ladder through promotion and relegation. The full design is in `docs/PLAN.md`.

## Who you're working with
- The owner is **new to motorsport**. Explain racing terms in plain English the first time they come up, and suggest realistic ideas.
- Keep replies **short**. Explain more only when asked.
- **Ask before** committing, pushing, publishing or sharing anything.

## Start of every session
1. Read `PROGRESS.md` to see the current phase and what's next.
2. Skim the latest entry in `docs/SESSION_LOG.md`.
3. Check `docs/DECISIONS.md` before changing any design choice. Don't re-open settled decisions without asking.

## End of every session
1. Tick the finished items in `PROGRESS.md` and update **Current phase** and **Last updated**.
2. Add a short entry at the top of `docs/SESSION_LOG.md`: what was done and what comes next.
3. Log any new decision in `docs/DECISIONS.md`.

## Stack
- Vite, React 18, TypeScript (strict)
- Zustand with the `persist` middleware, saving to localStorage
- Vitest for tests
- No backend. No UI framework; use hand-written CSS with design tokens in `src/styles/theme.css`.

## Setup
```
npm install react@18.3.1 react-dom@18.3.1 zustand@4.5.5
npm install -D vite@5.4.11 @vitejs/plugin-react@4.3.4 typescript@5.6.3 vitest@2.1.8 @types/react@18.3.12 @types/react-dom@18.3.1
npm run dev     # http://localhost:5173
npm test        # vitest run
```

## Architecture rules
- **`src/engine/` is pure TypeScript.** It never imports React or the store, and has no DOM access.
- **All randomness goes through `engine/rng.ts`,** which is seeded. Never call `Math.random()` in engine code.
- **Engine functions are pure:** state goes in and new state comes out. The store calls the engine; the UI calls the store.
- **Static content lives in `src/data/`:** leagues, tracks, names, glossary.
- **UI:** screens go in `src/ui/screens/`, reusable pieces in `src/ui/components/`.
- Bump a `saveVersion` in the store whenever the save shape changes, and migrate old saves or reset them.

## Game rules (canonical; see PLAN.md for detail)
- 3 tiers, highest first:
  - Formula Prime: 12 races
  - Formula Challenger: 10 races
  - Formula Academy: 8 races. The player starts here.
- 10 teams per tier, 2 cars per team.
- Points for the top 10: 25-18-15-12-10-8-6-4-2-1.
- Top 2 teams promoted, bottom 2 relegated.
- Each car must make at least one pit stop per race. Tyre compounds: soft, medium, hard.
- Bankruptcy: a balance below 0 for 2 races in a row.

## Design standard
- The look must be **premium**: dark motorsport theme, Barlow Condensed for display text, Inter for body text, team-colour accents, generous spacing, refined tables and stat bars. No generic defaults.
- Every stat and racing term gets a tooltip that explains it simply.
- The layout must work down to about 1024 px wide. Desktop-first is fine.

## Quality bar
- Add or update tests for any engine change, and keep `npm test` green.
- Before calling a UI phase done, play it in the browser preview and check the console for errors.
- Balance check: across 100 simulated races, the stronger car and driver should usually win, but not always.
