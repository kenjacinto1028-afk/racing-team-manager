import type { ReactNode } from 'react';
import { gloss } from '../../data/glossary';

/** Hover/focus tooltip. Pass a glossary key (`k`) or your own `text`. */
export function Tip({ k, text, children, plain }: { k?: string; text?: string; children?: ReactNode; plain?: boolean }) {
  const g = k ? gloss(k) : undefined;
  const body = text ?? g?.short;
  const label = children ?? g?.term ?? k;
  if (!body) return <>{label}</>;
  return (
    <span className={'tip' + (plain ? ' tip-plain' : '')} tabIndex={0}>
      {label}
      <span className="tip-body" role="tooltip">
        {g && !text && <b>{g.term}</b>}
        {body}
      </span>
    </span>
  );
}
