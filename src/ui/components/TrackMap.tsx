import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { RaceState } from '../../engine/raceSim';
import { order } from '../../engine/raceSim';
import type { Team, Track } from '../../engine/types';

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

/**
 * Live map. Each car sits behind the leader by (gap / lap time) of a lap.
 * `progress` (0-1) animates the leader through the current lap between ticks.
 */
export function TrackMap({ track, race, teams, playerTeamId, progress, mini }: {
  track: Track; race?: RaceState; teams: Record<string, Team>; playerTeamId: string; progress?: number; mini?: boolean;
}) {
  const d = useMemo(() => smoothPath(track.path), [track]);
  const pathRef = useRef<SVGPathElement>(null);
  const [len, setLen] = useState(0);
  useLayoutEffect(() => { if (pathRef.current) setLen(pathRef.current.getTotalLength()); }, [d]);
  // Re-render each animation frame is driven by the parent via `progress`.
  const [, force] = useState(0);
  useEffect(() => { if (len === 0) force((x) => x + 1); }, [len]);

  const dots: { id: string; x: number; y: number; color: string; ring: string; me: boolean; label: string; pos: number }[] = [];
  if (race && pathRef.current && len > 0) {
    const ord = order(race.cars).filter((c) => !c.dnf);
    const leader = ord[0];
    const ref = leader ? (leader.lastLap || track.baseLapTime) : track.baseLapTime;
    const lead = race.finished ? 0 : (progress ?? 0);
    ord.forEach((c, i) => {
      const behind = leader ? (c.totalTime - leader.totalTime) / ref : 0;
      let f = (lead - behind) % 1;
      if (f < 0) f += 1;
      const pt = pathRef.current!.getPointAtLength(f * len);
      const team = teams[c.c.teamId];
      dots.push({
        id: c.c.driverId, x: pt.x, y: pt.y, color: team.colors.primary, ring: team.colors.secondary,
        me: c.c.teamId === playerTeamId, label: c.c.name.slice(0, 3).toUpperCase(), pos: i + 1,
      });
    });
    dots.reverse(); // leader drawn last, on top
  }
  const start = track.path[0];

  return (
    <svg className={'trackmap' + (mini ? ' mini' : '')} viewBox="-6 -6 112 112" role="img" aria-label={`${track.name} track map`}>
      <path d={d} className="track-outline" />
      <path d={d} className="track-surface" ref={pathRef} />
      <circle cx={start[0]} cy={start[1]} r={2.2} className="track-start" />
      {dots.map((c) => (
        <g key={c.id} transform={`translate(${c.x} ${c.y})`} className={c.me ? 'car me' : 'car'}>
          {c.me && <circle r={4.4} className="car-halo" />}
          <circle r={2.6} fill={c.color} stroke={c.ring} strokeWidth={0.8} />
          {(c.me || c.pos <= 3) && !mini && <text y={-4.2} className="car-label">{c.label}</text>}
        </g>
      ))}
    </svg>
  );
}
