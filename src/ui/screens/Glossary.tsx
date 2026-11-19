import { useMemo, useState } from 'react';
import { GLOSSARY, type GlossaryCategory } from '../../data/glossary';
import { Tabs } from '../components/bits';

const CATS: (GlossaryCategory | 'All')[] = ['All', 'Racing', 'Driver', 'Car', 'Staff', 'Season', 'Money'];

export function Glossary() {
  const [cat, setCat] = useState<GlossaryCategory | 'All'>('All');
  const [q, setQ] = useState('');
  const entries = useMemo(() => Object.values(GLOSSARY).sort((a, b) => a.term.localeCompare(b.term)), []);
  const shown = entries.filter((e) => (cat === 'All' || e.category === cat) &&
    (!q || `${e.term} ${e.short}`.toLowerCase().includes(q.toLowerCase())));

  return (
    <div className="page">
      <div className="page-head">
        <h1>Glossary</h1>
        <p>Every racing term in plain English. Hover any dotted-underlined word in the game to see the same explanation.</p>
      </div>
      <div className="filters">
        <input className="search" placeholder="Search terms…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search glossary" />
        <span className="muted small" style={{ marginLeft: 'auto' }}>{shown.length} terms</span>
      </div>
      <Tabs value={cat} onChange={setCat} tabs={CATS.map((c) => ({ id: c, label: c, count: c === 'All' ? entries.length : entries.filter((e) => e.category === c).length }))} />
      {shown.length === 0 ? <div className="placeholder">No terms match “{q}”.</div> : (
        <div className="glossary-grid">
          {shown.map((e) => (
            <article key={e.term} className="card glossary-card">
              <div className="glossary-cat">{e.category}</div>
              <h3 className="glossary-term">{e.term}</h3>
              <p>{e.short}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
