import { useMemo, useState } from 'react';
import { LEAGUES, MOVE_SPOTS, TIERS } from '../../data/leagues';
import { driverOverall } from '../../engine/generate';
import { completeAllLeagues, previewReview, renewalSalary } from '../../engine/offseason';
import type { TierId } from '../../engine/types';
import { seasonOver, useGame } from '../../store/gameStore';
import { Pos, Tabs, TeamName, useFlash } from '../components/bits';
import { Rating } from '../components/StatBar';
import { Tip } from '../components/Tip';
import { money, ordinal, ROLE_LABEL } from '../format';
import { usePlayer } from '../hooks';
import { goalProgress } from '../../engine/sponsors';
import { useNav } from '../nav';

export function SeasonReview() {
  const { g, team } = usePlayer();
  const endSeason = useGame((s) => s.endSeason);
  const renew = useGame((s) => s.renewContract);
  const { go } = useNav();
  const [flash, show] = useFlash();
  const over = seasonOver(g);
  // The other leagues are already finished by the time the player's ends; this is a safety net.
  const full = useMemo(() => (over ? completeAllLeagues(g) : g), [g, over]);
  const review = useMemo(() => previewReview(full), [full]);
  const [tier, setTier] = useState<TierId>(review.playerTierBefore);

  if (!over) {
    return (
      <div className="page">
        <div className="page-head"><h1>Season review</h1><p>This opens once the last race of the season is done.</p></div>
      </div>
    );
  }

  const nextTier = review.playerTierAfter;
  const up = nextTier < review.playerTierBefore;
  const down = nextTier > review.playerTierBefore;
  const people = [
    ...team.driverIds.map((id) => ({ kind: 'driver' as const, id, name: `${g.drivers[id].firstName} ${g.drivers[id].lastName}`, role: 'Driver', rating: driverOverall(g.drivers[id]), age: g.drivers[id].age, contract: g.drivers[id].contract })),
    ...Object.values(team.staffIds).filter(Boolean).map((id) => ({ kind: 'staff' as const, id: id!, name: g.staff[id!].name, role: ROLE_LABEL[g.staff[id!].role], rating: g.staff[id!].rating, age: g.staff[id!].age, contract: g.staff[id!].contract })),
  ];
  const expiring = people.filter((p) => (p.contract?.yearsLeft ?? 0) <= 1);
  const table = review.teamTables[tier];
  const champ = review.driverTables[tier][0];

  const start = () => {
    const r = endSeason();
    if (!r.ok) { show(r.reason, 'bad'); return; }
    go('hq');
  };

  return (
    <div className="page">
      <div className={'hero review-hero' + (up ? ' up' : down ? ' down' : '')} style={{ ['--team' as string]: team.colors.primary, ['--team2' as string]: team.colors.secondary }}>
        <div>
          <span className="tag">Season {review.season} review · {review.year}</span>
          <h1>{up ? 'Promoted!' : down ? 'Relegated' : `${ordinal(review.playerPosition)} place`}</h1>
          <p>
            {team.name} finished {ordinal(review.playerPosition)} in {LEAGUES[review.playerTierBefore].name}.{' '}
            {up ? `Next season you race in ${LEAGUES[nextTier].name}: bigger sponsors, tougher rivals.` : down ? `Next season you drop to ${LEAGUES[nextTier].name}.` : `You stay in ${LEAGUES[nextTier].name}.`}
          </p>
        </div>
        <div className="hero-actions review-prize">
          <div className="stat-label"><Tip k="prizeMoney">Prize money</Tip></div>
          <div className="stat-value">{money(review.playerPrize)}</div>
        </div>
      </div>
      {flash}

      <div className="grid grid-2-1">
        <section className="card">
          <div className="card-head"><h3>Final tables</h3></div>
          <Tabs<string> value={String(tier)} onChange={(v) => setTier(Number(v) as TierId)} tabs={TIERS.map((t) => ({ id: String(t), label: LEAGUES[t].name + (t === review.playerTierBefore ? ' ★' : '') }))} />
          <table className="data compact">
            <tbody>
              {table.map((r, i) => {
                const movesUp = tier > 1 && i < MOVE_SPOTS;
                const movesDown = tier < 3 && i >= table.length - MOVE_SPOTS;
                return (
                  <tr key={r.id} className={(r.id === team.id ? 'me ' : '') + (movesUp ? 'zone-up' : movesDown ? 'zone-down' : '')}>
                    <td style={{ width: 44 }}><Pos n={i + 1} /></td>
                    <td><TeamName team={g.teams[r.id]} /></td>
                    <td className="muted small">{r.wins} wins</td>
                    <td style={{ textAlign: 'right' }}><b>{r.points}</b> pts</td>
                    <td style={{ width: 120, textAlign: 'right' }}>
                      {movesUp && <span className="move up"><Tip k="promotion" plain>▲ Up to {LEAGUES[(tier - 1) as TierId].short}</Tip></span>}
                      {movesDown && <span className="move down"><Tip k="relegation" plain>▼ Down to {LEAGUES[(tier + 1) as TierId].short}</Tip></span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {champ && (
            <p className="muted small" style={{ marginTop: 12 }}>
              Drivers' champion: <b>{g.drivers[champ.id].firstName} {g.drivers[champ.id].lastName}</b> ({g.teams[champ.teamId].name}) with {champ.points} points.
            </p>
          )}
        </section>

        <div className="stack">
          <section className="card">
            <h3><Tip k="contract">Contracts</Tip> ending</h3>
            {expiring.length === 0 ? <p className="muted small">Nobody's contract runs out. Everyone stays.</p> : (
              <>
                <p className="muted small">These people leave unless you renew. New salaries are priced for {LEAGUES[nextTier].name}.</p>
                {expiring.map((p) => {
                  const sal = renewalSalary(g, p.kind, p.id, nextTier);
                  return (
                    <div key={p.id} className="renew-row">
                      <div className="renew-who">
                        <div><b>{p.name}</b> <Rating v={p.rating} k={p.kind === 'driver' ? 'overall' : 'rating'} /></div>
                        <div className="muted small">{p.role} · age {p.age} · now {money(p.contract?.salary ?? 0)}/race</div>
                      </div>
                      <div className="renew-actions">
                        <span className="small">{money(sal)}/race</span>
                        {[1, 2, 3].map((y) => (
                          <button key={y} className="btn btn-sm" onClick={() => { renew(p.kind, p.id, y); show(`${p.name} renewed for ${y} season${y > 1 ? 's' : ''}.`); }}>{y} yr</button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
            {people.filter((p) => (p.contract?.yearsLeft ?? 0) > 1).length > 0 && (
              <div className="muted small" style={{ marginTop: 12 }}>
                Staying: {people.filter((p) => (p.contract?.yearsLeft ?? 0) > 1).map((p) => p.name).join(', ')}.
              </div>
            )}
          </section>
          <section className="card">
            <h3>Sponsor goals</h3>
            {g.sponsors.active.length === 0 ? <p className="muted small">No sponsors this season.</p> : g.sponsors.active.map((d) => {
              const p = goalProgress(g, d.goal);
              return (
                <div key={d.id} className="list-row">
                  <span><b>{d.name}</b><div className="muted small">{p.text}</div></span>
                  <span className={p.met ? 'good' : 'bad'}>{p.met ? `+${money(d.bonus)}` : 'Missed'}</span>
                </div>
              );
            })}
            <p className="muted small" style={{ marginTop: 8 }}>Sponsors who miss their <Tip k="sponsorGoal">goal</Tip> usually leave. New offers arrive for any empty slots.</p>
          </section>
          <section className="card">
            <h3>Over the break</h3>
            <ul className="bullets">
              <li>Prize money is paid by final position.</li>
              <li>Drivers get a year older: <Tip k="potential">young ones improve</Tip>, veterans slow down, some retire.</li>
              <li>Rival teams upgrade their cars and fill empty seats.</li>
              <li>Every car drifts back toward the league average as rivals catch up.</li>
              <li>New talent joins the transfer market.</li>
            </ul>
            <button className="btn btn-primary btn-lg" style={{ marginTop: 16, width: '100%' }} onClick={start}>Start season {g.season + 1} ›</button>
          </section>
        </div>
      </div>
    </div>
  );
}
