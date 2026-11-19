// Core game types. Pure data: no functions, no React.

/** 1 = Formula Prime (top), 2 = Formula Challenger, 3 = Formula Academy (bottom). */
export type TierId = 1 | 2 | 3;

export type Compound = 'soft' | 'medium' | 'hard';
export type DriverMode = 'push' | 'normal' | 'conserve';
export type StaffRole = 'raceEngineer' | 'chiefMechanic' | 'pitCrewChief' | 'technicalDirector' | 'scout';
export type CarStat = 'engine' | 'aero' | 'chassis' | 'reliability';

export interface Contract {
  /** Paid every race. */
  salary: number;
  /** Seasons left, including the current one. 0 = expired. */
  yearsLeft: number;
  /** Extra paid after each race win / podium (drivers only). */
  winBonus?: number;
  podiumBonus?: number;
}

export interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  nationality: string;
  age: number;
  /** The level this driver can grow toward while young (0-100). */
  potential: number;
  pace: number;
  consistency: number;
  racecraft: number;
  tyreManagement: number;
  experience: number;
  contract: Contract | null;
  teamId: string | null;
  retired?: boolean;
  /** Pay driver: brings this much sponsor money per race instead of asking for a salary. */
  payBudget?: number;
  /** 20-95 (70 = normal). Results, pay and team-mate battles move it. */
  morale: number;
  traits: string[];
  training: TrainingFocus;
  /** Youth academy team (not racing yet). */
  academyTeamId?: string | null;
}

export type TrainingFocus = 'pace' | 'racecraft' | 'tyres' | 'fitness' | 'balanced';
export type FacilityKind = 'factory' | 'simulator' | 'gym';

export interface Staff {
  id: string;
  name: string;
  role: StaffRole;
  rating: number;
  age: number;
  contract: Contract | null;
  teamId: string | null;
  /** Season of the last training course (one per season). */
  courseSeason?: number;
}

export type CarStats = Record<CarStat, number>;

/** Chassis design picked each season. */
export type CarConcept = 'balanced' | 'lowDrag' | 'highDownforce' | 'tyreFriendly';
export type WingLevel = 'low' | 'medium' | 'high';
export type SuspensionSetting = 'soft' | 'medium' | 'stiff';
export interface CarSetup { wing: WingLevel; suspension: SuspensionSetting }

/** Power units and gearboxes wear out; using more than the allowance costs grid places. */
export interface UnitUse { used: number; wear: number }
export type UnitKind = 'engine' | 'gearbox';

export interface RndProject { partId: string; racesLeft: number }

export interface Team {
  id: string;
  name: string;
  short: string;
  colors: { primary: string; secondary: string };
  tier: TierId;
  isPlayer: boolean;
  driverIds: string[];
  staffIds: Partial<Record<StaffRole, string>>;
  car: CarStats;
  /** How many upgrades have been bought for each stat this season (drives cost). */
  upgrades: CarStats;
  budget: number;
  /** Team spirit, 20-95 (70 = normal). Firing people lowers it; good results raise it. */
  morale: number;
  /** Money spent this season on R&D and signing fees (for the optional budget cap). */
  spend: number;
  concept: CarConcept;
  /** Fitted part id per slot (see data/parts.ts). */
  parts: Record<string, string>;
  /** Designed parts the team can fit. */
  ownedParts: string[];
  projects: RndProject[];
  units: Record<UnitKind, UnitUse>;
  /** Grid places lost at the next race. */
  gridPenalty: number;
  /** Facility levels 0-5. */
  facilities: Record<FacilityKind, number>;
  /** Facility upgrade under construction. */
  building: { kind: FacilityKind; racesLeft: number } | null;
  /** Youth academy driver ids (max 3). */
  academy: string[];
}

export interface TrackProfile {
  /** 0-1: how much straight-line speed (engine) matters. */
  power: number;
  /** 0-1: how much cornering grip (aero) matters. */
  downforce: number;
  /** 0-1: how hard the track is on tyres. */
  tyreWear: number;
  /** 0-1: how hard it is to overtake. */
  overtaking: number;
}

