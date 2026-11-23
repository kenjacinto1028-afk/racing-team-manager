import { cornerCounts, strategyHint } from '../../engine/trackInfo';
import type { Track } from '../../engine/types';
import { Tip } from './Tip';
import { TrackProfile } from './TrackProfile';

/** Track facts and strategy advice. Shown before every race so the player can plan tyres and stops. */
export function TrackPreview({ track, compact = false }: { track: Track; compact?: boolean }) {
  const c = cornerCounts(track);
  const h = strategyHint(track);
  return (
    <div className="track-preview">
      <TrackProfile track={track} />
      <div className="list-row"><span><Tip k="corners">Corners</Tip></span><b>{c.slow} slow · {c.medium} medium · {c.fast} fast</b></div>
      <p className="muted small"><b>{h.headline}</b></p>
      {!compact && (
        <ul className="muted small" style={{ margin: '4px 0 0', paddingLeft: 18 }}>
          <li>{h.tyres}</li>
          <li>{h.stops}</li>
          <li>{h.passing}</li>
        </ul>
      )}
    </div>
  );
}
