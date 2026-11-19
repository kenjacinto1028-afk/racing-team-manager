import { LEAGUES } from '../../data/leagues';
import {
  careerRecords, driverCareerRows, driverTrophies, staffCareerRows, teamHistory, teamTrophies, type Trophy,
} from '../../engine/careers';
import { carOverall, driverOverall } from '../../engine/generate';
import { effectiveCar } from '../../engine/car';
import { potentialRange } from '../../engine/scouting';
import type { Driver, TierId } from '../../engine/types';
import { DataTable, type Column } from '../components/DataTable';
import { DriverLink, StaffLink, TeamLink } from '../components/Links';
import { SeriesChart } from '../components/SeriesChart';
import { StatBar } from '../components/StatBar';
import { Tip } from '../components/Tip';
import { Empty, Pos, TeamName } from '../components/bits';
import { FLAG, money, ordinal, ROLE_LABEL } from '../format';
import { useGameState } from '../hooks';
import { useNav } from '../nav';
import { MoraleBar, TraitChips } from './Development';

const STATS: { k: keyof Driver & string; label: string }[] = [
  { k: 'pace', label: 'Pace' }, { k: 'consistency', label: 'Consistency' }, { k: 'racecraft', label: 'Racecraft' },
  { k: 'tyreManagement', label: 'Tyre management' }, { k: 'experience', label: 'Experience' },
];

const TROPHY_ICON: Record<Trophy['kind'], string> = { title: '🏆', teamTitle: '🏆', promotion: '⬆', win: '🥇', podium: '🥉' };

export function TrophyShelf({ trophies, empty }: { trophies: Trophy[]; empty: string }) {
  if (!trophies.length) return <p className="muted small">{empty}</p>;
  return (
    <div className="trophy-shelf">
      {trophies.map((t, i) => (
        <div key={i} className={'trophy ' + t.kind}>
          <span className="ic" aria-hidden>{TROPHY_ICON[t.kind]}</span>
          <b>{t.label}</b>
          <span className="muted small">Season {t.season} · {t.year}</span>
        </div>
      ))}
    </div>
  );
}

const leagueShort = (t: TierId) => LEAGUES[t]?.short ?? `T${t}`;

export function Profile() {
  const { profile } = useNav();
  if (!profile) return <div className="page"><Empty><p>Nothing selected.</p></Empty></div>;
  if (profile.kind === 'driver') return <DriverProfile id={profile.id} />;
  if (profile.kind === 'staff') return <StaffProfile id={profile.id} />;
  return <TeamProfile id={profile.id} />;
}

