import { useState } from 'react';
import { TRAITS, type TraitId } from '../../data/traits';
import {
  ACADEMY_PROMOTE_AGE, ACADEMY_SIZE, academyFee, academyUpkeep, FACILITIES, FACILITY_BUILD_RACES, facilityCost, MAX_FACILITY, moraleLabel,
} from '../../engine/development';
import { driverOverall } from '../../engine/generate';
import { potentialRange } from '../../engine/scouting';
import type { Driver, FacilityKind, TrainingFocus } from '../../engine/types';
import { useGame } from '../../store/gameStore';
import { ConfirmButton, Empty, Tabs, useFlash } from '../components/bits';
import { DataTable, type Column } from '../components/DataTable';
import { Rating, StatBar } from '../components/StatBar';
import { Tip } from '../components/Tip';
import { FLAG, money } from '../format';
import { usePlayer } from '../hooks';

type Tab = 'training' | 'academy' | 'facilities';

const FOCUS: { id: TrainingFocus; label: string; blurb: string }[] = [
  { id: 'balanced', label: 'Balanced', blurb: 'A bit of everything.' },
  { id: 'pace', label: 'Pace', blurb: 'Raw speed.' },
  { id: 'racecraft', label: 'Racecraft', blurb: 'Overtaking and defending.' },
  { id: 'tyres', label: 'Tyre care', blurb: 'Tyre management.' },
  { id: 'fitness', label: 'Fitness', blurb: 'Consistency over a race.' },
];

const FAC_INFO: Record<FacilityKind, { label: string; tip: string; effect: (lv: number) => string }> = {
  factory: { label: 'Factory', tip: 'factory', effect: (lv) => `R&D and upgrades ${lv * 6}% cheaper` },
  simulator: { label: 'Simulator', tip: 'simulator', effect: (lv) => `Training ${lv * 12}% faster` },
  gym: { label: 'Gym', tip: 'gym', effect: (lv) => `${lv * 5}% fewer crashes · fitness training +${lv * 12}%` },
};

export function TraitChips({ d }: { d: Driver }) {
  if (!d.traits?.length) return null;
  return (
    <span className="traits">
      {d.traits.map((t) => {
        const def = TRAITS[t as TraitId];
        return def ? <Tip key={t} text={def.blurb} plain><span className={'trait ' + (def.good ? 'good' : 'bad')}>{def.name}</span></Tip> : null;
      })}
    </span>
  );
}

export function MoraleBar({ m }: { m: number }) {
  return <StatBar label={`Morale · ${moraleLabel(m)}`} k="driverMorale" value={m} color={m < 35 ? 'var(--bad)' : m < 50 ? 'var(--warn)' : 'var(--good)'} />;
}

