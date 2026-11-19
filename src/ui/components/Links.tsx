import type { ReactNode } from 'react';
import { useGameState } from '../hooks';
import { useNav } from '../nav';

/** Click a name to open their career page. */
export function DriverLink({ id, children, full }: { id: string; children?: ReactNode; full?: boolean }) {
  const { open } = useNav();
  const g = useGameState();
  const d = g.drivers[id];
  if (!d) return <>{children ?? '?'}</>;
  return (
    <button className="name-link" onClick={(e) => { e.stopPropagation(); open({ kind: 'driver', id }); }} title="Open career page">
      {children ?? (full ? <>{d.firstName} <b>{d.lastName}</b></> : d.lastName)}
    </button>
  );
}

export function StaffLink({ id, children }: { id: string; children?: ReactNode }) {
  const { open } = useNav();
  const g = useGameState();
  const p = g.staff[id];
  if (!p) return <>{children ?? '?'}</>;
  return <button className="name-link" onClick={(e) => { e.stopPropagation(); open({ kind: 'staff', id }); }} title="Open career page">{children ?? p.name}</button>;
}

export function TeamLink({ id, children }: { id: string; children: ReactNode }) {
  const { open } = useNav();
  return <button className="name-link" onClick={(e) => { e.stopPropagation(); open({ kind: 'team', id }); }} title="Open team history">{children}</button>;
}