export interface Track {
  id: string;
  name: string;
  country: string;
  laps: number;
  /** Seconds for a reference lap. */
  baseLapTime: number;
  /** Seconds lost driving through the pit lane (excluding the stop itself). */
  pitLaneTime: number;
  profile: TrackProfile;
  /** Closed loop of points (0-100 box) for the SVG map. */
  path: [number, number][];
}

export interface ResultEntry {
  driverId: string;
  teamId: string;
  grid: number;
  /** 1-based finishing order. DNFs are placed after all finishers. */
  position: number;
  dnf: boolean;
  dnfReason?: string;
  points: number;
  laps: number;
  totalTime: number;
  bestLap: number;
  pitStops: number;
}

export interface RaceResult {
  round: number;
  trackId: string;
  entries: ResultEntry[];
}

export interface LeagueState {
  tier: TierId;
  teamIds: string[];
  calendar: string[];
  /** Week of the year for each race in `calendar` (same order). */
  weeks: number[];
  results: RaceResult[];
}

export interface LedgerEntry {
  season: number;
  round: number;
  label: string;
  /** Positive = income, negative = cost. */
  amount: number;
}

export type SponsorKind = 'title' | 'partner';

export type SponsorGoal =
  | { kind: 'teamPos'; target: number }
  | { kind: 'pointsFinishes'; target: number }
  | { kind: 'podiums'; target: number }
  | { kind: 'wins'; target: number };

export interface SponsorDeal {
  id: string;
  name: string;
  kind: SponsorKind;
  /** Paid after every race. */
  perRace: number;
  goal: SponsorGoal;
  /** Paid at season end if the goal is met. */
  bonus: number;
  /** Seasons left, including the current one. */
  seasons: number;
}

export interface SponsorState {
  active: SponsorDeal[];
  offers: SponsorDeal[];
}

export interface Settings {
  /** Formula Prime spending limit on R&D and signing fees. */
  budgetCap: boolean;
}

export interface FinanceState {
  /** Races in a row the player finished with a negative balance. */
  negativeStreak: number;
  bankrupt: boolean;
  ledger: LedgerEntry[];
}

/** One team's final line in a past season's table. */
export interface HistoryTeamRow {
  teamId: string;
  points: number;
  wins: number;
  podiums: number;
}

/** One driver's season, compact. `pos` = final drivers' championship position. */
export interface DriverSeasonLine {
  driverId: string;
  teamId: string;
  tier: TierId;
  races: number;
  wins: number;
  podiums: number;
  points: number;
  pos: number;
}

/** One staff member's season: which team and league they worked in, and where that team finished. */
export interface StaffSeasonLine {
  staffId: string;
  teamId: string;
  tier: TierId;
  teamPos: number;
}

/** Short summary of a finished season, kept forever. */
export interface SeasonArchive {
  season: number;
  year: number;
  /** Final team tables per tier, in finishing order. */
  tables: Record<TierId, HistoryTeamRow[]>;
  /** Drivers' champion per tier. */
  champions: Record<TierId, string | null>;
  drivers: DriverSeasonLine[];
  staff: StaffSeasonLine[];
  playerTeamId: string;
  playerTier: TierId;
  playerPos: number;
}

export interface GameState {
  seed: number;
  season: number;
  year: number;
  playerTeamId: string;
  nextId: number;
  teams: Record<string, Team>;
  drivers: Record<string, Driver>;
  staff: Record<string, Staff>;
  leagues: Record<TierId, LeagueState>;
  /** Free-agent driver ids. */
  driverMarket: string[];
  /** Unemployed staff ids. */
  staffMarket: string[];
  finance: FinanceState;
  /** Past seasons, oldest first. */
  history: SeasonArchive[];
  /** The player's sponsor deals and open offers. */
  sponsors: SponsorState;
  settings: Settings;
  /** The player's car setup for the next race. */
  setup: CarSetup;
  /** Teenagers available to sign to the youth academy this season. */
  youthPool: string[];
}
