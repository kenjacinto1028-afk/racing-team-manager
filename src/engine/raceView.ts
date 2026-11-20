// Display helpers for the live race screen: car numbers, distinct team colours,
// laps down and the live team battle. Pure: no React, no DOM.
import { order, type RaceCar, type RaceState } from './raceSim';
import { pointsForPosition } from './season';
import type { Team } from './types';

/** FNV-1a string hash (stable, no randomness). */
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/**
 * A car number (2-99) per driver, unique within the field. Each driver keeps the same
 * number whenever it is free, so numbers stay familiar across races.
 */
export function carNumbers(driverIds: string[]): Record<string, number> {
  const taken = new Set<number>();
  const out: Record<string, number> = {};
  for (const id of [...driverIds].sort()) {
    let n = 2 + (hashStr(id) % 98);
    while (taken.has(n)) n = n >= 99 ? 2 : n + 1;
    taken.add(n);
    out[id] = n;
  }
  return out;
}

// ---- Colours ----

type Rgb = [number, number, number];

export function hexToRgb(hex: string): Rgb {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n)) return [128, 128, 128];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]: Rgb): string {
  return '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
}

/** Relative luminance, 0 (black) to 1 (white). */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Black or white, whichever reads better on this background. */
export function textOn(hex: string): '#000' | '#fff' {
  return luminance(hex) > 0.3 ? '#000' : '#fff';
}

/** Perceptual-ish colour distance ("redmean"), 0 to ~765. */
export function colorDistance(a: string, b: string): number {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const rm = (r1 + r2) / 2;
  const dr = r1 - r2, dg = g1 - g2, db = b1 - b2;
  return Math.sqrt((2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db);
}

/** Lift very dark colours so they show on the dark track. */
function visible(hex: string): string {
  if (luminance(hex) >= 0.06) return hex;
  const [r, g, b] = hexToRgb(hex);
  const mix = 0.45;
  return rgbToHex([r + (255 - r) * mix, g + (255 - g) * mix, b + (255 - b) * mix]);
}

/** Bright, clearly different colours used when two teams look alike. */
export const RACE_PALETTE = [
  '#1e6bff', '#12b76a', '#ffc400', '#9b5cff', '#00c2d1', '#ff7a00', '#ff4fa3',
  '#9aa4b2', '#ffffff', '#8bd400', '#b5651d', '#00e0a4', '#ff8fa3', '#6d8cff',
];

/** Two colours closer than this look like the same team at a glance. */
export const MIN_COLOR_DISTANCE = 175;

/**
 * One clearly different colour per team in a race. The player's team keeps its colour;
 * each other team keeps its own primary (or secondary) colour unless it is too close to
 * a colour already used, in which case it gets the most different palette colour.
 */
export function distinctTeamColors(teamIds: string[], teams: Record<string, Team>, playerTeamId: string): Record<string, string> {
  const ids = [...new Set(teamIds)].sort((a, b) => (a === playerTeamId ? -1 : b === playerTeamId ? 1 : a.localeCompare(b)));
  const used: string[] = [];
  const out: Record<string, string> = {};
  const far = (c: string) => used.every((u) => colorDistance(u, c) >= MIN_COLOR_DISTANCE);
  for (const id of ids) {
    const t = teams[id];
    const options = t ? [visible(t.colors.primary), visible(t.colors.secondary)] : [];
    let pick = id === playerTeamId && options[0] ? options[0] : options.find(far);
    if (!pick) {
      // Most different palette colour from everything used so far.
      let best = RACE_PALETTE[0], bestD = -1;
      for (const p of RACE_PALETTE) {
        const d = used.length ? Math.min(...used.map((u) => colorDistance(u, p))) : 999;
        if (d > bestD) { bestD = d; best = p; }
      }
      pick = best;
    }
    used.push(pick);
    out[id] = pick;
  }
  return out;
}

// ---- Laps ----

/** Lap time used to turn a time gap into laps behind the leader. */
export function refLap(race: RaceState): number {
  const leader = order(race.cars)[0];
  return (leader && leader.lastLap) || race.track.baseLapTime;
}

/** Whole laps each running car is behind the leader (0 = on the lead lap). */
export function lapsDown(race: RaceState): Record<string, number> {
  const ord = order(race.cars);
  const leader = ord[0];
  const ref = refLap(race);
  const out: Record<string, number> = {};
  for (const c of ord) {
    out[c.c.driverId] = !leader || c.dnf ? 0 : Math.max(0, Math.floor((c.totalTime - leader.totalTime) / ref));
  }
  return out;
}

/** The lap a car is on: the leader's current lap minus the laps it is down. */
export function carLap(race: RaceState, down: number): number {
  const leaderLap = Math.min(race.lap + (race.finished ? 0 : 1), race.totalLaps);
  return Math.max(1, leaderLap - down);
}

// ---- Team battle ----

export interface TeamBattleRow {
  teamId: string;
  /** Points this team would score if the race ended now. */
  points: number;
  /** Best running position (99 if both cars are out). */
  best: number;
  cars: { driverId: string; pos: number; dnf: boolean; pitted: boolean }[];
}

/** Teams ranked by the points they'd score if the race ended now, then by their best car. */
export function teamBattle(race: RaceState): TeamBattleRow[] {
  const rows = new Map<string, TeamBattleRow>();
  order(race.cars).forEach((c: RaceCar, i) => {
    const pos = i + 1;
    const row = rows.get(c.c.teamId) ?? { teamId: c.c.teamId, points: 0, best: 99, cars: [] };
    row.points += pointsForPosition(pos, c.dnf);
    if (!c.dnf) row.best = Math.min(row.best, pos);
    row.cars.push({ driverId: c.c.driverId, pos, dnf: c.dnf, pitted: c.pittedThisLap });
    rows.set(c.c.teamId, row);
  });
  return [...rows.values()].sort((a, b) => b.points - a.points || a.best - b.best || a.teamId.localeCompare(b.teamId));
}
