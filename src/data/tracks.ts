import type { Track } from '../engine/types';

// Fictional circuits. `path` is a closed loop in a 100x100 box, drawn smoothed on the track map.
// Profile values are 0-1: power (engine matters), downforce (aero matters), tyreWear, overtaking (difficulty).

export const TRACKS: Track[] = [
  {
    id: 'harbour', name: 'Harbour Park', country: 'Australia', laps: 28, baseLapTime: 82, pitLaneTime: 19,
    profile: { power: 0.5, downforce: 0.5, tyreWear: 0.5, overtaking: 0.5 },
    path: [[15, 70], [15, 30], [30, 15], [55, 18], [62, 35], [80, 30], [88, 50], [80, 75], [55, 85], [30, 85]],
  },
  {
    id: 'desert', name: 'Desert Ring', country: 'Bahrain', laps: 30, baseLapTime: 93, pitLaneTime: 21,
    profile: { power: 0.7, downforce: 0.4, tyreWear: 0.75, overtaking: 0.3 },
    path: [[10, 80], [10, 20], [40, 12], [45, 40], [70, 40], [90, 15], [92, 60], [70, 70], [50, 88]],
  },
  {
    id: 'alpine', name: 'Alpenring', country: 'Austria', laps: 32, baseLapTime: 66, pitLaneTime: 18,
    profile: { power: 0.75, downforce: 0.35, tyreWear: 0.45, overtaking: 0.35 },
    path: [[12, 75], [25, 20], [70, 12], [90, 25], [75, 45], [88, 70], [60, 88], [35, 80]],
  },
  {
    id: 'monaco', name: 'Port Royale Streets', country: 'Monaco', laps: 34, baseLapTime: 73, pitLaneTime: 20,
    profile: { power: 0.15, downforce: 0.9, tyreWear: 0.25, overtaking: 0.95 },
    path: [[10, 60], [20, 40], [35, 45], [40, 25], [60, 15], [75, 30], [90, 35], [85, 55], [70, 60], [65, 80], [40, 85], [25, 75]],
  },
  {
    id: 'forest', name: 'Blackforest GP', country: 'Germany', laps: 28, baseLapTime: 88, pitLaneTime: 20,
    profile: { power: 0.5, downforce: 0.6, tyreWear: 0.55, overtaking: 0.5 },
    path: [[15, 85], [10, 50], [25, 25], [50, 30], [60, 10], [88, 20], [80, 48], [92, 72], [65, 90], [40, 70]],
  },
  {
    id: 'silver', name: 'Silverfield', country: 'Britain', laps: 28, baseLapTime: 89, pitLaneTime: 20,
    profile: { power: 0.55, downforce: 0.75, tyreWear: 0.7, overtaking: 0.4 },
    path: [[20, 85], [10, 55], [22, 30], [45, 15], [70, 22], [90, 40], [78, 55], [85, 80], [55, 90], [40, 72]],
  },
  {
    id: 'parco', name: 'Parco Veloce', country: 'Italy', laps: 30, baseLapTime: 81, pitLaneTime: 22,
    profile: { power: 0.95, downforce: 0.15, tyreWear: 0.35, overtaking: 0.2 },
    path: [[15, 85], [10, 15], [50, 10], [60, 20], [90, 15], [88, 55], [70, 60], [80, 85]],
  },
  {
    id: 'lagoon', name: 'Lagoon Street Circuit', country: 'Singapore', laps: 30, baseLapTime: 98, pitLaneTime: 24,
    profile: { power: 0.3, downforce: 0.85, tyreWear: 0.6, overtaking: 0.8 },
    path: [[10, 50], [10, 15], [40, 15], [40, 35], [65, 35], [65, 12], [90, 12], [90, 60], [70, 60], [70, 88], [35, 88], [35, 60]],
  },
  {
    id: 'suzu', name: 'Kaze Figure-Eight', country: 'Japan', laps: 30, baseLapTime: 91, pitLaneTime: 21,
    profile: { power: 0.55, downforce: 0.8, tyreWear: 0.65, overtaking: 0.6 },
    path: [[15, 80], [12, 45], [30, 25], [50, 40], [70, 18], [90, 30], [85, 60], [62, 55], [55, 80], [35, 90]],
  },
  {
    id: 'canyon', name: 'Red Canyon Raceway', country: 'USA', laps: 30, baseLapTime: 95, pitLaneTime: 21,
    profile: { power: 0.6, downforce: 0.55, tyreWear: 0.55, overtaking: 0.35 },
    path: [[10, 70], [20, 20], [35, 35], [55, 15], [88, 20], [80, 50], [92, 80], [60, 75], [40, 90]],
  },
  {
    id: 'interlagos', name: 'Serra Verde', country: 'Brazil', laps: 32, baseLapTime: 71, pitLaneTime: 19,
    profile: { power: 0.6, downforce: 0.5, tyreWear: 0.5, overtaking: 0.3 },
    path: [[20, 20], [80, 15], [90, 35], [60, 45], [75, 70], [50, 88], [25, 75], [35, 50], [15, 45]],
  },
  {
    id: 'dunes', name: 'Twilight Dunes', country: 'UAE', laps: 29, baseLapTime: 86, pitLaneTime: 21,
    profile: { power: 0.65, downforce: 0.45, tyreWear: 0.4, overtaking: 0.45 },
    path: [[10, 50], [25, 15], [55, 15], [60, 35], [90, 30], [88, 70], [60, 70], [50, 88], [20, 85]],
  },
];

export const TRACK_BY_ID: Record<string, Track> = Object.fromEntries(TRACKS.map((t) => [t.id, t]));
