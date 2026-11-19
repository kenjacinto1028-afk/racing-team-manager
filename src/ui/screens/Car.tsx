import { useState } from 'react';
import { PART_SLOTS, PARTS, PART_BY_ID } from '../../data/parts';
import { TRACK_BY_ID } from '../../data/tracks';
import {
  canChangeConcept, conceptDelta, CONCEPTS, effectiveCar, MAX_PROJECTS, projectCost, projectRaces, UNIT_PENALTY, unitAllowance,
} from '../../engine/car';
import { techDirectorRating, upgradeCost, upgradeGain } from '../../engine/finance';
import { carOverall } from '../../engine/generate';
import type { CarConcept, CarStat, UnitKind } from '../../engine/types';
import { useGame } from '../../store/gameStore';
import { ConfirmButton, Tabs, useFlash } from '../components/bits';
import { StatBar } from '../components/StatBar';
import { Tip } from '../components/Tip';
import { CONCEPT_LABEL, money, ordinal } from '../format';
import { usePlayer } from '../hooks';

const STATS: { k: CarStat; label: string; blurb: string }[] = [
  { k: 'engine', label: 'Engine', blurb: 'Top speed on straights.' },
  { k: 'aero', label: 'Aero', blurb: 'Grip through corners.' },
  { k: 'chassis', label: 'Chassis', blurb: 'Balance everywhere.' },
  { k: 'reliability', label: 'Reliability', blurb: 'Fewer breakdowns.' },
];

const CONCEPT_INFO: Record<CarConcept, { pro: string; con: string; k: string }> = {
  balanced: { pro: 'No weak tracks', con: 'No strong tracks either', k: 'conceptBalanced' },
  lowDrag: { pro: 'Fast on long straights', con: 'Slow on twisty tracks', k: 'conceptLowDrag' },
  highDownforce: { pro: 'Quick through corners', con: 'Slow on power tracks', k: 'conceptHighDownforce' },
  tyreFriendly: { pro: 'Tyres last 15% longer', con: '~0.06s a lap slower', k: 'conceptTyreFriendly' },
};

type Tab = 'overview' | 'parts' | 'upgrades' | 'units';
const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

