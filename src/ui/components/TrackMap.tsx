import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { RaceState } from '../../engine/raceSim';
import { order } from '../../engine/raceSim';
import { lapsDown, refLap, textOn } from '../../engine/raceView';
import type { Team, Track } from '../../engine/types';
import type { RaceLook } from '../raceLook';

/** Smooth closed path through the points (Catmull-Rom → cubic Bézier). */
export function smoothPath(pts: [number, number][]): string {
  const n = pts.length;
  const p = (i: number) => pts[(i + n) % n];
  let d = `M ${p(0)[0]} ${p(0)[1]}`;
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [p(i - 1), p(i), p(i + 1), p(i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0].toFixed(2)} ${c1[1].toFixed(2)}, ${c2[0].toFixed(2)} ${c2[1].toFixed(2)}, ${p2[0]} ${p2[1]}`;
  }
  return d + ' Z';
}

// Geometry, in track units (the track is drawn in a 100x100 box).
const ROAD = 9.6;          // asphalt width: room for two cars side by side
const LANE = 2.3;          // how far a car moves off the racing line to run side by side
const SAMPLES = 720;       // points sampled along the lap
const PIT_FROM = -0.055;   // pit lane starts this far (fraction of a lap) before the line…
const PIT_TO = 0.055;      // …and rejoins this far after it
const PIT_RAMP = 0.022;
const PIT_OFFSET = 9;      // pit lane centre, out from the racing line
const BATTLE_GAP = 0.5;    // seconds: closer than this is a battle
const CAR_SPACE = 5.6;     // track units: room one car badge needs along the track

interface Pt { x: number; y: number; nx: number; ny: number; ang: number }

/** Point-in-polygon on the raw track points (good enough for the smoothed shape). */
function inside(x: number, y: number, poly: [number, number][]): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

function smoothstep(t: number) { return t * t * (3 - 2 * t); }

/** 0 → 1 → 0 across the pit lane, with smooth entry and exit ramps. */
function pitBlend(f: number): number {
  const x = f > 0.5 ? f - 1 : f;
  if (x < PIT_FROM || x > PIT_TO) return 0;
  if (x < PIT_FROM + PIT_RAMP) return smoothstep((x - PIT_FROM) / PIT_RAMP);
  if (x > PIT_TO - PIT_RAMP) return smoothstep((PIT_TO - x) / PIT_RAMP);
  return 1;
}

interface Dot {
  id: string; x: number; y: number; color: string; text: string; num: number;
  me: boolean; pos: number; inPit: boolean; f: number; lane: number; down: number; time: number; tagX: number; tagY: number;
}

/**
 * Live map. Each car sits behind the leader by (gap / lap time) of a lap.
 * `progress` (0-1) animates the leader through the current lap between ticks.
 */
export function TrackMap({ track, race, teams, playerTeamId, progress, look }: {
  track: Track; race?: RaceState; teams: Record<string, Team>; playerTeamId: string; progress?: number; look?: RaceLook;
}) {
  const d = useMemo(() => smoothPath(track.path), [track]);
  const pathRef = useRef<SVGPathElement>(null);
  const [samples, setSamples] = useState<{ x: number; y: number }[] | null>(null);

  useLayoutEffect(() => {
    const el = pathRef.current;
    if (!el) return;
    const len = el.getTotalLength();
    const out: { x: number; y: number }[] = [];
    for (let i = 0; i < SAMPLES; i++) { const p = el.getPointAtLength((i / SAMPLES) * len); out.push({ x: p.x, y: p.y }); }
    setSamples(out);
  }, [d]);

  // Outward side (+1 or -1 along the left normal), so the pit lane sits outside the loop.
  const geo = useMemo(() => {
    if (!samples) return null;
    const raw = (f: number): Pt => {
      const t = (((f % 1) + 1) % 1) * SAMPLES;
      const i = Math.floor(t), k = t - i;
      const a = samples[i % SAMPLES], b = samples[(i + 1) % SAMPLES];
      const dx = b.x - a.x, dy = b.y - a.y, m = Math.hypot(dx, dy) || 1;
      return { x: a.x + dx * k, y: a.y + dy * k, nx: -dy / m, ny: dx / m, ang: (Math.atan2(dy, dx) * 180) / Math.PI };
    };
    const p0 = raw(0.01);
    const out = inside(p0.x + p0.nx * 3, p0.y + p0.ny * 3, track.path) ? -1 : 1;
    const at = (f: number, off = 0): Pt => {
      const p = raw(f);
      return { ...p, x: p.x + p.nx * out * off, y: p.y + p.ny * out * off, nx: p.nx * out, ny: p.ny * out };
    };
    // Pit lane polyline.
    const pit: string[] = [];
    for (let f = PIT_FROM; f <= PIT_TO + 1e-9; f += 0.002) {
      const p = at(f, ROAD / 2 + 0.4 + pitBlend(f) * (PIT_OFFSET - ROAD / 2 - 0.4));
      pit.push(`${p.x.toFixed(2)},${p.y.toFixed(2)}`);
    }
    // Frame: the whole track plus the pit lane, garages and labels.
    const pts = [...samples];
    for (let f = PIT_FROM; f <= PIT_TO; f += 0.01) { const p = at(f, PIT_OFFSET + 11); pts.push({ x: p.x, y: p.y }); }
    for (const f of [1 / 3, 2 / 3]) { const p = at(f, ROAD / 2 + 5); pts.push({ x: p.x, y: p.y }); }
    const xs = pts.map((s) => s.x), ys = pts.map((s) => s.y);
    const pad = 9;
    const box = [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) - Math.min(...xs) + pad * 2, Math.max(...ys) - Math.min(...ys) + pad * 2];
    let length = 0;
    for (let i = 0; i < SAMPLES; i++) { const a = samples[i], b = samples[(i + 1) % SAMPLES]; length += Math.hypot(b.x - a.x, b.y - a.y); }
    return { at, pit: pit.join(' '), viewBox: box.map((v) => v.toFixed(1)).join(' '), ratio: box[2] / box[3], length };
  }, [samples, track.path]);

  // Cars.
  const dots: Dot[] = [];
  const battles: { x: number; y: number }[] = [];
  if (race && geo) {
    const ord = order(race.cars).filter((c) => !c.dnf);
    const leader = ord[0];
    const ref = refLap(race);
    const lead = race.finished ? 0 : (progress ?? 0);
    const down = lapsDown(race);
    // Distance behind the leader in laps. Bunched cars are spread into rows of two
    // (side by side) so every number stays readable, even in a long train.
    const space = CAR_SPACE / geo.length;
    let rowStart = -Infinity, rowCount = 0, lastShown = -Infinity;
    ord.forEach((c, i) => {
      const raw = leader ? (c.totalTime - leader.totalTime) / ref : 0;
      const inPitLane = (b: number) => { let f0 = (lead - b) % 1; if (f0 < 0) f0 += 1; return c.pittedThisLap && pitBlend(f0) > 0; };
      let behind = raw;
      let lane = 0;
      if (!inPitLane(raw)) {
        if (raw - rowStart < space && rowCount === 1) {
          // Alongside the car ahead.
          behind = Math.max(raw, lastShown + space * 0.15);
          lane = 1;
          rowCount = 2;
        } else {
          behind = Math.max(raw, rowStart + space);
          rowStart = behind; rowCount = 1;
        }
        lastShown = behind;
      }
      let f = (lead - behind) % 1;
      if (f < 0) f += 1;
      const inPit = inPitLane(raw);
      const color = look?.colors[c.c.teamId] ?? teams[c.c.teamId]?.colors.primary ?? '#888';
      dots.push({
        id: c.c.driverId, x: 0, y: 0, color, text: textOn(color), num: look?.numbers[c.c.driverId] ?? i + 1,
        me: c.c.teamId === playerTeamId, pos: i + 1, inPit, f, lane, down: down[c.c.driverId] ?? 0, time: c.totalTime, tagX: 0, tagY: 0,
      });
    });
    // The car a side-by-side car is alongside moves to the other lane.
    dots.forEach((x, i) => {
      if (x.lane === 1) { const prev = dots.slice(0, i).reverse().find((d) => !d.inPit); if (prev) prev.lane = -1; }
    });
    for (const x of dots) {
      const p = x.inPit ? geo.at(x.f, ROAD / 2 + 0.4 + pitBlend(x.f) * (PIT_OFFSET - ROAD / 2 - 0.4)) : geo.at(x.f, x.lane * LANE);
      x.x = p.x; x.y = p.y;
      // Tags sit above the car, or out to the side of its lane when running side by side.
      x.tagX = x.lane ? p.nx * x.lane * 5.6 : 0;
      x.tagY = x.lane ? p.ny * x.lane * 5.6 : -4.4;
    }
    // Battles: the closest fights (same lap, under half a second apart), at most three.
    const fights: { gap: number; x: number; y: number }[] = [];
    for (let i = 1; i < dots.length; i++) {
      const a = dots[i - 1], b = dots[i];
      if (a.inPit || b.inPit || a.down !== b.down) continue;
      const gap = b.time - a.time;
      if (gap < BATTLE_GAP && Math.hypot(a.x - b.x, a.y - b.y) < 9) fights.push({ gap, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    }
    battles.push(...fights.sort((p, q) => p.gap - q.gap).slice(0, 3));
  }
  const drawOrder = [...dots].reverse(); // leader drawn last, on top
  const teamIds = race ? [...new Set(order(race.cars).map((c) => c.c.teamId))] : [];

  return (
    <svg className="trackmap" viewBox={geo?.viewBox ?? '-16 -16 132 132'} style={geo ? { aspectRatio: geo.ratio } : undefined} role="img" aria-label={`${track.name} track map`}>
      {/* Grass, kerbs and asphalt */}
      <path d={d} className="tm-runoff" />
      <path d={d} className="tm-kerb" style={{ strokeWidth: ROAD + 1.2 }} />
      <path d={d} className="tm-kerb-white" style={{ strokeWidth: ROAD + 1.2 }} />
      <path d={d} className="tm-road" style={{ strokeWidth: ROAD }} ref={pathRef} />
      <path d={d} className="tm-centre" />

      {geo && (
        <g className="tm-furniture">
          {/* Pit lane */}
          <polyline points={geo.pit} className="tm-pit-edge" />
          <polyline points={geo.pit} className="tm-pit-road" />
          <polyline points={geo.pit} className="tm-pit-line" />
          {teamIds.map((id, i) => {
            const n = teamIds.length;
            const p = geo.at(-0.03 + (0.06 * (i + 0.5)) / n, PIT_OFFSET + 3.4);
            const col = look?.colors[id] ?? teams[id]?.colors.primary ?? '#888';
            return <rect key={id} x={p.x - 1.4} y={p.y - 0.7} width={2.8} height={1.4} rx={0.25} fill={col} className={id === playerTeamId ? 'tm-garage me' : 'tm-garage'} transform={`rotate(${p.ang} ${p.x} ${p.y})`}><title>{teams[id]?.name} garage</title></rect>;
          })}
          {([[PIT_FROM + 0.012, 'IN'], [PIT_TO - 0.012, 'OUT']] as const).map(([f, label]) => {
            const p = geo.at(f, ROAD / 2 + 0.4 + pitBlend(f) * (PIT_OFFSET - ROAD / 2 - 0.4) + 3.4);
            return (
              <g key={label} transform={`translate(${p.x} ${p.y})`}>
                <rect x={-2.3} y={-1.15} width={4.6} height={2.3} rx={0.5} className="tm-pit-sign" />
                <text y={0.1} className="tm-pit-sign-text">{label}</text>
              </g>
            );
          })}
          {(() => {
            const p = geo.at(0, PIT_OFFSET + 8.4);
            return (
              <g transform={`translate(${p.x} ${p.y})`}>
                <text className="tm-pit-label"><title>Pit lane: where cars stop for new tyres. Speed limited to 60 km/h.</title>PIT</text>
              </g>
            );
          })()}

          {/* Sector lines */}
          {[1 / 3, 2 / 3].map((f, i) => {
            const a = geo.at(f, ROAD / 2 + 0.6), b = geo.at(f, -(ROAD / 2 + 0.6)), l = geo.at(f, ROAD / 2 + 3.4);
            return (
              <g key={f}>
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="tm-sector" />
                <text x={l.x} y={l.y} className="tm-sector-text"><title>Sector: each lap is split into three timed parts</title>S{i + 1}</text>
              </g>
            );
          })}

          {/* Start / finish: full-width chequered band */}
          {(() => {
            const p = geo.at(0);
            const cols = 7, rows = 2, w = ROAD / cols, h = 0.9;
            const cells = [];
            for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
              cells.push(<rect key={`${r}-${c}`} x={-h + r * h} y={-ROAD / 2 + c * w} width={h} height={w} fill={(r + c) % 2 ? '#fff' : '#0b0d12'} />);
            }
            return (
              <g transform={`translate(${p.x} ${p.y}) rotate(${p.ang})`} className="tm-finish">
                <title>Start / finish line</title>
                {cells}
                <rect x={-h - 0.3} y={-ROAD / 2 - 1.2} width={h * 2 + 0.6} height={1.2} className="tm-gantry" />
                <rect x={-h - 0.3} y={ROAD / 2} width={h * 2 + 0.6} height={1.2} className="tm-gantry" />
              </g>
            );
          })()}
        </g>
      )}

      {battles.map((b, i) => <circle key={i} cx={b.x} cy={b.y} r={5.2} className="tm-battle" />)}

      {drawOrder.map((c) => (
        <g key={c.id} transform={`translate(${c.x} ${c.y})`} className={'tm-car' + (c.me ? ' me' : '')}>
          {c.me && <circle r={3.8} fill={c.color} className="tm-glow" />}
          <rect x={-2.4} y={-1.8} width={4.8} height={3.6} rx={0.9} fill={c.color} className="tm-badge" />
          <text y={0.15} fill={c.text} className="tm-num">{c.num}</text>
          {c.me && (
            <g transform={`translate(${c.tagX} ${c.tagY})`} className="tm-tag">
              <rect x={-3.9} y={-1.35} width={7.8} height={2.6} rx={0.6} className="tm-you" />
              <text y={0.05} className="tm-tag-text">{c.inPit ? 'YOU PIT' : `YOU P${c.pos}`}</text>
            </g>
          )}
          {!c.me && c.pos === 1 && (
            <g transform="translate(0 4.3)">
              <rect x={-2.4} y={-1.2} width={4.8} height={2.4} rx={0.5} className="tm-p1" />
              <text y={0.1} className="tm-tag-text dark">P1</text>
            </g>
          )}
          {!c.me && c.inPit && (
            <g transform="translate(0 4.3)">
              <rect x={-2.6} y={-1.2} width={5.2} height={2.4} rx={0.5} className="tm-pit-sign" />
              <text y={0.1} className="tm-pit-sign-text">PIT</text>
            </g>
          )}
        </g>
      ))}
    </svg>
  );
}
