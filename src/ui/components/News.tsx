import { TRACK_BY_ID } from '../../data/tracks';
import { FEAT_BY_ID } from '../../data/feats';
import type { RecordBreak } from '../../engine/records';
import { DriverLink } from './Links';
import { Tip } from './Tip';

/** Records that fell and feats unlocked, shown after a race or season. */
export function NewsBanner({ records = [], feats = [], title }: { records?: RecordBreak[]; feats?: string[]; title?: string }) {
  if (!records.length && !feats.length) return null;
  return (
    <section className="card news-card">
      {title && <h3>{title}</h3>}
      {records.map((r, i) => (
        <div key={`r${i}`} className="news-row record">
          <span className="news-icon">⏱</span>
          <span><Tip k={r.kind === 'lap' ? 'lapRecord' : 'recordBook'}>{r.label}</Tip>: <DriverLink id={r.driverId} full />, {r.detail} <span className="muted small">at {TRACK_BY_ID[r.trackId]?.name}</span></span>
        </div>
      ))}
      {feats.map((id) => FEAT_BY_ID[id] && (
        <div key={id} className="news-row feat">
          <span className="news-icon">{FEAT_BY_ID[id].icon}</span>
          <span><Tip k="feat">Feat unlocked</Tip>: <b>{FEAT_BY_ID[id].name}</b> <span className="muted small">{FEAT_BY_ID[id].blurb}</span></span>
        </div>
      ))}
    </section>
  );
}