function DriverProfile({ id }: { id: string }) {
  const g = useGameState();
  const d = g.drivers[id];
  if (!d) return <div className="page"><Empty><p>This driver is no longer in the game.</p></Empty></div>;
  const team = d.teamId ? g.teams[d.teamId] : null;
  const rows = driverCareerRows(g, id);
  const trophies = driverTrophies(g, id);
  const rec = careerRecords(rows, trophies.length);
  const pot = potentialRange(g, d);
  const status = d.retired ? 'Retired' : d.academyTeamId ? `Youth academy · ${g.teams[d.academyTeamId]?.name ?? ''}` : team ? team.name : 'Free agent';
  type R = (typeof rows)[number];
  const cols: Column<R>[] = [
    { key: 'season', label: 'Season', sort: (r) => r.season, render: (r) => <span>S{r.season} <span className="muted small">{r.year}{r.live ? ' · now' : ''}</span></span> },
    { key: 'team', label: 'Team', sort: (r) => g.teams[r.teamId]?.name ?? '', render: (r) => g.teams[r.teamId] ? <TeamLink id={r.teamId}><TeamName team={g.teams[r.teamId]} /></TeamLink> : '-' },
    { key: 'league', label: 'League', sort: (r) => r.tier, render: (r) => leagueShort(r.tier) },
    { key: 'races', label: 'Races', align: 'center', sort: (r) => r.races, render: (r) => r.races },
    { key: 'wins', label: 'Wins', align: 'center', sort: (r) => r.wins, render: (r) => r.wins },
    { key: 'pod', label: 'Podiums', tip: 'podium', align: 'center', sort: (r) => r.podiums, render: (r) => r.podiums },
    { key: 'pts', label: 'Points', tip: 'points', align: 'right', sort: (r) => r.points, render: (r) => <b>{r.points}</b> },
    { key: 'pos', label: 'Final', align: 'right', sort: (r) => r.pos, render: (r) => (r.live ? <span className="muted">{ordinal(r.pos)} now</span> : <Pos n={r.pos} />) },
  ];
  const chart = rows.filter((r) => typeof r.ovr === 'number').map((r) => ({ label: `S${r.season}`, value: r.ovr! }));
  const style = team ? { ['--team' as string]: team.colors.primary, ['--team2' as string]: team.colors.secondary } : undefined;

  return (
    <div className="page">
      <div className="hero" style={style}>
        <div className="profile-hero">
          <div className="profile-avatar" style={style}>{d.firstName[0]}{d.lastName[0]}</div>
          <div>
            <span className="tag">Driver · {status}</span>
            <h1>{d.firstName} {d.lastName}</h1>
            <p>{FLAG[d.nationality]} Age {d.age} · <Tip k="overall">OVR</Tip> {driverOverall(d)} · <Tip k="potential">Potential</Tip> {pot.exact ? pot.lo : `${pot.lo}-${pot.hi}`} <TraitChips d={d} /></p>
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        <section className="card">
          <h3>Current stats</h3>
          {STATS.map((s) => <StatBar key={s.k} k={s.k} label={s.label} value={d[s.k] as number} />)}
          {!d.retired && <MoraleBar m={d.morale} />}
          {d.contract && <div className="contract-row small"><span>{d.contract.salary < 0 ? `Brings ${money(-d.contract.salary)}` : `${money(d.contract.salary)}`}/race</span><span>{d.contract.yearsLeft} season(s) left</span></div>}
        </section>
        <section className="card">
          <h3>Overall rating by season</h3>
          {chart.length ? <SeriesChart points={chart} label="Overall rating by season" min={Math.max(0, Math.min(...chart.map((c) => c.value)) - 10)} max={Math.min(100, Math.max(...chart.map((c) => c.value)) + 10)} /> : <p className="muted small">Builds up as seasons are completed.</p>}
        </section>
      </div>

      <section className="card">
        <h3>Personal records</h3>
        <div className="rec-grid">
          <div className="rec"><div className="stat-label">Titles</div><div className="stat-value">{rec.titles}</div></div>
          <div className="rec"><div className="stat-label">Wins</div><div className="stat-value">{rec.wins}</div><div className="kpi-sub">{rec.races} races</div></div>
          <div className="rec"><div className="stat-label"><Tip k="podium">Podiums</Tip></div><div className="stat-value">{rec.podiums}</div></div>
          <div className="rec"><div className="stat-label">Career points</div><div className="stat-value">{rec.points}</div></div>
          <div className="rec"><div className="stat-label">Best finish</div><div className="stat-value">{rec.bestFinish ? `P${rec.bestFinish}` : '-'}</div></div>
          <div className="rec"><div className="stat-label">Best season</div><div className="stat-value">{rec.bestSeasonPoints}</div><div className="kpi-sub">points</div></div>
          <div className="rec"><div className="stat-label">Best championship</div><div className="stat-value">{rec.bestSeasonPos ? ordinal(rec.bestSeasonPos) : '-'}</div></div>
          <div className="rec"><div className="stat-label"><Tip text="Most races in a row scoring points within one season.">Points streak</Tip></div><div className="stat-value">{rec.longestStreak}</div></div>
        </div>
      </section>

      <section className="card">
        <h3>Trophy cabinet</h3>
        <TrophyShelf trophies={trophies} empty="No titles yet." />
      </section>

      <section className="card">
        <h3>Season by season</h3>
        <DataTable rows={rows} columns={cols} rowKey={(r) => `${r.season}-${r.tier}`} initialSort={{ key: 'season', dir: 'desc' }} empty="No races yet." />
      </section>
    </div>
  );
}

