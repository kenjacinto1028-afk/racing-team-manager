import { useState } from 'react';
import { FEATS } from '../../data/feats';
import { LEAGUES, TIERS } from '../../data/leagues';
import { TRACKS } from '../../data/tracks';
import { recordBook, type BookRow } from '../../engine/records';
import type { RecordEntry, TierId, Track } from '../../engine/types';
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
  const [tier, setTier] = useState<TierId | 0>(0);
  const [trackId, setTrackId] = useState('');
  const book = recordBook(g, tier || undefined);
  /** A track's leaderboard for the chosen league (or all leagues), fastest first. */
  const board = (id: string): RecordEntry[] => (g.records.trackTop?.[id] ?? []).filter((e) => !tier || e.tier === tier).sort((a, b) => a.value - b.value).slice(0, 20);
  const trackRows = TRACKS.filter((t) => board(t.id).length > 0);
  const best = (id: string) => board(id)[0];
  const top = trackId ? board(trackId) : [];
  const lapCols: Column<RecordEntry & { rank: number }>[] = [
    { key: 'rank', label: '#', sort: (r) => r.rank, width: 44, render: (r) => <span className="mono">{r.rank}</span> },
    { key: 'driver', label: 'Driver', sort: (r) => g.drivers[r.driverId]?.lastName ?? '', render: (r) => <DriverLink id={r.driverId} full /> },
    { key: 'team', label: 'Team', render: (r) => g.teams[r.teamId] ? <TeamLink id={r.teamId}><TeamName team={g.teams[r.teamId]} short /></TeamLink> : null },
    { key: 'lap', label: 'Lap', tip: 'lapRecord', align: 'right', sort: (r) => r.value, render: (r) => <span className={'mono' + (r.rank === 1 ? ' fastest' : '')}>{lapTime(r.value)}</span> },
    { key: 'gap', label: 'Gap', align: 'right', sort: (r) => r.value, render: (r) => <span className="mono muted">{r.rank === 1 ? '-' : `+${(r.value - top[0].value).toFixed(3)}`}</span> },
    { key: 'when', label: 'Set', sort: (r) => r.season, render: (r) => <span className="muted small">S{r.season} · {LEAGUES[r.tier]?.short}</span> },
  ];
  const got = Object.keys(g.feats ?? {}).length;

  const bookCols: Column<BookRow>[] = [
    { key: 'title', label: 'Record', sort: (r) => r.title, render: (r) => <b>{r.title}</b> },
    { key: 'holder', label: 'Holder', render: (r) => (!r.holder ? <span className="muted">Not set yet</span>
      : r.holderKind === 'team' ? <TeamLink id={r.holder}><TeamName team={g.teams[r.holder]} /></TeamLink> : <DriverLink id={r.holder} full />) },
    { key: 'value', label: 'Value', align: 'right', render: (r) => <span className="mono">{r.value} <span className="muted small">{/^\d+$/.test(r.value) ? r.detail : ''}</span></span> },
    { key: 'when', label: 'When', render: (r) => <span className="muted small">{r.value === '-' || /^\d+$/.test(r.value) ? '' : r.detail}</span> },
  ];

  const trackCols: Column<Track>[] = [
    { key: 'track', label: 'Track', sort: (t) => t.name, render: (t) => <span className="link" style={{ cursor: 'pointer' }} onClick={() => setTrackId(t.id)}>{t.name} <span className="muted small">{t.country}</span></span> },
    { key: 'lap', label: 'Lap record', tip: 'lapRecord', align: 'right', sort: (t) => best(t.id)?.value ?? 1e9, render: (t) => { const r = best(t.id); return r ? <span className="mono fastest">{lapTime(r.value)}</span> : <span className="muted">-</span>; } },
    { key: 'driver', label: 'Driver', sort: (t) => { const r = best(t.id); return r ? g.drivers[r.driverId]?.lastName ?? '' : '~'; }, render: (t) => { const r = best(t.id); return r ? <DriverLink id={r.driverId} full /> : null; } },
    { key: 'team', label: 'Team', render: (t) => { const r = best(t.id); return r && g.teams[r.teamId] ? <TeamLink id={r.teamId}><TeamName team={g.teams[r.teamId]} short /></TeamLink> : null; } },
    { key: 'when', label: 'Set', sort: (t) => best(t.id)?.season ?? 999, render: (t) => { const r = best(t.id); return r ? <span className="muted small">S{r.season} · {LEAGUES[r.tier]?.short}</span> : null; } },
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
      {tab !== 'feats' && (
        <div className="filters">
          <span className="muted small">League</span>
          <div className="seg seg-sm">
            <button className={tier === 0 ? 'on' : ''} onClick={() => setTier(0)}>All</button>
            {TIERS.map((t) => <button key={t} className={tier === t ? 'on' : ''} onClick={() => setTier(t)}>{LEAGUES[t].short}</button>)}
          </div>
          {tab === 'tracks' && (
            <>
              <span className="muted small">Track</span>
              <select value={trackId} onChange={(e) => setTrackId(e.target.value)} style={{ background: 'var(--surface-2)', border: '1px solid var(--border-strong)', color: 'var(--text)', borderRadius: 8, padding: '6px 10px', font: 'inherit' }}>
                <option value="">All tracks (best lap each)</option>
                {trackRows.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </>
          )}
        </div>
      )}
      {tab === 'book' && (
        <section className="card">
          <DataTable rows={book} columns={bookCols} rowKey={(r) => r.id} rowClass={(r) => (r.holder && (r.holderKind === 'team' ? r.holder : g.drivers[r.holder]?.teamId) === g.playerTeamId ? 'me' : undefined)} />
          <p className="muted small" style={{ marginTop: 12 }}>Counts every league and every season, including the one in progress. Titles count once a season is finished.</p>
        </section>
      )}
      {tab === 'tracks' && (
        <section className="card">
          {trackId && top.length > 0 ? (
            <>
              <h3>{TRACKS.find((t) => t.id === trackId)?.name} · top {top.length} laps</h3>
              <DataTable rows={top.map((e, i) => ({ ...e, rank: i + 1 }))} columns={lapCols} rowKey={(r) => r.driverId + r.tier} rowClass={(r) => (r.teamId === g.playerTeamId ? 'me' : undefined)} initialSort={{ key: 'lap', dir: 'asc' }} />
              <p className="muted small" style={{ marginTop: 12 }}>Each driver's best lap here. Pick a league above to see its own top 20. Click a column to sort.</p>
            </>
          ) : (
            <>
              <DataTable rows={trackRows} columns={trackCols} rowKey={(t) => t.id} rowClass={(t) => (best(t.id)?.teamId === g.playerTeamId ? 'me' : undefined)} initialSort={{ key: 'track', dir: 'asc' }} empty="No laps set in this league yet." />
              <p className="muted small" style={{ marginTop: 12 }}>Click a track name (or use the Track menu) to see its top 20 laps.</p>
            </>
          )}
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
