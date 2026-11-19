import { useEffect, useState } from 'react';
import { driverOffer, offerValue, preferredYears, type ContractOffer, type TalkReply } from '../../engine/market';
import { signingFee } from '../../engine/finance';
import type { Driver } from '../../engine/types';
import { useGame } from '../../store/gameStore';
import { money } from '../format';
import { usePlayer } from '../hooks';
import { Tip } from './Tip';

/** Contract talks with a free-agent driver: offer, see the reply, accept a counter. */
export function ContractTalks({ d, onClose, onSigned }: { d: Driver; onClose: () => void; onSigned: (msg: string) => void }) {
  const { g, team } = usePlayer();
  const offerContract = useGame((s) => s.offerContract);
  const ask = driverOffer(g, team.id, d.id).salary;
  const [o, setO] = useState<ContractOffer>({ salary: Math.round(ask * 0.9 / 1000) * 1000, years: preferredYears(d.age), winBonus: 0, podiumBonus: 0 });
  const [reply, setReply] = useState<TalkReply | { kind: 'error'; note: string } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const value = offerValue(g, team.id, d.id, o);
  const fee = signingFee(o.salary);
  const num = (k: keyof ContractOffer) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setO({ ...o, [k]: Math.max(0, Number(e.target.value) || 0) });

  const send = (offer: ContractOffer) => {
    const r = offerContract(d.id, offer);
    setReply(r);
    if (r.kind === 'accept') { onSigned(`${d.firstName} ${d.lastName} signed for ${offer.years} season(s) at ${money(offer.salary)}/race.`); onClose(); }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal talks" role="dialog" aria-label={`Contract talks with ${d.lastName}`} onClick={(e) => e.stopPropagation()}>
        <span className="tag">Contract talks</span>
        <h2>{d.firstName} {d.lastName}</h2>
        <p className="small" style={{ margin: 0 }}>
          Asking about <b>{money(ask)}</b>/race and prefers <b>{preferredYears(d.age)}</b> season{preferredYears(d.age) > 1 ? 's' : ''}.
          {' '}<Tip k="winBonus">Win</Tip> and <Tip k="podiumBonus">podium</Tip> bonuses count for something, depending on how often the driver expects to use them.
        </p>
        <div className="talks-grid">
          <label><Tip k="salary">Salary per race</Tip><input type="number" step={1000} value={o.salary} onChange={num('salary')} /></label>
          <label><Tip k="contract">Length</Tip>
            <select value={o.years} onChange={num('years')}>{[1, 2, 3].map((y) => <option key={y} value={y}>{y} season{y > 1 ? 's' : ''}</option>)}</select>
          </label>
          <label><Tip k="winBonus">Win bonus</Tip><input type="number" step={1000} value={o.winBonus} onChange={num('winBonus')} /></label>
          <label><Tip k="podiumBonus">Podium bonus</Tip><input type="number" step={1000} value={o.podiumBonus} onChange={num('podiumBonus')} /></label>
        </div>
        <div className="contract-row small">
          <span><Tip k="signingFee">Signing fee</Tip> <b className={fee > team.budget ? 'bad' : ''}>{money(fee)}</b></span>
          <span>Offer strength <b className={value >= 0.98 ? 'good' : value >= 0.8 ? 'warn' : 'bad'}>{Math.round(value * 100)}%</b></span>
        </div>
        {reply && reply.kind !== 'accept' && (
          <div className="talk-reply">
            {reply.kind === 'counter' ? (
              <>
                <div><Tip k="counterOffer">Counter-offer</Tip>: {reply.note}</div>
                <div className="muted small" style={{ margin: '6px 0' }}>{money(reply.offer.salary)}/race · {reply.offer.years} season(s) · win {money(reply.offer.winBonus)} · podium {money(reply.offer.podiumBonus)}</div>
                <button className="btn btn-sm btn-primary" onClick={() => send(reply.offer)}>Accept counter</button>
              </>
            ) : <span className="bad">{reply.note}</span>}
          </div>
        )}
        <div className="btn-row">
          <button className="btn btn-primary" disabled={fee > team.budget} onClick={() => send(o)}>Make offer</button>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
