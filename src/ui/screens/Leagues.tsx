import { useState } from 'react';
import { LEAGUES, SIDE_SERIES_TIERS, TIERS } from '../../data/leagues';
import { SIDE_SERIES, type SideDef } from '../../data/sideSeries';
import { TRACK_BY_ID } from '../../data/tracks';
import { teamStandings } from '../../engine/season';
import { canEnter, sideFee, sidePrize, sideRounds, sideRunning, sideStandings, sideTracks, type SideRow } from '../../engine/sideSeries';
import type { RaceResult, SideState } from '../../engine/types';
import { useGame } from '../../store/gameStore';
import { DataTable, type Column } from '../components/DataTable';
import { DriverLink, TeamLink } from '../components/Links';
import { Tip } from '../components/Tip';
import { Pos, Tabs, TeamName, useFlash } from '../components/bits';
import { money, ordinal } from '../format';
import { usePlayer } from '../hooks';
import { useNav } from '../nav';

type Tab = 'ladder' | 'side';

/** The 5-league ladder and the side championships for the lower leagues. */
export function Leagues() {
  const { g, team } = usePlayer();
  const [tab, setTab] = useState<Tab>('ladder');
  const entered = g.side?.season === g.season ? g.side.entered.length : 0;
  return (
    <div className="page">
      <div className="page-head">
        <h1>Leagues</h1>
        <p>Five <Tip k="tiers">leagues</Tip> from Formula Rookie to Formula Prime. Finish top 2 to move up, bottom 2 to drop down. Lower-league teams can also enter <Tip k="sideSeries">side series</Tip>.</p>
      </div>
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[{ id: 'ladder', label: 'The ladder' }, { id: 'side', label: 'Side series', count: entered }]} />
      {tab === 'ladder' ? <Ladder /> : <SideSeries key={team.tier} />}
      {g.side?.last && tab === 'side' && <LastSeason last={g.side.last} />}
    </div>
  );
}

function Ladder() {
  const { g, team } = usePlayer();
  const { go } = useNav();
  return (
    <div className="ladder">
      {TIERS.map((t) => {
        const L = LEAGUES[t];
        const table = teamStandings(g.leagues[t]);
        const leader = table[0];
        const mine = t === team.tier;
        const pos = mine ? table.findIndex((r) => r.id === team.id) + 1 : 0;
        const started = g.leagues[t].results.length > 0;
        return (
          <section key={t} className={'card ladder-rung' + (mine ? ' mine' : '')} style={mine ? { ['--team' as string]: team.colors.primary } : undefined}>
            <div className="rung-tier"><span>Tier</span><b>{t}</b></div>
            <div className="rung-main">
              <h3>{L.name} {mine && <span className="tag">You are here</span>} {SIDE_SERIES_TIERS.includes(t) && <span className="badge"><Tip k="sideSeries" plain>Side series</Tip></span>}</h3>
              <div className="muted small">{L.races} races · 10 teams · round {g.leagues[t].results.length} of {L.races}</div>
            </div>
            <div className="rung-stat"><span className="stat-label"><Tip k="prizeMoney">Title prize</Tip></span><b>{money(L.prizeMoney[0])}</b></div>
            <div className="rung-stat"><span className="stat-label"><Tip k="overall">Driver level</Tip></span><b>{L.driverRange[0]}-{L.driverRange[1]}</b></div>
            <div className="rung-stat"><span className="stat-label">{mine ? 'Your position' : 'Leader'}</span>
              <b>{mine ? (started ? ordinal(pos) : '-') : started && leader ? <TeamLink id={leader.id}><TeamName team={g.teams[leader.id]} short /></TeamLink> : '-'}</b>
            </div>
            <button className="btn btn-sm" onClick={() => go('standings')}>Standings ›</button>
          </section>
        );
      })}
    </div>
  );
}

