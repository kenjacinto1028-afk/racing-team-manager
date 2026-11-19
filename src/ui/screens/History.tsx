import { useState } from 'react';
import { LEAGUES, TIERS } from '../../data/leagues';
import type { TierId } from '../../engine/types';
import { Tabs } from '../components/bits';
import { DataTable, type Column } from '../components/DataTable';
import { DriverLink, TeamLink } from '../components/Links';
import { TeamName } from '../components/bits';
import { usePlayer } from '../hooks';
import { TeamProfile } from './Profile';

type Tab = 'team' | 'champions';

/** The player's team history and trophy cabinet, plus every past champion. */
export function History() {
  const { g, team } = usePlayer();
  const [tab, setTab] = useState<Tab>('team');
  const rows = [...g.history].reverse();
  type R = (typeof rows)[number];
  // One column per league: drivers' champion on top, teams' champion below.
  const tierCols = (tier: TierId): Column<R>[] => [
    { key: `c${tier}`, label: LEAGUES[tier].name.replace('Formula ', ''), tip: 'tiers', render: (h) => {
      const t = h.tables[tier]?.[0];
      if (!h.champions[tier] && !t) return <span className="muted">-</span>;
      return (
        <div className="champ-cell">
          <span>{h.champions[tier] ? <DriverLink id={h.champions[tier]!} /> : '-'}</span>
          <span className="small">{t && g.teams[t.teamId] ? <TeamLink id={t.teamId}><TeamName team={g.teams[t.teamId]} short /></TeamLink> : '-'}</span>
        </div>
      );
    } },
  ];
  const cols: Column<R>[] = [
    { key: 'season', label: 'Season', sort: (h) => h.season, render: (h) => <span>S{h.season} <span className="muted small">{h.year}</span></span> },
    ...TIERS.flatMap(tierCols),
  ];
  return (
    <div className="page">
      <div className="page-head">
        <h1>History</h1>
        <p>Every season your team has raced, your trophy cabinet, and the champions of every league (driver on top, team below). Click any name to open their career page.</p>
      </div>
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[{ id: 'team', label: team.name }, { id: 'champions', label: 'Champions', count: g.history.length }]} />
      {tab === 'team' && <TeamProfile id={team.id} embedded />}
      {tab === 'champions' && (
        <section className="card">
          <DataTable rows={rows} columns={cols} rowKey={(h) => String(h.season)} initialSort={{ key: 'season', dir: 'desc' }} empty="No finished seasons yet. Champions appear here after the first season review." />
        </section>
      )}
    </div>
  );
}
