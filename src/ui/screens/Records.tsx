import { useState } from 'react';
import { FEATS } from '../../data/feats';
import { LEAGUES } from '../../data/leagues';
import { TRACKS } from '../../data/tracks';
import { recordBook, type BookRow } from '../../engine/records';
import type { Track } from '../../engine/types';
import { DataTable, type Column } from '../components/DataTable';
import { DriverLink, TeamLink } from '../components/Links';
import { Tip } from '../components/Tip';
import { Tabs, TeamName } from '../components/bits';
import { lapTime } from '../format';
import { useGameState } from '../hooks';

type Tab = 'book' | 'tracks' | 'feats';

/** All-time records across every league, track lap records and the player's badge wall. */
export function Records() {
  const g = useGameState();
  const [tab, setTab] = useState<Tab>('book');
  const book = recordBook(g);
  const got = Object.keys(g.feats ?? {}).length;

  const bookCols: Column<BookRow>[] = [
    { key: 'title', label: 'Record', sort: (r) => r.title, render: (r) => <b>{r.title}</b> },
    { key: 'holder', label: 'Holder', render: (r) => (!r.holder ? <span className="muted">Not set yet</span>
      : r.holderKind === 'team' ? <TeamLink id={r.holder}><TeamName team={g.teams[r.holder]} /></TeamLink> : <DriverLink id={r.holder} full />) },
    { key: 'value', label: 'Value', align: 'right', render: (r) => <span className="mono">{r.value} <span className="muted small">{/^\d+$/.test(r.value) ? r.detail : ''}</span></span> },
    { key: 'when', label: 'When', render: (r) => <span className="muted small">{r.value === '-' || /^\d+$/.test(r.value) ? '' : r.detail}</span> },
  ];

  const trackCols: Column<Track>[] = [
    { key: 'track', label: 'Track', sort: (t) => t.name, render: (t) => <span>{t.name} <span className="muted small">{t.country}</span></span> },
    { key: 'lap', label: 'Lap record', tip: 'lapRecord', align: 'right', sort: (t) => g.records.trackLaps[t.id]?.value ?? 1e9, render: (t) => { const r = g.records.trackLaps[t.id]; return r ? <span className="mono fastest">{lapTime(r.value)}</span> : <span className="muted">-</span>; } },
    { key: 'driver', label: 'Driver', sort: (t) => { const r = g.records.trackLaps[t.id]; return r ? g.drivers[r.driverId]?.lastName ?? '' : '~'; }, render: (t) => { const r = g.records.trackLaps[t.id]; return r ? <DriverLink id={r.driverId} full /> : null; } },
    { key: 'team', label: 'Team', render: (t) => { const r = g.records.trackLaps[t.id]; return r && g.teams[r.teamId] ? <TeamLink id={r.teamId}><TeamName team={g.teams[r.teamId]} short /></TeamLink> : null; } },
    { key: 'when', label: 'Set', sort: (t) => g.records.trackLaps[t.id]?.season ?? 999, render: (t) => { const r = g.records.trackLaps[t.id]; return r ? <span className="muted small">S{r.season} · {LEAGUES[r.tier]?.short}</span> : null; } },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <h1>Records</h1>
        <p>The all-time record book across every league, the fastest lap ever at each track, and your team's feats.</p>
      </div>
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[
        { id: 'book', label: 'Record book' },
        { id: 'tracks', label: 'Track records', count: Object.keys(g.records?.trackLaps ?? {}).length },
        { id: 'feats', label: 'Feats', count: got },
      ]} />
      {tab === 'book' && (
        <section className="card">
          <DataTable rows={book} columns={bookCols} rowKey={(r) => r.id} />
          <p className="muted small" style={{ marginTop: 12 }}>Counts every league and every season, including the one in progress. Titles count once a season is finished.</p>
        </section>
      )}
      {tab === 'tracks' && (
        <section className="card">
          <DataTable rows={TRACKS} columns={trackCols} rowKey={(t) => t.id} initialSort={{ key: 'track', dir: 'asc' }} />
        </section>
      )}
      {tab === 'feats' && (
        <section className="card">
          <h3><Tip k="feat">Feats</Tip> · {got} of {FEATS.length} unlocked</h3>
          <div className="feat-wall">
            {FEATS.map((f) => {
              const when = g.feats?.[f.id];
              return (
                <div key={f.id} className={'feat-badge' + (when ? ' on' : '')}>
                  <span className="ic">{when ? f.icon : '🔒'}</span>
                  <b>{f.name}</b>
                  <span className="muted small">{f.blurb}</span>
                  {when && <span className="feat-when">Season {when.season} · {when.year}</span>}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
