import { useState } from 'react';
import { LEAGUES, MOVE_SPOTS, TIERS } from '../../data/leagues';
import { TRACK_BY_ID } from '../../data/tracks';
import { driverStandings, teamStandings, type StandingRow } from '../../engine/season';
import type { TierId } from '../../engine/types';
import { Pos, Tabs, TeamName } from '../components/bits';
import { DataTable, type Column } from '../components/DataTable';
import { Tip } from '../components/Tip';
import { FLAG } from '../format';
import { usePlayer } from '../hooks';

type Tab = 'teams' | 'drivers' | 'calendar';

export function Standings() {
  const { g, team, tier: myTier } = usePlayer();
  const [tier, setTier] = useState<TierId>(myTier);
  const [tab, setTab] = useState<Tab>('teams');
  const L = g.leagues[tier];
  const teams = teamStandings(L).map((r, i) => ({ ...r, pos: i + 1 }));
  const drivers = driverStandings(L).map((r, i) => ({ ...r, pos: i + 1 }));
  // Drivers with no results yet still appear.
  const listed = new Set(drivers.map((d) => d.id));
  L.teamIds.forEach((tid) => g.teams[tid].driverIds.forEach((id) => {
    if (!listed.has(id)) drivers.push({ id, teamId: tid, points: 0, wins: 0, podiums: 0, finishes: [], pos: drivers.length + 1 });
  }));

  const zone = (pos: number) => (tier > 1 && pos <= MOVE_SPOTS ? 'zone-up' : tier < 3 && pos > teams.length - MOVE_SPOTS ? 'zone-down' : '');

  type TRow = StandingRow & { pos: number };
  const teamCols: Column<TRow>[] = [
    { key: 'pos', label: 'Pos', tip: 'position', sort: (r) => r.pos, render: (r) => <Pos n={r.pos} />, width: 56 },
    { key: 'team', label: 'Team', sort: (r) => g.teams[r.id].name, render: (r) => <TeamName team={g.teams[r.id]} /> },
    { key: 'wins', label: 'Wins', tip: 'wins', align: 'center', sort: (r) => r.wins, render: (r) => r.wins },
    { key: 'pod', label: 'Podiums', tip: 'podium', align: 'center', sort: (r) => r.podiums, render: (r) => r.podiums },
    { key: 'pts', label: 'Points', tip: 'points', align: 'right', sort: (r) => r.points, render: (r) => <b>{r.points}</b> },
  ];
  const driverCols: Column<TRow>[] = [
    { key: 'pos', label: 'Pos', tip: 'position', sort: (r) => r.pos, render: (r) => <Pos n={r.pos} />, width: 56 },
    { key: 'driver', label: 'Driver', sort: (r) => g.drivers[r.id].lastName, render: (r) => { const d = g.drivers[r.id]; return <span>{FLAG[d.nationality]} {d.firstName} <b>{d.lastName}</b></span>; } },
    { key: 'team', label: 'Team', sort: (r) => g.teams[r.teamId].name, render: (r) => <TeamName team={g.teams[r.teamId]} short /> },
    { key: 'wins', label: 'Wins', tip: 'wins', align: 'center', sort: (r) => r.wins, render: (r) => r.wins },
    { key: 'pod', label: 'Podiums', tip: 'podium', align: 'center', sort: (r) => r.podiums, render: (r) => r.podiums },
    { key: 'pts', label: 'Points', tip: 'points', align: 'right', sort: (r) => r.points, render: (r) => <b>{r.points}</b> },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <h1>Standings</h1>
        <p>The <Tip k="constructors">teams' championship</Tip> decides <Tip k="promotion">promotion</Tip> and <Tip k="relegation">relegation</Tip>.</p>
      </div>
      <div className="filters">
        <div className="seg">
          {TIERS.map((t) => (
            <button key={t} className={t === tier ? 'on' : ''} onClick={() => setTier(t)}>
              {LEAGUES[t].name}{t === myTier ? ' ★' : ''}
            </button>
          ))}
        </div>
        <span className="muted small" style={{ marginLeft: 'auto' }}>Round {L.results.length} of {LEAGUES[tier].races}</span>
      </div>
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[{ id: 'teams', label: 'Teams' }, { id: 'drivers', label: 'Drivers' }, { id: 'calendar', label: 'Calendar' }]} />

      {tab === 'teams' && (
        <section className="card">
          <DataTable rows={teams} columns={teamCols} rowKey={(r) => r.id} rowClass={(r) => (r.id === team.id ? 'me ' : '') + zone(r.pos)} />
          <div className="legend">
            {tier > 1 && <span><i className="legend-up" /> Promotion</span>}
            {tier < 3 && <span><i className="legend-down" /> Relegation</span>}
          </div>
        </section>
      )}

      {tab === 'drivers' && (
        <section className="card">
          <DataTable rows={drivers} columns={driverCols} rowKey={(r) => r.id} rowClass={(r) => (r.teamId === team.id ? 'me' : undefined)} />
        </section>
      )}

      {tab === 'calendar' && (
        <section className="card">
          <table className="data">
            <thead><tr><th><Tip text="Round: the race's number in the season.">Rd</Tip></th><th><Tip k="week">Week</Tip></th><th>Track</th><th>Laps</th><th>Winner</th><th>{tier === myTier ? 'Your best' : 'Pole sitter'}</th></tr></thead>
            <tbody>
              {L.calendar.map((tid, i) => {
                const t = TRACK_BY_ID[tid];
                const res = L.results[i];
                const win = res?.entries[0];
                const mine = res?.entries.filter((e) => e.teamId === team.id).sort((a, b) => a.position - b.position)[0];
                const pole = res?.entries.find((e) => e.grid === 1);
                return (
                  <tr key={tid} className={i === L.results.length ? 'next' : ''}>
                    <td>{i + 1}</td>
                    <td className="muted">Wk {L.weeks[i]}</td>
                    <td><b>{t.name}</b> <span className="muted small">{t.country}</span></td>
                    <td>{t.laps}</td>
                    <td>{win ? <span>{g.drivers[win.driverId].lastName} <span className="muted small">({g.teams[win.teamId].short})</span></span> : i === L.results.length ? <span className="tag">Next</span> : <span className="muted">-</span>}</td>
                    <td>{tier === myTier ? (mine ? (mine.dnf ? 'DNF' : `P${mine.position}`) : '-') : pole ? g.drivers[pole.driverId].lastName : '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
