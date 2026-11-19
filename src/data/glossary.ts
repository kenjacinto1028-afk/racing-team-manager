// Plain-English explanations for every racing term and stat. Used by tooltips and the Glossary screen.

export type GlossaryCategory = 'Racing' | 'Driver' | 'Car' | 'Staff' | 'Money' | 'Season';

export interface GlossaryEntry { term: string; short: string; category: GlossaryCategory }

export const GLOSSARY: Record<string, GlossaryEntry> = {
  // Driver
  pace: { term: 'Pace', category: 'Driver', short: 'Raw speed. The biggest single factor in how fast a driver laps.' },
  consistency: { term: 'Consistency', category: 'Driver', short: 'How steady lap times are. High consistency means fewer mistakes and crashes.' },
  racecraft: { term: 'Racecraft', category: 'Driver', short: 'Skill in wheel-to-wheel fights: overtaking cars ahead and defending from cars behind.' },
  tyreManagement: { term: 'Tyre management', category: 'Driver', short: 'How gently a driver treats the tyres. Better tyre management means tyres last longer.' },
  experience: { term: 'Experience', category: 'Driver', short: 'Years of racing. Experienced drivers crash less. It grows every season.' },
  potential: { term: 'Potential', category: 'Driver', short: 'The level a young driver can grow toward. Drivers 25 and under improve each season.' },
  overall: { term: 'Overall', category: 'Driver', short: 'One number summing up a driver: mostly pace, plus racecraft, consistency, tyre management and experience.' },
  age: { term: 'Age', category: 'Driver', short: 'Young drivers (25 and under) improve, drivers 33+ slowly decline, and most retire between 35 and 40.' },
  // Car
  engine: { term: 'Engine', category: 'Car', short: 'Power. Matters most on tracks with long straights.' },
  aero: { term: 'Aero', category: 'Car', short: 'Aerodynamics: air pushing the car onto the road for grip in corners. Matters most on twisty tracks.' },
  chassis: { term: 'Chassis', category: 'Car', short: "The car's frame and suspension. Gives overall balance on every track." },
  reliability: { term: 'Reliability', category: 'Car', short: 'How rarely the car breaks down. Low reliability means more DNFs.' },
  carOverall: { term: 'Car rating', category: 'Car', short: 'One number summing up the car: engine, aero, chassis and reliability.' },
  rnd: { term: 'R&D', category: 'Car', short: 'Research and development: spending money to improve the car. Each upgrade of the same part in a season costs more.' },
  // Staff
  raceEngineer: { term: 'Race Engineer', category: 'Staff', short: 'Sets up the car for each track. A better engineer means faster laps.' },
  chiefMechanic: { term: 'Chief Mechanic', category: 'Staff', short: 'Keeps the car healthy. A better mechanic means fewer breakdowns.' },
  pitCrewChief: { term: 'Pit Crew Chief', category: 'Staff', short: 'Runs the pit crew. A better chief means quicker pit stops and fewer slow ones.' },
  technicalDirector: { term: 'Technical Director', category: 'Staff', short: 'Leads car development. Makes R&D upgrades cheaper and bigger.' },
  vsYours: { term: 'Vs yours', category: 'Staff', short: 'How much better (green) or worse (red) this person is than whoever you have in the same role now.' },
  rating: { term: 'Rating', category: 'Staff', short: 'How good a staff member is at their job, from 0 to 100.' },
  // Racing
  qualifying: { term: 'Qualifying', category: 'Racing', short: 'Each driver sets one fast lap before the race. The fastest starts at the front.' },
  grid: { term: 'Grid', category: 'Racing', short: 'The starting order of the race, set by qualifying.' },
  pole: { term: 'Pole position', category: 'Racing', short: 'First place on the grid: the fastest qualifier starts here.' },
  pitStop: { term: 'Pit stop', category: 'Racing', short: 'Driving into the pit lane to change tyres. Costs about 20 seconds. Every car must stop at least once.' },
  tyres: { term: 'Tyres', category: 'Racing', short: 'Tyres wear out each lap and get slower. Past about 70% wear they fall off a cliff.' },
  soft: { term: 'Soft tyre', category: 'Racing', short: 'The fastest tyre, but it wears out quickly. Red on the timing screen.' },
  medium: { term: 'Medium tyre', category: 'Racing', short: 'A middle-ground tyre: decent speed and decent life. Yellow on the timing screen.' },
  hard: { term: 'Hard tyre', category: 'Racing', short: 'The slowest tyre, but it lasts a long time. White on the timing screen.' },
  wear: { term: 'Tyre wear', category: 'Racing', short: 'How used-up the tyre is, from 0% (new) to 100% (finished).' },
  dnf: { term: 'DNF', category: 'Racing', short: '"Did not finish": the car broke down or crashed and retired from the race.' },
  overtake: { term: 'Overtake', category: 'Racing', short: 'Passing the car in front. Harder on narrow tracks; racecraft helps.' },
  gap: { term: 'Gap', category: 'Racing', short: 'Time behind the race leader, in seconds.' },
  interval: { term: 'Interval', category: 'Racing', short: 'Gap to the car directly in front.' },
  lap: { term: 'Lap', category: 'Racing', short: 'One full trip around the track.' },
  fastestLap: { term: 'Fastest lap', category: 'Racing', short: 'The quickest single lap anyone did in the race.' },
  push: { term: 'Push mode', category: 'Racing', short: 'Drive flat out: about 0.35s a lap faster, but tyres wear 35% faster and the risk of failure rises.' },
  normal: { term: 'Normal mode', category: 'Racing', short: 'A balanced pace.' },
  conserve: { term: 'Conserve mode', category: 'Racing', short: 'Drive gently: about 0.45s a lap slower, but tyres last 30% longer.' },
  mandatoryStop: { term: 'Mandatory stop', category: 'Racing', short: 'Every car must pit at least once. If you forget, the team calls your driver in on the second-to-last lap.' },
  trackPower: { term: 'Power (track)', category: 'Racing', short: 'How much the track has long straights. High power means engine matters most.' },
  trackDownforce: { term: 'Downforce (track)', category: 'Racing', short: 'How twisty the track is. High downforce means aero matters most.' },
  trackTyreWear: { term: 'Tyre wear (track)', category: 'Racing', short: 'How hard the track surface and corners are on tyres.' },
  trackOvertaking: { term: 'Overtaking difficulty', category: 'Racing', short: 'How hard it is to pass here. Street circuits are narrow and hard; long straights make it easy.' },
  teamPrincipal: { term: 'Team principal', category: 'Racing', short: "The boss of the team. That's you." },
  // Season
  points: { term: 'Points', category: 'Season', short: 'The top 10 finishers score 25, 18, 15, 12, 10, 8, 6, 4, 2 and 1.' },
  standings: { term: 'Standings', category: 'Season', short: 'The championship table, ordered by points. Ties go to whoever has more wins, then more 2nd places, and so on.' },
  constructors: { term: "Teams' championship", category: 'Season', short: "Both drivers' points added together for each team. This decides promotion and relegation." },
  promotion: { term: 'Promotion', category: 'Season', short: 'The top 2 teams move up to the league above next season.' },
  relegation: { term: 'Relegation', category: 'Season', short: 'The bottom 2 teams drop to the league below next season.' },
  podium: { term: 'Podium', category: 'Season', short: 'Finishing in the top 3.' },
  wins: { term: 'Wins', category: 'Season', short: 'Races finished in 1st place.' },
  tiers: { term: 'Leagues', category: 'Season', short: 'Formula Academy (bottom, 8 races), Formula Challenger (middle, 10 races) and Formula Prime (top, 12 races).' },
  // Money
  budget: { term: 'Budget', category: 'Money', short: 'Money in the bank. If it stays below zero for 2 races in a row, the team goes bankrupt.' },
  salary: { term: 'Salary', category: 'Money', short: 'Paid every race to each driver and staff member.' },
  signingFee: { term: 'Signing fee', category: 'Money', short: 'One-off payment when you hire someone.' },
  releaseCost: { term: 'Release cost', category: 'Money', short: 'Paying off a contract early when you let someone go.' },
  contract: { term: 'Contract', category: 'Money', short: 'How many seasons someone is signed for. When it runs out you can renew it or let them leave.' },
  sponsor: { term: 'Sponsor money', category: 'Money', short: 'Paid every race. Higher in bigger leagues, and higher the better you are doing in the table.' },
  pointsBonus: { term: 'Points bonus', category: 'Money', short: 'Extra sponsor money for every championship point scored.' },
  prizeMoney: { term: 'Prize money', category: 'Money', short: 'Paid at the end of the season by final team position.' },
  bankruptcy: { term: 'Bankruptcy', category: 'Money', short: 'Game over: the budget was below zero after 2 races in a row.' },
  raceSpeed: { term: 'Race speed', category: 'Racing', short: 'How fast the live race plays. 1× is slowest, 16× is fastest. You can change it any time.' },
  skipRace: { term: 'Skip to end', category: 'Racing', short: 'Jump straight to the chequered flag. Your drivers keep their current mode and tyres, with no more pit calls from you.' },
  pause: { term: 'Pause', category: 'Racing', short: 'Freeze the race so you can think. Pit and mode calls still work while paused.' },
  cliff: { term: 'Tyre cliff', category: 'Racing', short: 'At about 70% wear tyres suddenly lose lots of grip and lap times drop sharply. Pit before you reach it.' },
  commentary: { term: 'Commentary', category: 'Racing', short: 'A running list of race events: overtakes, pit stops and crashes. "My team" shows only your cars.' },
  driverMode: { term: 'Driver mode', category: 'Racing', short: 'How hard the driver pushes: Push is faster but wears tyres, Conserve saves tyres, Normal is balanced.' },
  position: { term: 'Pos', category: 'Season', short: 'Position: where you are in the order. 1 is first.' },
};

export function gloss(key: string): GlossaryEntry | undefined {
  return GLOSSARY[key];
}