export function Development() {
  const { g, team, tier } = usePlayer();
  const setTraining = useGame((s) => s.setTraining);
  const signYouth = useGame((s) => s.signYouth);
  const promote = useGame((s) => s.promoteYouth);
  const releaseYouth = useGame((s) => s.releaseYouth);
  const build = useGame((s) => s.buildFacility);
  const racing = useGame((s) => !!s.race);
  const [tab, setTab] = useState<Tab>('training');
  const [flash, show] = useFlash();
  const act = (r: { ok: boolean; reason?: string }, msg: string) => show(r.ok ? msg : (r as { reason: string }).reason, r.ok ? 'good' : 'bad');

  const mine = team.driverIds.map((id) => g.drivers[id]);
  const academy = team.academy.map((id) => g.drivers[id]).filter(Boolean);
  const pool = g.youthPool.map((id) => g.drivers[id]).filter(Boolean);
  const potStr = (d: Driver) => { const p = potentialRange(g, d); return p.exact ? String(p.lo) : `${p.lo}-${p.hi}`; };
  const fee = academyFee(tier);

  type Y = Driver;
  const poolCols: Column<Y>[] = [
    { key: 'name', label: 'Prospect', sort: (d) => d.lastName, render: (d) => <span>{FLAG[d.nationality]} <b>{d.firstName} {d.lastName}</b> <TraitChips d={d} /></span> },
    { key: 'age', label: 'Age', tip: 'age', align: 'center', sort: (d) => d.age, render: (d) => d.age },
    { key: 'ovr', label: 'OVR', tip: 'overall', align: 'center', sort: (d) => driverOverall(d), render: (d) => <Rating v={driverOverall(d)} /> },
    { key: 'pot', label: 'POT', tip: 'potential', align: 'center', sort: (d) => potentialRange(g, d).hi, render: (d) => <b>{potStr(d)}</b> },
    { key: 'act', label: '', align: 'right', render: (d) => <button className="btn btn-sm btn-primary" disabled={racing || academy.length >= ACADEMY_SIZE || team.budget < fee} onClick={() => act(signYouth(d.id), `${d.firstName} ${d.lastName} joins the academy.`)}>Sign · {money(fee)}</button> },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <h1>Development</h1>
        <p>Grow your people. Drivers improve with <Tip k="training">training</Tip> and race experience until they reach their <Tip k="potential">potential</Tip>. Teenagers in the <Tip k="youthAcademy">youth academy</Tip> can become future stars.</p>
      </div>
      {flash}
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[
        { id: 'training', label: 'Training' },
        { id: 'academy', label: 'Youth academy', count: academy.length },
        { id: 'facilities', label: 'Facilities' },
      ]} />

      {tab === 'training' && (
        <div className="grid grid-2">
          {mine.map((d) => (
            <section key={d.id} className="card driver-card" style={{ ['--team' as string]: team.colors.primary }}>
              <div className="driver-head">
                <div>
                  <div className="driver-name">{d.firstName} <b>{d.lastName}</b></div>
                  <div className="muted small">Age {d.age} · <Tip k="potential">Potential</Tip> {potStr(d)} <TraitChips d={d} /></div>
                </div>
                <div className="ovr-badge"><Tip k="overall" plain>{driverOverall(d)}</Tip><span>OVR</span></div>
              </div>
              <MoraleBar m={d.morale} />
              <div className="stat-label" style={{ marginTop: 8 }}><Tip k="training">Training focus</Tip></div>
              <div className="focus-grid">
                {FOCUS.map((f) => (
                  <button key={f.id} className={'focus-btn' + (d.training === f.id ? ' on' : '')} title={f.blurb} onClick={() => setTraining(d.id, f.id)}>{f.label}</button>
                ))}
              </div>
              <p className="muted small" style={{ margin: 0 }}>
                {d.age <= 23 ? 'Young: learns fast.' : d.age <= 28 ? 'Still improving steadily.' : d.age <= 32 ? 'Gains are slow now.' : 'Near the end: gains are rare.'}
                {' '}A single focus learns 30% faster than balanced.
              </p>
            </section>
          ))}
          {mine.length === 0 && <Empty><p>No drivers to train.</p></Empty>}
        </div>
      )}

      {tab === 'academy' && (
        <>
          <section className="card">
            <div className="card-head">
              <h3>Your academy <span className="muted small">· {academy.length}/{ACADEMY_SIZE}</span></h3>
              <span className="muted small">Upkeep {money(academyUpkeep(tier))} per kid per race</span>
            </div>
            {academy.length === 0 ? <p className="muted small">Empty. Sign a prospect below. They train every race and can race for you from age {ACADEMY_PROMOTE_AGE}.</p> : (
              <div className="grid grid-3">
                {academy.map((d) => (
                  <div key={d.id} className="academy-card">
                    <div><b>{d.firstName} {d.lastName}</b> <span className="muted small">{FLAG[d.nationality]} · age {d.age}</span></div>
                    <div className="muted small">OVR {driverOverall(d)} · POT {potStr(d)} <TraitChips d={d} /></div>
                    <StatBar label="Pace" k="pace" value={d.pace} compare={potentialRange(g, d).hi} />
                    <div className="btn-row">
                      <button className="btn btn-sm btn-primary" disabled={racing || d.age < ACADEMY_PROMOTE_AGE || team.driverIds.length >= 2}
                        title={d.age < ACADEMY_PROMOTE_AGE ? `Can race from ${ACADEMY_PROMOTE_AGE}` : team.driverIds.length >= 2 ? 'Free a race seat first' : 'Give them a race seat'}
                        onClick={() => act(promote(d.id), `${d.lastName} promoted to a race seat!`)}>Promote</button>
                      <ConfirmButton className="btn btn-sm btn-ghost" disabled={racing} confirmText="Let go?" onConfirm={() => act(releaseYouth(d.id), `${d.lastName} left the academy.`)}>Release</ConfirmButton>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
          <section className="card">
            <div className="card-head"><h3>Prospects this season</h3><span className="muted small">A better <Tip k="scout">Scout</Tip> narrows the potential guess</span></div>
            <DataTable rows={pool} columns={poolCols} rowKey={(d) => d.id} initialSort={{ key: 'pot', dir: 'desc' }} empty="All prospects have signed somewhere. New ones arrive next season." />
          </section>
        </>
      )}

      {tab === 'facilities' && (
        <>
          {team.building && (
            <div className="alert alert-info"><span>Building {FAC_INFO[team.building.kind].label.toLowerCase()} level {team.facilities[team.building.kind] + 1}: {team.building.racesLeft} race(s) to go.</span></div>
          )}
          <div className="grid grid-3">
            {FACILITIES.map((k) => {
              const lv = team.facilities[k];
              const cost = facilityCost(tier, lv);
              const max = lv >= MAX_FACILITY;
              return (
                <section key={k} className="card">
                  <div className="card-head"><h3><Tip k={FAC_INFO[k].tip}>{FAC_INFO[k].label}</Tip></h3><span className="tag">Level {lv}</span></div>
                  <div className="level-pips">{Array.from({ length: MAX_FACILITY }, (_, i) => <i key={i} className={i < lv ? 'on' : ''} />)}</div>
                  <p className="small">{lv ? FAC_INFO[k].effect(lv) : 'No effect yet.'}</p>
                  <p className="muted small">{max ? 'Fully built.' : `Next: ${FAC_INFO[k].effect(lv + 1)}`}</p>
                  {!max && (
                    <ConfirmButton className="btn btn-primary" disabled={racing || !!team.building || team.budget < cost} confirmText={`Spend ${money(cost)}?`}
                      onConfirm={() => act(build(k), `Construction started: ${FAC_INFO[k].label} level ${lv + 1}.`)}>
                      Build level {lv + 1} · {money(cost)}
                    </ConfirmButton>
                  )}
                </section>
              );
            })}
          </div>
          <p className="muted small">One project at a time. Each level takes {FACILITY_BUILD_RACES} races to build and is permanent.</p>
        </>
      )}
    </div>
  );
}
