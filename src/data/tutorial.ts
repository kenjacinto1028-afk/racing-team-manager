import type { ScreenId } from '../ui/nav';

export interface TourStep {
  title: string;
  body: string;
  /** Screen to open for this step. */
  screen?: ScreenId;
  /** Matches a `data-tour` attribute. No target means a centred card. */
  target?: string;
  /** Extra bullet points. */
  points?: string[];
}

export const TOUR_STEPS: TourStep[] = [
  {
    title: 'Welcome, Team Principal',
    body: "You run a small racing team. Hire drivers, improve the car, and win enough points to climb from Formula Academy up to Formula Prime. This 1-minute tour shows you around. You can skip it now and replay it any time from the sidebar.",
    screen: 'hq',
  },
  {
    title: 'HQ Dashboard',
    body: 'Your home base. See your budget, league position, points and the next race. Check here first each week.',
    screen: 'hq', target: 'nav-hq',
  },
  {
    title: 'Drivers',
    body: 'Each car needs a driver. Every race needs two cars, so sign two. Browse the transfer market and compare stats. Click a column heading to sort, and hover any stat to see what it means.',
    screen: 'drivers', target: 'nav-drivers',
  },
  {
    title: 'Staff',
    body: 'Engineers and mechanics. They make pit stops quicker, the car more reliable and upgrades cheaper. Check the "Vs yours" column to see if a hire beats your current person.',
    screen: 'staff', target: 'nav-staff',
  },
  {
    title: 'Car / R&D',
    body: 'R&D means research and development: spending money to make the car faster. Engine helps on long straights, aero (air flow) helps in corners, chassis helps everywhere, reliability stops breakdowns.',
    screen: 'car', target: 'nav-car',
  },
  {
    title: 'Standings',
    body: 'The calendar and championship tables. The top 2 teams move up a league at season end and the bottom 2 drop down.',
    screen: 'standings', target: 'nav-standings',
  },
  {
    title: 'Race Weekend',
    body: 'Race day works in three steps.',
    screen: 'race', target: 'nav-race',
    points: [
      '1. Run qualifying. A short timed session that decides the starting order. Fastest starts first (pole position).',
      '2. Pick starting tyres for each driver. Soft is fast but wears quickly, hard lasts long but is slower, medium is in between.',
      '3. Press Lights out to start the live race.',
    ],
  },
  {
    title: 'Race controls',
    body: 'During the live race you are the pit wall (the team strategists). These are your tools:',
    screen: 'race',
    points: [
      'Pause, 1×/4×/16× speed, and Skip to end sit at the top right.',
      'Driver mode: Push is faster but wears tyres, Conserve saves tyres, Normal is balanced.',
      'Pit buttons: call your driver in for fresh tyres. Every car must stop at least once.',
      'Tyre wear bar: when it passes the 70% mark the tyres fall off a cliff. Pit before that.',
      'Commentary: switch to "My team" to see only your cars.',
    ],
  },
  {
    title: 'Back, forward and budget',
    body: 'Use these arrows (or Alt + ← / →) to move between screens like a web browser. Your cash balance sits next to them. If it stays below zero for two races in a row the team goes bankrupt.',
    screen: 'hq', target: 'topbar',
  },
  {
    title: 'Glossary and replay',
    body: 'Forgot a term? The Glossary lists every racing word in plain English. To see this tour again, press "Replay tutorial" at the bottom of the sidebar. Good luck!',
    screen: 'glossary', target: 'nav-glossary',
  },
];

export const TOUR_KEY = 'rtm-tour-seen';
