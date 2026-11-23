import type { Track } from './types';

export interface CornerCounts { slow: number; medium: number; fast: number }

/** Turn angle (degrees) at point i of the closed loop. */
function turnAngle(pts: [number, number][], i: number): number {
  const n = pts.length;
  const a = pts[(i - 1 + n) % n], b = pts[i], c = pts[(i + 1) % n];
  const a1 = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const a2 = Math.atan2(c[1] - b[1], c[0] - b[0]);
  let d = Math.abs(a2 - a1) * 180 / Math.PI;
  if (d > 180) d = 360 - d;
  return d;
}

/** Sort the corners of a track into slow (sharp), medium and fast (gentle) from its shape. */
export function cornerCounts(track: Track): CornerCounts {
  const out: CornerCounts = { slow: 0, medium: 0, fast: 0 };
  for (let i = 0; i < track.path.length; i++) {
    const d = turnAngle(track.path, i);
    if (d < 20) continue; // basically straight
    if (d >= 75) out.slow++; else if (d >= 40) out.medium++; else out.fast++;
  }
  return out;
}

export interface StrategyHint { headline: string; tyres: string; stops: string; passing: string }

/** Plain-English strategy advice from the track profile. */
export function strategyHint(track: Track): StrategyHint {
  const p = track.profile;
  const tyres = p.tyreWear > 0.65 ? 'Tyres wear fast here. Favour medium or hard.' : p.tyreWear < 0.4 ? 'Gentle on tyres. Softs can last well.' : 'Average tyre wear. Mediums are a safe start.';
  const stops = p.tyreWear > 0.65 ? 'Plan a stop a bit early, and consider two stops.' : 'One stop should be enough.';
  const passing = p.overtaking > 0.7 ? 'Passing is very hard, so grid position matters most.' : p.overtaking < 0.35 ? 'Passing is easy, so you can recover from a poor grid slot.' : 'Passing is possible but not easy.';
  const headline = p.power > 0.65 ? 'Power track: long straights reward a strong engine.' : p.downforce > 0.65 ? 'Aero track: tight corners reward downforce.' : 'Balanced track.';
  return { headline, tyres, stops, passing };
}