export function Car() {
  const { g, team, tier } = usePlayer();
  const buy = useGame((s) => s.buyUpgrade);
  const setConcept = useGame((s) => s.setConcept);
  const startProject = useGame((s) => s.startProject);
  const fitPart = useGame((s) => s.fitPart);
  const replaceUnit = useGame((s) => s.replaceUnit);
  const racing = useGame((s) => !!s.race);
  const weekend = useGame((s) => !!s.weekend);
  const [tab, setTab] = useState<Tab>('overview');
  const [flash, show] = useFlash();
  const rivals = g.leagues[tier].teamIds.map((id) => g.teams[id]);
  const eff = effectiveCar(team);
  const avg = (k: CarStat) => rivals.reduce((a, t) => a + effectiveCar(t)[k], 0) / rivals.length;
  const best = (k: CarStat) => Math.max(...rivals.map((t) => effectiveCar(t)[k]));
  const td = techDirectorRating(g, team);
  const L = g.leagues[tier];
  const next = TRACK_BY_ID[L.calendar[L.results.length]];
  const rank = [...rivals].sort((a, b) => carOverall(effectiveCar(b)) - carOverall(effectiveCar(a))).findIndex((t) => t.id === team.id) + 1;
  const busy = racing || weekend;
  const act = (r: { ok: boolean; reason?: string }, msg: string) => show(r.ok ? msg : (r as { reason: string }).reason, r.ok ? 'good' : 'bad');
  const locked = !canChangeConcept(g);

  return (
    <div className="page">
      <div className="page-head">
        <h1>Car / <Tip k="rnd">R&D</Tip></h1>
        <p>Pick a design concept each season, develop parts with trade-offs, buy quick upgrades, and keep the engine and gearbox fresh.</p>
      </div>
      {flash}
      <div className="grid grid-3">
        <div className="card kpi">
          <div className="stat-label"><Tip k="carOverall">Car rating</Tip></div>
          <div className="stat-value">{carOverall(eff)}</div>
          <div className="kpi-sub">{rank === 1 ? 'Best car in the league' : `${ordinal(rank)} best of ${rivals.length}`}</div>
        </div>
        <div className="card kpi">
          <div className="stat-label"><Tip k="carConcept">Concept</Tip></div>
          <div className="stat-value sm">{CONCEPT_LABEL[team.concept]}</div>
          <div className="kpi-sub">{next ? `${conceptDelta(team.concept, next) <= 0 ? 'Suits' : 'Hurts at'} ${next.name}` : 'Season over'}</div>
        </div>
        <div className="card kpi">
          <div className="stat-label"><Tip k="rndProject">R&D projects</Tip></div>
          <div className="stat-value">{team.projects.length}/{MAX_PROJECTS}</div>
          <div className="kpi-sub">{team.projects.length ? team.projects.map((p) => `${PART_BY_ID[p.partId].name} (${p.racesLeft} race${p.racesLeft > 1 ? 's' : ''})`).join(', ') : 'Factory idle'}</div>
        </div>
      </div>

      <Tabs<Tab> value={tab} onChange={setTab} tabs={[
        { id: 'overview', label: 'Overview' },
        { id: 'parts', label: 'Parts', count: team.ownedParts.length },
        { id: 'upgrades', label: 'Quick upgrades' },
        { id: 'units', label: 'Engine & gearbox' },
      ]} />

      {tab === 'overview' && (
        <>
          <section className="card">
            <div className="card-head">
              <h3><Tip k="carConcept">Design concept</Tip></h3>
              <span className="muted small">{locked ? 'Locked until next season' : 'Choose before the first race'}</span>
            </div>
            <div className="grid grid-4">
              {CONCEPTS.map((c) => (
                <button key={c} className={'concept-card' + (team.concept === c ? ' on' : '')} disabled={locked || busy} onClick={() => act(setConcept(c), `${CONCEPT_LABEL[c]} concept chosen.`)}>
                  <b><Tip k={CONCEPT_INFO[c].k} plain>{CONCEPT_LABEL[c]}</Tip></b>
                  <span className="good small">+ {CONCEPT_INFO[c].pro}</span>
                  <span className="bad small">− {CONCEPT_INFO[c].con}</span>
                </button>
              ))}
            </div>
          </section>
          <section className="card">
            <h3>Ratings</h3>
            <p className="muted small">Bars show the rating with your fitted parts. The marker is the league average.</p>
            <div className="grid grid-2">
              {STATS.map((s) => {
                const diff = eff[s.k] - team.car[s.k];
                return (
                  <div key={s.k}>
                    <StatBar label={s.label} k={s.k} value={eff[s.k]} compare={avg(s.k)} compareLabel={`League average ${Math.round(avg(s.k))}`} color={team.colors.primary} />
                    <div className="muted small">Base {team.car[s.k]}{diff ? <> · parts <b className={diff > 0 ? 'good' : 'bad'}>{signed(diff)}</b></> : ''} · league best {best(s.k)}</div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}

      {tab === 'parts' && (
        <section className="card">
          <p className="muted small" style={{ marginTop: 0 }}>
            Each part trades one thing for another. Designing costs money up front and takes a few races ({MAX_PROJECTS} at a time); then fit it for free.
            Your <Tip k="technicalDirector">Technical Director</Tip> (rating {td}) makes designs cheaper{td >= 70 ? ' and a race quicker' : ''}.
          </p>
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Slot</th><th>Part</th><th>Effect</th><th style={{ textAlign: 'right' }}>Design</th><th style={{ textAlign: 'right' }}></th></tr></thead>
              <tbody>
                {PART_SLOTS.map(({ slot, label, blurb }) => PARTS.filter((p) => p.slot === slot).map((p, i) => {
                  const fitted = team.parts[slot] === p.id;
                  const owned = p.cost === 0 || team.ownedParts.includes(p.id);
                  const project = team.projects.find((x) => x.partId === p.id);
                  const cost = projectCost(tier, p.id, td);
                  const eff = Object.entries(p.effects);
                  return (
                    <tr key={p.id} className={(fitted ? 'me ' : '') + (i === 0 ? 'slot-first' : '')}>
                      <td>{i === 0 ? <span title={blurb}><b>{label}</b></span> : ''}</td>
                      <td><b>{p.name}</b><div className="muted small">{p.blurb}</div></td>
                      <td>{eff.length ? eff.map(([k, v]) => <span key={k} className={'chip ' + ((v ?? 0) > 0 ? 'good' : 'bad')}>{signed(v ?? 0)} {k}</span>) : <span className="muted small">-</span>}</td>
                      <td style={{ textAlign: 'right' }}>{p.cost === 0 ? <span className="muted small">-</span> : <span className="small">{money(cost)} · {projectRaces(p.id, td)} race{projectRaces(p.id, td) > 1 ? 's' : ''}</span>}</td>
                      <td style={{ textAlign: 'right' }}>
                        {fitted ? <span className="tag">Fitted</span>
                          : owned ? <button className="btn btn-sm" disabled={busy} onClick={() => act(fitPart(p.id), `${p.name} fitted.`)}>Fit</button>
                          : project ? <span className="muted small">In design · {project.racesLeft} left</span>
                          : <button className="btn btn-sm btn-primary" disabled={busy || cost > team.budget || team.projects.length >= MAX_PROJECTS} onClick={() => act(startProject(p.id), `Design of ${p.name} started.`)}>Design</button>}
                      </td>
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'upgrades' && (
        <div className="grid grid-2">
          {STATS.map((s) => {
            const cost = upgradeCost(tier, team.upgrades[s.k], td);
            const gain = upgradeGain(team.car[s.k], td);
            const can = team.budget >= cost && team.car[s.k] < 99 && !busy;
            return (
              <section key={s.k} className="card upgrade-card">
                <div className="card-head">
                  <h3><Tip k={s.k}>{s.label}</Tip></h3>
                  <span className="muted small">{team.upgrades[s.k]} upgrade(s) this season</span>
                </div>
                <StatBar label={s.blurb} value={team.car[s.k]} compare={avg(s.k)} compareLabel={`League average ${Math.round(avg(s.k))}`} color={team.colors.primary} />
                <div className="muted small">Base rating. Each upgrade of the same stat this season costs 35% more.</div>
                <div className="upgrade-foot">
                  <span><b className="good">+{gain}</b> for <b>{money(cost)}</b></span>
                  <button className="btn btn-primary" disabled={!can} onClick={() => act(buy(s.k), `${s.label} upgraded +${gain}.`)}>Upgrade</button>
                </div>
              </section>
            );
          })}
        </div>
      )}

      {tab === 'units' && (
        <div className="grid grid-2">
          {(['engine', 'gearbox'] as UnitKind[]).map((k) => {
            const u = team.units[k];
            const allow = unitAllowance(tier, k);
            const over = u.used + 1 > allow;
            return (
              <section key={k} className="card">
                <div className="card-head"><h3 style={{ textTransform: 'capitalize' }}><Tip k="partWear">{k}</Tip></h3><span className="muted small">Unit {u.used} of {allow} allowed</span></div>
                <StatBar label="Wear" value={u.wear} color={u.wear >= 80 ? 'var(--bad)' : u.wear >= 60 ? 'var(--warn)' : 'var(--good)'} />
                <p className="muted small">
                  {u.wear >= 80 ? 'Badly worn: breakdowns are much more likely.' : u.wear >= 60 ? 'Getting tired: breakdown risk is rising.' : 'In good shape.'}
                  {' '}Using more than {allow} this season costs <Tip k="gridPenalty">{UNIT_PENALTY[k]} grid places</Tip> per extra unit.
                </p>
                <ConfirmButton className="btn" disabled={busy} confirmText={over ? `Take a ${UNIT_PENALTY[k]}-place penalty?` : 'Fit a new one?'}
                  onConfirm={() => act(replaceUnit(k), `New ${k} fitted.${over ? ` ${UNIT_PENALTY[k]}-place grid penalty next race.` : ''}`)}>
                  Fit new {k}
                </ConfirmButton>
              </section>
            );
          })}
          {team.gridPenalty > 0 && <div className="alert alert-warn"><span>Grid penalty waiting: both cars drop {team.gridPenalty} places at the next race.</span></div>}
        </div>
      )}
    </div>
  );
}