function StaffProfile({ id }: { id: string }) {
  const g = useGameState();
  const p = g.staff[id];
  if (!p) return <div className="page"><Empty><p>This person is no longer in the game.</p></Empty></div>;
  const team = p.teamId ? g.teams[p.teamId] : null;
  const rows = staffCareerRows(g, id);
  type R = (typeof rows)[number];
  const cols: Column<R>[] = [
    { key: 'season', label: 'Season', sort: (r) => r.season, render: (r) => <span>S{r.season} <span className="muted small">{r.year}{r.live ? ' · now' : ''}</span></span> },
    { key: 'team', label: 'Team', sort: (r) => g.teams[r.teamId]?.name ?? '', render: (r) => g.teams[r.teamId] ? <TeamLink id={r.teamId}><TeamName team={g.teams[r.teamId]} /></TeamLink> : '-' },
    { key: 'league', label: 'League', sort: (r) => r.tier, render: (r) => leagueShort(r.tier) },
    { key: 'rating', label: 'Rating', tip: 'rating', align: 'center', sort: (r) => r.rating ?? 0, render: (r) => r.rating ?? '-' },
    { key: 'pos', label: 'Team finished', align: 'right', sort: (r) => r.teamPos, render: (r) => (r.live ? <span className="muted">{ordinal(r.teamPos)} now</span> : <Pos n={r.teamPos} />) },
  ];
  const chart = rows.filter((r) => typeof r.rating === 'number').map((r) => ({ label: `S${r.season}`, value: r.rating! }));
  const titles = rows.filter((r) => !r.live && r.teamPos === 1).length;
  const style = team ? { ['--team' as string]: team.colors.primary, ['--team2' as string]: team.colors.secondary } : undefined;
  return (
    <div className="page">
      <div className="hero" style={style}>
        <div className="profile-hero">
          <div className="profile-avatar" style={style}>{p.name.split(' ').map((x) => x[0]).join('').slice(0, 2)}</div>
          <div>
            <span className="tag">{ROLE_LABEL[p.role]} · {team ? team.name : 'Available'}</span>
            <h1>{p.name}</h1>
            <p>Age {p.age} · <Tip k="rating">Rating</Tip> {p.rating} · <Tip k={p.role}>{ROLE_LABEL[p.role]}</Tip></p>
          </div>
        </div>
      </div>
      <div className="grid grid-2">
        <section className="card">
          <h3>Rating by season</h3>
          {chart.length ? <SeriesChart points={chart} label="Rating by season" /> : <p className="muted small">Builds up as seasons are completed.</p>}
        </section>
        <section className="card">
          <h3>Highlights</h3>
          <div className="rec-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            <div className="rec"><div className="stat-label">Seasons</div><div className="stat-value">{rows.length}</div></div>
            <div className="rec"><div className="stat-label">Teams' titles</div><div className="stat-value">{titles}</div></div>
            <div className="rec"><div className="stat-label">Best team finish</div><div className="stat-value">{rows.length ? ordinal(Math.min(...rows.map((r) => r.teamPos))) : '-'}</div></div>
            <div className="rec"><div className="stat-label">Teams worked for</div><div className="stat-value">{new Set(rows.map((r) => r.teamId)).size}</div></div>
          </div>
        </section>
      </div>
      <section className="card">
        <h3>Season by season</h3>
        <DataTable rows={rows} columns={cols} rowKey={(r) => `${r.season}-${r.teamId}`} initialSort={{ key: 'season', dir: 'desc' }} empty="No seasons yet." />
      </section>
    </div>
  );
}

