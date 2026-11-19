import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Team } from '../../engine/types';

export function Tabs<T extends string>({ tabs, value, onChange }: {
  tabs: { id: T; label: ReactNode; count?: number }[]; value: T; onChange: (id: T) => void;
}) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={t.id === value} className={'tab' + (t.id === value ? ' active' : '')} onClick={() => onChange(t.id)}>
          {t.label}
          {t.count !== undefined && <span className="tab-count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function TeamName({ team, short, bold }: { team: Team; short?: boolean; bold?: boolean }) {
  return (
    <span className={'team-name' + (team.isPlayer ? ' is-player' : '')} style={{ fontWeight: bold ? 600 : undefined }}>
      <i className="team-swatch" style={{ background: `linear-gradient(135deg, ${team.colors.primary} 60%, ${team.colors.secondary} 60%)` }} />
      {short ? team.short : team.name}
    </span>
  );
}

/** Button that asks "Sure?" on first click; acts on the second. */
export function ConfirmButton({ children, onConfirm, className, disabled, confirmText = 'Confirm?' }: {
  children: ReactNode; onConfirm: () => void; className?: string; disabled?: boolean; confirmText?: string;
}) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (
    <button
      className={(className ?? 'btn') + (armed ? ' btn-danger' : '')}
      disabled={disabled}
      onClick={() => {
        if (armed) { setArmed(false); onConfirm(); return; }
        setArmed(true);
        timer.current = window.setTimeout(() => setArmed(false), 3000);
      }}
    >
      {armed ? confirmText : children}
    </button>
  );
}

/** Short-lived message after an action. */
export function useFlash(): [ReactNode, (msg: string, kind?: 'good' | 'bad') => void] {
  const [msg, setMsg] = useState<{ text: string; kind: 'good' | 'bad'; n: number } | null>(null);
  useEffect(() => {
    if (!msg) return;
    const t = window.setTimeout(() => setMsg(null), 3500);
    return () => window.clearTimeout(t);
  }, [msg]);
  const node = msg ? <div key={msg.n} className={`flash flash-${msg.kind}`} role="status">{msg.text}</div> : null;
  return [node, (text, kind = 'good') => setMsg({ text, kind, n: Date.now() })];
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="placeholder">{children}</div>;
}

export function Pos({ n }: { n: number }) {
  return <span className={'pos' + (n === 1 ? ' p1' : n === 2 ? ' p2' : n === 3 ? ' p3' : '')}>{n}</span>;
}
