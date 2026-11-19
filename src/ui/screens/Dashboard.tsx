import { LEAGUES, MOVE_SPOTS } from '../../data/leagues';
import { TRACK_BY_ID } from '../../data/tracks';
import { BANKRUPT_STREAK, raceSalaries } from '../../engine/finance';
import { STAFF_ROLES, driverOverall } from '../../engine/generate';
import { teamStandings } from '../../engine/season';
import { seasonOver, useGame } from '../../store/gameStore';
import { Pos, TeamName } from '../components/bits';
import { Rating } from '../components/StatBar';
import { Tip } from '../components/Tip';
import { TrackProfile } from '../components/TrackProfile';
import { FLAG, money, ordinal, ROLE_LABEL } from '../format';
import { usePlayer } from '../hooks';
import { useNav } from '../nav';

export function Dashboard() {
  const { g, team, tier, league } = usePlayer();
  const lastRace = useGame((s) => s.lastRace);
  const lastReview = useGame((s) => s.lastReview);
  const { go } = useNav();
  const L = g.leagues[tier];
  const table = teamStandings(L);
  const pos = table.findIndex((r) => r.id === team.id) + 1;
  const row = table[pos - 1];
  const round = L.results.length;
  const nextTrack = TRACK_BY_ID[L.calendar[round]];
  const over = seasonOver(g);
  const salaries = raceSalaries(g, team.id);

  const alerts: { kind: 'bad' | 'warn' | 'info'; text: string; to?: Parameters<typeof go>[0] }[] = [];
  if (team.driverIds.length < 2) alerts.push({ kind: 'bad', text: `You have ${team.driverIds.length} driver${team.driverIds.length === 1 ? '' : 's'}. Sign another before the next race.`, to: 'drivers' });
  for (const r of STAFF_ROLES) if (!team.staffIds[r]) alerts.push({ kind: 'warn', text: `No ${ROLE_LABEL[r]}. Hire one to avoid penalties.`, to: 'staff' });
  if (team.budget < 0) alerts.push({ kind: 'bad', text: `Budget is negative. ${BANKRUPT_STREAK - g.finance.negativeStreak} more race(s) below zero means bankruptcy.` });
  else if (team.budget < salaries * 3) alerts.push({ kind: 'warn', text: 'Budget is low: less than 3 races of salaries left.' });
  const expiring = [...team.driverIds.map((id) => g.drivers[id]), ...Object.values(team.staffIds).map((id) => g.staff[id!])]
    .filter((p) => p?.contract?.yearsLeft === 1);
  if (expiring.length) alerts.push({ kind: 'info', text: `${expiring.length} contract(s) end this season. Renew them in the Season Review.` });

  const zone = (i: number) => (tier > 1 && i < MOVE_SPOTS ? 'zone-up' : tier < 3 && i >= table.length - MOVE_SPOTS ? 'zone-down' : '');
  const snapshot = table.map((r, i) => ({ r, i })).filter(({ r, i }) => i < 5 || r.id === team.id);
  const ledger = [...g.finance.ledger].reverse().slice(0, 8);

  return (
    <div className="page">
      <div className="hero" style={{ ['--team' as string]: team.colors.primary, ['--team2' as string]: team.colors.secondary }}>
        <div>
          <span className="tag">{league.name} · Season {g.season} ({g.year})</span>
          <h1>{team.name}</h1>
          <p>{over ? 'Season complete.' : `Round ${round + 1} of ${league.races} is next.`}</p>
        </div>
        <div className="hero-actions">
          {over ? (
            <button className="btn btn-primary btn-lg" onClick={() => go('review')}>Season review ›</button>
          ) : (
            <button className="btn btn-primary btn-lg" onClick={() => go('race')}>Race weekend ›</button>
          )}
        </div>
      </div>

      {lastReview && lastReview.season === g.season - 1 && round === 0 && (
        <div className={'alert ' + (lastReview.playerTierAfter < lastReview.playerTierBefore ? 'alert-good' : lastReview.playerTierAfter > lastReview.playerTierBefore ? 'alert-bad' : 'alert-info')}>
          <span>
            {lastReview.playerTierAfter < lastReview.playerTierBefore ? `Welcome to ${league.name}! You were promoted after finishing ${ordinal(lastReview.playerPosition)}.`
              : lastReview.playerTierAfter > lastReview.playerTierBefore ? `Relegated to ${league.name}. Time to rebuild and bounce back.`
              : `New season in ${league.name}. Last year you finished ${ordinal(lastReview.playerPosition)}.`}
            {lastReview.retired.length > 0 && ` ${lastReview.retired.length} driver(s) retired over the break.`}
          </span>
        </div>
      )}

      <div className="grid grid-4">
        <div className="card kpi">
          <div className="stat-label"><Tip k="budget">Budget</Tip></div>
          <div className={'stat-value' + (team.budget < 0 ? ' neg' : '')}>{money(team.budget)}</div>
          <div className="kpi-sub">Salaries {money(salaries)} per race</div>
        </div>
        <div className="card kpi">
          <div className="stat-label"><Tip k="constructors">Championship</Tip></div>
          <div className="stat-value">{round === 0 ? '-' : ordinal(pos)}</div>
          <div className="kpi-sub">{tier > 1 && pos <= MOVE_SPOTS ? 'Promotion place' : tier < 3 && pos > table.length - MOVE_SPOTS ? 'Relegation zone' : `Top ${MOVE_SPOTS} go up`}</div>
        </div>
        <div className="card kpi">
          <div className="stat-label"><Tip k="points">Points</Tip></div>
          <div className="stat-value">{row?.points ?? 0}</div>
          <div className="kpi-sub">{row?.wins ?? 0} wins · {row?.podiums ?? 0} podiums</div>
        </div>
        <div className="card kpi">
          <div className="stat-label"><Tip text="The next round of the championship. Each race weekend is qualifying, then the race.">Next race</Tip></div>
          <div className="stat-value sm">{nextTrack ? nextTrack.name : 'Season over'}</div>
          <div className="kpi-sub">{nextTrack ? `Week ${L.weeks[round]} · ${nextTrack.country} · ${nextTrack.laps} laps` : ''}</div>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="alerts">
          {alerts.map((a, i) => (
            <div key={i} className={`alert alert-${a.kind}`}>
              <span>{a.text}</span>
              {a.to && <button className="btn btn-sm" onClick={() => go(a.to!)}>Fix ›</button>}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-2-1">
        <section className="card">
          <div className="card-head"><h3><Tip k="standings">Standings</Tip></h3><button className="link" onClick={() => go('standings')}>Full table ›</button></div>
          <table className="data compact">
            <tbody>
              {snapshot.map(({ r, i }) => (
                <tr key={r.id} className={(r.id === team.id ? 'me ' : '') + zone(i)}>
                  <td style={{ width: 40 }}>{round === 0 ? <span className="pos">-</span> : <Pos n={i + 1} />}</td>
                  <td><TeamName team={g.teams[r.id]} /></td>
                  <td style={{ textAlign: 'right' }}><b>{r.points}</b> pts</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card">
          <h3>Next track</h3>
          {nextTrack ? (
            <>
              <div className="track-title">{nextTrack.name}</div>
              <div className="muted small">{nextTrack.country} · {nextTrack.laps} laps</div>
              <TrackProfile track={nextTrack} />
            </>
          ) : <p className="muted">All {league.races} rounds are done.</p>}
        </section>
      </div>

      <div className="grid grid-2">
        <section className="card">
          <div className="card-head"><h3>Your drivers</h3><button className="link" onClick={() => go('drivers')}>Manage ›</button></div>
          {team.driverIds.map((id) => {
            const d = g.drivers[id];
            return (
              <div key={id} className="list-row">
                <span>{FLAG[d.nationality]} <b>{d.firstName} {d.lastName}</b> <span className="muted">· {d.age}</span></span>
                <span className="muted small"><Tip k="contract">{d.contract?.yearsLeft ?? 0} yr</Tip> · {money(d.contract?.salary ?? 0)}/race</span>
                <Rating v={driverOverall(d)} k="overall" />
              </div>
            );
          })}
          {lastRace && (
            <div className="last-race">
              <div className="stat-label">Last race · {TRACK_BY_ID[lastRace.result.trackId].name}</div>
              {lastRace.result.entries.filter((e) => e.teamId === team.id).map((e) => (
                <div key={e.driverId} className="list-row">
                  <span>{g.drivers[e.driverId].lastName}</span>
                  <span>{e.dnf ? <Tip k="dnf">DNF</Tip> : `P${e.position}`} {e.points ? <b className="good">+{e.points} pts</b> : null}</span>
                </div>
              ))}
              <div className="list-row"><span>Race payout</span><b className={lastRace.budgetAfter - lastRace.budgetBefore >= 0 ? 'good' : 'bad'}>{money(lastRace.budgetAfter - lastRace.budgetBefore, { sign: true })}</b></div>
            </div>
          )}
        </section>

        <section className="card">
          <h3>Recent money</h3>
          {ledger.length === 0 ? <p className="muted">No transactions yet. Sponsors pay after every race.</p> : (
            <table className="data compact">
              <tbody>
                {ledger.map((e, i) => (
                  <tr key={i}>
                    <td className="muted small">S{e.season} R{e.round}</td>
                    <td>{e.label}</td>
                    <td style={{ textAlign: 'right' }} className={e.amount >= 0 ? 'good' : 'bad'}>{money(e.amount, { sign: true })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="muted small" style={{ marginTop: 12 }}>
            <Tip k="sponsor">Sponsors</Tip> pay about {money(LEAGUES[tier].sponsorPerRace)} per race here, plus a <Tip k="pointsBonus">points bonus</Tip> of {money(LEAGUES[tier].pointBonus)} per point.
          </p>
        </section>
      </div>
    </div>
  );
}