export function TeamProfile({ id, embedded }: { id: string; embedded?: boolean }) {
  const g = useGameState();
  const team = g.teams[id];
  if (!team) return <div className="page"><Empty><p>Unknown team.</p></Empty></div>;
  const rows = teamHistory(g, id);
  const trophies = teamTrophies(g, id);
  type R = (typeof rows)[number];
  const cols: Column<R>[] = [
    { key: 'season', label: 'Season', sort: (r) => r.season, render: (r) => <span>S{r.season} <span className="muted small">{r.year}{r.live ? ' · now' : ''}</span></span> },
    { key: 'league', label: 'League', sort: (r) => r.tier, render: (r) => LEAGUES[r.tier]?.name ?? r.tier },
    { key: 'pos', label: 'Final', sort: (r) => r.pos, render: (r) => (r.live ? <span className="muted">{ordinal(r.pos)} now</span> : <Pos n={r.pos} />) },
    { key: 'pts', label: 'Points', align: 'right', sort: (r) => r.points, render: (r) => <b>{r.points}</b> },
    { key: 'wins', label: 'Wins', align: 'center', sort: (r) => r.wins, render: (r) => r.wins },
    { key: 'drivers', label: 'Drivers', render: (r) => <span className="small">{r.drivers.map((d, i) => <span key={d}>{i ? ', ' : ''}<DriverLink id={d} /></span>)}</span> },
    { key: 'moved', label: '', align: 'right', render: (r) => r.moved === 'up' ? <span className="move up"><Tip k="promotion" plain>▲ Promoted</Tip></span> : r.moved === 'down' ? <span className="move down"><Tip k="relegation" plain>▼ Relegated</Tip></span> : null },
  ];
  const style = { ['--team' as string]: team.colors.primary, ['--team2' as string]: team.colors.secondary };
  const best = rows.filter((r) => !r.live).reduce<R | null>((a, r) => (!a || r.tier < a.tier || (r.tier === a.tier && r.pos < a.pos) ? r : a), null);
  return (
    <div className="page">
      {!embedded && (
        <div className="hero" style={style}>
          <div>
            <span className="tag">Team · {LEAGUES[team.tier].name}</span>
            <h1>{team.name}</h1>
            <p>Car rating {carOverall(effectiveCar(team))} · Drivers: {team.driverIds.map((d, i) => <span key={d}>{i ? ' and ' : ''}<DriverLink id={d} full /></span>)}
              {Object.values(team.staffIds).length ? <> · Engineer {team.staffIds.raceEngineer ? <StaffLink id={team.staffIds.raceEngineer} /> : '-'}</> : null}</p>
          </div>
        </div>
      )}
      <div className="grid grid-3">
        <div className="card kpi"><div className="stat-label">Seasons</div><div className="stat-value">{rows.filter((r) => !r.live).length}</div><div className="kpi-sub">completed</div></div>
        <div className="card kpi"><div className="stat-label">Trophies</div><div className="stat-value">{trophies.length}</div><div className="kpi-sub">titles and promotions</div></div>
        <div className="card kpi"><div className="stat-label">Best season</div><div className="stat-value sm">{best ? `${ordinal(best.pos)} in ${LEAGUES[best.tier].short}` : '-'}</div><div className="kpi-sub">{best ? `Season ${best.season}` : 'No full season yet'}</div></div>
      </div>
      <section className="card">
        <h3>Trophy cabinet</h3>
        <TrophyShelf trophies={trophies} empty="Nothing in the cabinet yet. Win a league or get promoted." />
      </section>
      <section className="card">
        <h3>Season by season</h3>
        <DataTable rows={rows} columns={cols} rowKey={(r) => `${r.season}`} initialSort={{ key: 'season', dir: 'desc' }} empty="No seasons yet." />
      </section>
    </div>
  );
}
