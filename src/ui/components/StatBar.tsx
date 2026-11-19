import { ratingColor } from '../format';
import { Tip } from './Tip';

/** Labelled 0-100 bar. `compare` draws a thin marker (e.g. the league average). */
export function StatBar({ label, k, value, compare, compareLabel, color }: {
  label?: string; k?: string; value: number; compare?: number; compareLabel?: string; color?: string;
}) {
  return (
    <div className="statbar">
      <div className="statbar-head">
        <span className="statbar-label">{k ? <Tip k={k}>{label}</Tip> : label}</span>
        <span className="statbar-value">{Math.round(value)}</span>
      </div>
      <div className="statbar-track">
        <i style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color ?? ratingColor(value) }} />
        {compare !== undefined && (
          <span className="statbar-mark" style={{ left: `${compare}%` }} title={compareLabel ?? `Compare: ${Math.round(compare)}`} />
        )}
      </div>
    </div>
  );
}

/** Small inline number pill coloured by rating. */
export function Rating({ v, k }: { v: number; k?: string }) {
  const pill = <span className="rating" style={{ color: ratingColor(v), borderColor: ratingColor(v) }}>{Math.round(v)}</span>;
  return k ? <Tip k={k} plain>{pill}</Tip> : pill;
}
