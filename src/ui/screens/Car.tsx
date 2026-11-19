import { TRACK_BY_ID } from '../../data/tracks';
import { techDirectorRating, upgradeCost, upgradeGain } from '../../engine/finance';
import { carOverall } from '../../engine/generate';
import type { CarStat } from '../../engine/types';
import { useGame } from '../../store/gameStore';
import { useFlash } from '../components/bits';
import { StatBar } from '../components/StatBar';
import { Tip } from '../components/Tip';
import { money, ordinal } from '../format';
import { usePlayer } from '../hooks';

const STATS: { k: CarStat; label: string; blurb: string }[] = [
  { k: 'engine', label: 'Engine', blurb: 'Top speed on straights.' },
  { k: 'aero', label: 'Aero', blurb: 'Grip through corners.' },
  { k: 'chassis', label: 'Chassis', blurb: 'Balance everywhere.' },
  { k: 'reliability', label: 'Reliability', blurb: 'Fewer breakdowns.' },
];

export function Car() {
  const { g, team, tier } = usePlayer();
  const buy = useGame((s) => s.buyUpgrade);
  const racing = useGame((s) => !!s.race);
  const [flash, show] = useFlash();
  const rivals = g.leagues[tier].teamIds.map((id) => g.teams[id]);
  const avg = (k: CarStat) => rivals.reduce((a, t) => a + t.car[k], 0) / rivals.length;
  const best = (k: CarStat) => Math.max(...rivals.map((t) => t.car[k]));
  const td = techDirectorRating(g, team);
  const L = g.leagues[tier];
  const next = TRACK_BY_ID[L.calendar[L.results.length]];
  const rank = [...rivals].sort((a, b) => carOverall(b.car) - carOverall(a.car)).findIndex((t) => t.id === team.id) + 1;

  return (
    <div className="page">
      <div className="page-head">
        <h1>Car / <Tip k="rnd">R&D</Tip></h1>
        <p>Spend money to improve the car. Each upgrade of the same part this season costs 35% more. Your <Tip k="technicalDirector">Technical Director</Tip> (rating {td}) makes upgrades cheaper and bigger.</p>
      </div>
      {flash}
      <div className="grid grid-3">
        <div className="card kpi">
          <div className="stat-label"><Tip k="carOverall">Car rating</Tip></div>
          <div className="stat-value">{carOverall(team.car)}</div>
          <div className="kpi-sub">{rank === 1 ? 'Best car in the league' : `${ordinal(rank)} best of ${rivals.length}`}</div>
        </div>
        <div className="card kpi">
          <div className="stat-label"><Tip k="budget">Budget</Tip></div>
          <div className="stat-value">{money(team.budget)}</div>
          <div className="kpi-sub">Keep enough for salaries</div>
        </div>
        <div className="card kpi">
          <div className="stat-label">Next track wants</div>
          <div className="stat-value sm">{next ? (next.profile.power > next.profile.downforce + 0.1 ? 'Engine' : next.profile.downforce > next.profile.power + 0.1 ? 'Aero' : 'Balance') : '-'}</div>
          <div className="kpi-sub">{next ? next.name : 'Season over'}</div>
        </div>
      </div>

      <div className="grid grid-2">
        {STATS.map((s) => {
          const cost = upgradeCost(tier, team.upgrades[s.k], td);
          const gain = upgradeGain(team.car[s.k], td);
          const can = team.budget >= cost && team.car[s.k] < 99 && !racing;
          return (
            <section key={s.k} className="card upgrade-card">
              <div className="card-head">
                <h3><Tip k={s.k}>{s.label}</Tip></h3>
                <span className="muted small">{team.upgrades[s.k]} upgrade(s) this season</span>
              </div>
              <StatBar label={s.blurb} value={team.car[s.k]} compare={avg(s.k)} compareLabel={`League average ${Math.round(avg(s.k))}`} color={team.colors.primary} />
              <div className="muted small">League average {Math.round(avg(s.k))} · best {best(s.k)}</div>
              <div className="upgrade-foot">
                <span><b className="good">+{gain}</b> for <b>{money(cost)}</b></span>
                <button className="btn btn-primary" disabled={!can} onClick={() => {
                  const r = buy(s.k);
                  show(r.ok ? `${s.label} upgraded +${gain}.` : r.reason, r.ok ? 'good' : 'bad');
                }}>Upgrade</button>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
