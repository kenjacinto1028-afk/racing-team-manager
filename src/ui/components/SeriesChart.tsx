import { useState } from 'react';

/** Small single-series line chart with hover readout. Values are plotted on a fixed 0-100 scale unless min/max given. */
export function SeriesChart({ points, min = 0, max = 100, label, height = 160 }: {
  points: { label: string; value: number }[]; min?: number; max?: number; label: string; height?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 520, H = height, P = { l: 36, r: 14, t: 12, b: 24 };
  const n = points.length;
  const x = (i: number) => P.l + (n <= 1 ? (W - P.l - P.r) / 2 : (i * (W - P.l - P.r)) / (n - 1));
  const y = (v: number) => P.t + ((max - v) / (max - min || 1)) * (H - P.t - P.b);
  const ticks = [max, Math.round((max + min) / 2), min];
  return (
    <svg className="fin-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} className="fin-grid" />
          <text x={P.l - 6} y={y(t) + 4} textAnchor="end" className="fin-axis">{t}</text>
        </g>
      ))}
      {n > 1 && <path d={points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.value)}`).join(' ')} className="fin-line" />}
      {points.map((p, i) => (
        <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
          <rect x={x(i) - 16} y={P.t} width={32} height={H - P.t - P.b} fill="transparent" />
          <circle cx={x(i)} cy={y(p.value)} r={hover === i ? 5 : 3.5} className="fin-dot" />
          <text x={x(i)} y={H - 6} textAnchor="middle" className="fin-axis">{p.label}</text>
        </g>
      ))}
      {hover !== null && (() => {
        const p = points[hover];
        const bx = Math.min(Math.max(x(hover) - 45, P.l), W - P.r - 90);
        const by = Math.max(2, y(p.value) - 42);
        return (
          <g pointerEvents="none">
            <rect x={bx} y={by} width={90} height={32} rx={6} className="fin-tip" />
            <text x={bx + 8} y={by + 13} className="fin-tip-label">{p.label}</text>
            <text x={bx + 8} y={by + 27} className="fin-tip-value">{p.value}</text>
          </g>
        );
      })()}
    </svg>
  );
}
