import { useEffect, useLayoutEffect, useState } from 'react';
import { TOUR_STEPS } from '../../data/tutorial';
import { useNav } from '../nav';

interface Box { top: number; left: number; width: number; height: number }

/** Guided first-time tour. Skippable; the parent decides when to show it. */
export function Tutorial({ onClose }: { onClose: () => void }) {
  const { go } = useNav();
  const [i, setI] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const step = TOUR_STEPS[i];
  const last = i === TOUR_STEPS.length - 1;

  useEffect(() => { if (step.screen) go(step.screen); }, [i]); // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    const measure = () => {
      const el = step.target ? document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`) : null;
      if (!el) { setBox(null); return; }
      const r = el.getBoundingClientRect();
      setBox({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [i, step.target]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && !e.altKey) setI((n) => Math.min(n + 1, TOUR_STEPS.length - 1));
      if (e.key === 'ArrowLeft' && !e.altKey) setI((n) => Math.max(n - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const pad = 6;
  const style: React.CSSProperties = box
    ? {
        top: Math.min(Math.max(box.top, 16), window.innerHeight - 380),
        left: Math.min(box.left + box.width + 20, window.innerWidth - 420),
      }
    : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

  return (
    <div className="tour" role="dialog" aria-modal="true" aria-label="Tutorial">
      {box ? (
        <div className="tour-spot" style={{ top: box.top - pad, left: box.left - pad, width: box.width + pad * 2, height: box.height + pad * 2 }} />
      ) : (
        <div className="tour-dim" />
      )}
      <div className="tour-card" style={style}>
        <div className="tour-step">Step {i + 1} of {TOUR_STEPS.length}</div>
        <h2>{step.title}</h2>
        <p>{step.body}</p>
        {step.points && <ul>{step.points.map((p) => <li key={p}>{p}</li>)}</ul>}
        <div className="tour-dots">{TOUR_STEPS.map((_, n) => <i key={n} className={n === i ? 'on' : n < i ? 'done' : ''} />)}</div>
        <div className="tour-actions">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>{last ? 'Close' : 'Skip tour'}</button>
          <span className="topbar-spacer" />
          <button className="btn btn-sm" disabled={i === 0} onClick={() => setI(i - 1)}>‹ Back</button>
          <button className="btn btn-primary btn-sm" onClick={() => (last ? onClose() : setI(i + 1))}>{last ? 'Finish' : 'Next ›'}</button>
        </div>
      </div>
    </div>
  );
}