function SideSeries() {
  const { g, team } = usePlayer();
  const enter = useGame((s) => s.enterSide);
  const [flash, show] = useFlash();
  if (!SIDE_SERIES_TIERS.includes(team.tier)) {
    return <section className="card"><p className="muted">Side series are for Academy, Regional and Rookie teams. {team.name} races in {LEAGUES[team.tier].name} now, so they're closed to you.</p></section>;
  }
  const side: SideState = g.side?.season === g.season ? g.side : { season: g.season, entered: [], results: {} };
  return (
    <>
      {flash}
      <div className="side-grid">
        {SIDE_SERIES.map((d) => {
          const isIn = side.entered.includes(d.id);
          const check = canEnter(g, d.id);
          const results = side.results[d.id] ?? [];
          const rounds = sideRounds(g, d.id);
          return (
            <section key={d.id} className={'card side-card' + (isIn ? ' in' : '')}>
              <div className="side-head">
                <span className="side-icon">{d.icon}</span>
                <div>
                  <h3>{d.name}</h3>
                  <div className="muted small">{d.when}{d.id !== 'winter' && <> (after round{rounds.length > 1 ? 's' : ''} {rounds.join(', ')})</>}</div>
                </div>
              </div>
              <p className="small">{d.blurb}</p>
              <div className="side-stats">
                <div><span className="stat-label"><Tip k="entryFee">Entry fee</Tip></span><b>{money(sideFee(g, d.id))}</b></div>
                <div><span className="stat-label">Costs per race</span><b>{money(sideRunning(g, d.id))}</b></div>
                <div><span className="stat-label">Win prize</span><b className="good">{money(sidePrize(g, d.id, 1))}</b></div>
                <div><span className="stat-label">Races</span><b>{d.races}</b></div>
              </div>
              <Extras d={d} />
              <div className="side-tracks small muted">Tracks: {sideTracks(g, d.id).map((id) => TRACK_BY_ID[id]?.name).join(', ')}</div>
              <div className="side-action">
                {isIn ? (
                  <span className="good"><b>✓ Entered</b> · {results.length} of {d.races} raced</span>
                ) : check.ok ? (
                  <button className="btn btn-primary" onClick={() => { const r = enter(d.id); show(r.ok ? `Entered the ${d.name}` : r.reason, r.ok ? 'good' : 'bad'); }}>Enter for {money(sideFee(g, d.id))}</button>
                ) : (
                  <span className="muted small">{check.reason}</span>
                )}
              </div>
              {results.length > 0 && <SideResults results={results} />}
            </section>
          );
        })}
      </div>
    </>
  );
}

function Extras({ d }: { d: SideDef }) {
  const bits: string[] = [];
  if (d.shared) bits.push('One car, two drivers');
  if (d.lapsMult !== 1) bits.push(`${d.lapsMult}× race distance`);
  if (d.crashMult > 1) bits.push(`${d.crashMult}× crash risk`);
  if (d.wearMult > 0) bits.push(`${d.wearMult === 1 ? 'Normal' : d.wearMult + '×'} engine wear`);
  else bits.push('Spare car: no engine wear');
  bits.push(d.id === 'winter' ? '+1 experience per race (age 22 and under)' : '+1 experience per race');
  return <div className="chips">{bits.map((b) => <span key={b} className="chip">{b}</span>)}</div>;
}

function SideResults({ results }: { results: RaceResult[] }) {
  const { g, team } = usePlayer();
  const rows = sideStandings(results).map((r, i) => ({ ...r, pos: i + 1 }));
  const cols: Column<SideRow & { pos: number }>[] = [
    { key: 'pos', label: 'Pos', sort: (r) => r.pos, render: (r) => <Pos n={r.pos} />, width: 48 },
    { key: 'team', label: 'Team', render: (r) => (g.teams[r.teamId] ? <TeamLink id={r.teamId}><TeamName team={g.teams[r.teamId]} short /></TeamLink> : '-') },
    { key: 'wins', label: 'Wins', tip: 'wins', align: 'center', sort: (r) => r.wins, render: (r) => r.wins },
    { key: 'pts', label: 'Pts', tip: 'points', align: 'right', sort: (r) => r.points, render: (r) => <b>{r.points}</b> },
  ];
  return (
    <div className="side-results">
      <div className="race-list">
        {results.map((r) => {
          const mine = r.entries.filter((e) => e.teamId === team.id && !e.dnf).sort((a, b) => a.position - b.position)[0];
          const win = r.entries[0];
          return (
            <div key={r.round} className="list-row">
              <span>R{r.round} · {TRACK_BY_ID[r.trackId]?.name}</span>
              <span className="small">Won by <DriverLink id={win.driverId} /> · you: <b>{mine ? `P${mine.position}` : 'DNF'}</b></span>
            </div>
          );
        })}
      </div>
      <DataTable rows={rows.slice(0, 6)} columns={cols} rowKey={(r) => r.id} rowClass={(r) => (r.teamId === team.id ? 'me' : undefined)} />
    </div>
  );
}

function LastSeason({ last }: { last: Omit<SideState, 'last'> }) {
  const { g, team } = usePlayer();
  const done = SIDE_SERIES.filter((d) => (last.results[d.id] ?? []).length);
  if (!done.length) return null;
  return (
    <section className="card" style={{ marginTop: 16 }}>
      <h3>Last season (Season {last.season})</h3>
      {done.map((d) => {
        const rows = sideStandings(last.results[d.id]!);
        const pos = rows.findIndex((r) => r.teamId === team.id) + 1;
        const champ = rows[0];
        return (
          <div key={d.id} className="list-row">
            <span>{d.icon} {d.name}</span>
            <span className="small">Champion: {g.teams[champ.teamId] ? <TeamName team={g.teams[champ.teamId]} short /> : '-'} · you: <b>{pos ? ordinal(pos) : '-'}</b></span>
          </div>
        );
      })}
    </section>
  );
}
