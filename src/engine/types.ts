// Core game types. Pure data: no functions, no React.

/** 1 = Formula Prime (top), 2 = Formula Challenger, 3 = Formula Academy (bottom). */
export type TierId = 1 | 2 | 3;

export type Compound = 'soft' | 'medium' | 'hard';
export type DriverMode = 'push' | 'normal' | 'conserve';
export type StaffRole = 'raceEngineer' | 'chiefMechanic' | 'pitCrewChief' | 'technicalDirector';
export type CarStat = 'engine' | 'aero' | 'chassis' | 'reliability';

export interface Contract {
  /** Paid every race. */
  salary: number;
  /** Seasons left, including the current one. 0 = expired. */
  yearsLeft: number;
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
}

export interface Staff {
  id: string;
  name: string;
  role: StaffRole;
  rating: number;
  age: number;
  contract: Contract | null;
  teamId: string | null;
}

export type CarStats = Record<CarStat, number>;

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
  results: RaceResult[];
}

export interface LedgerEntry {
  season: number;
  round: number;
  label: string;
  /** Positive = income, negative = cost. */
  amount: number;
}

export interface FinanceState {
  /** Races in a row the player finished with a negative balance. */
  negativeStreak: number;
  bankrupt: boolean;
  ledger: LedgerEntry[];
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
}
