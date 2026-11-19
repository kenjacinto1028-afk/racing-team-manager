import { useMemo, useState } from 'react';
import { driverOverall } from '../../engine/generate';
import { driverOffer, releaseCost } from '../../engine/market';
import { willingToJoin } from '../../engine/finance';
import type { Driver } from '../../engine/types';
import { useGame } from '../../store/gameStore';
import { ConfirmButton, Empty, Tabs, useFlash } from '../components/bits';
import { DataTable, type Column } from '../components/DataTable';
import { Rating, StatBar } from '../components/StatBar';
import { Tip } from '../components/Tip';
import { ContractTalks } from '../components/ContractTalks';
import { MoraleBar, TraitChips } from './Development';
import { potentialRange } from '../../engine/scouting';
import { FLAG, money } from '../format';
import { usePlayer } from '../hooks';

const STATS: { k: keyof Driver & string; label: string }[] = [
  { k: 'pace', label: 'Pace' },
  { k: 'consistency', label: 'Consistency' },
  { k: 'racecraft', label: 'Racecraft' },
  { k: 'tyreManagement', label: 'Tyre management' },
  { k: 'experience', label: 'Experience' },
];

type Tab = 'team' | 'market';
type AgeFilter = 'all' | 'u21' | '21-28' | '29+';

export function Drivers() {
  const { g, team } = usePlayer();
  const hire = useGame((s) => s.hireDriver);
  const release = useGame((s) => s.releaseDriver);
  const racing = useGame((s) => !!s.race);
  const [tab, setTab] = useState<Tab>('team');
  const [q, setQ] = useState('');
  const [age, setAge] = useState<AgeFilter>('all');
  const [afford, setAfford] = useState(false);
  const [flash, show] = useFlash();
  const [talks, setTalks] = useState<Driver | null>(null);
  const potStr = (d: Driver) => { const p = potentialRange(g, d); return p.exact ? String(p.lo) : `${p.lo}-${p.hi}`; };

  const mine = team.driverIds.map((id) => g.drivers[id]);
  const seatsFree = 2 - mine.length;

  const market = useMemo(() => g.driverMarket.map((id) => {
    const d = g.drivers[id];
    const ovr = driverOverall(d);
    return { d, ovr, willing: willingToJoin(ovr, team.tier), ...driverOffer(g, team.id, id) };
  }), [g, team.id]);

  const filtered = market.filter(({ d, fee, willing }) => {
    if (q && !`${d.firstName} ${d.lastName}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (age === 'u21' && d.age >= 21) return false;
    if (age === '21-28' && (d.age < 21 || d.age > 28)) return false;
    if (age === '29+' && d.age < 29) return false;
    if (afford && fee > team.budget) return false;
    if (afford && !willing) return false;
    return true;
  });

  const doHire = (d: Driver) => {
    if (!d.payBudget) { setTalks(d); return; }
    const r = hire(d.id, 2);
    show(r.ok ? `Signed ${d.firstName} ${d.lastName} on a 2-year deal.` : r.reason, r.ok ? 'good' : 'bad');
    if (r.ok) setTab('team');
  };

  type Row = (typeof market)[number];
  const cols: Column<Row>[] = [
    { key: 'name', label: 'Driver', sort: (r) => r.d.lastName, render: (r) => <span>{FLAG[r.d.nationality]} <b>{r.d.firstName} {r.d.lastName}</b> <TraitChips d={r.d} />{r.d.payBudget ? <Tip k="payDriver" plain><span className="badge badge-pay">Pay</span></Tip> : null}</span> },
    { key: 'age', label: 'Age', tip: 'age', align: 'center', sort: (r) => r.d.age, render: (r) => r.d.age },
    { key: 'ovr', label: 'OVR', tip: 'overall', align: 'center', sort: (r) => r.ovr, render: (r) => <Rating v={r.ovr} k="overall" /> },
    { key: 'pace', label: 'PAC', tip: 'pace', align: 'center', sort: (r) => r.d.pace, render: (r) => r.d.pace },
    { key: 'con', label: 'CON', tip: 'consistency', align: 'center', sort: (r) => r.d.consistency, render: (r) => r.d.consistency },
    { key: 'rc', label: 'RCR', tip: 'racecraft', align: 'center', sort: (r) => r.d.racecraft, render: (r) => r.d.racecraft },
    { key: 'tyr', label: 'TYR', tip: 'tyreManagement', align: 'center', sort: (r) => r.d.tyreManagement, render: (r) => r.d.tyreManagement },
    { key: 'exp', label: 'EXP', tip: 'experience', align: 'center', sort: (r) => r.d.experience, render: (r) => r.d.experience },
    { key: 'pot', label: 'POT', tip: 'potential', align: 'center', sort: (r) => potentialRange(g, r.d).hi, render: (r) => <span className="muted">{potStr(r.d)}</span> },
    { key: 'sal', label: 'Salary', tip: 'salary', align: 'right', sort: (r) => r.salary, render: (r) => r.salary < 0 ? <span className="good" title="A pay driver brings this much per race">+{money(-r.salary)}</span> : money(r.salary) },
    { key: 'fee', label: 'Fee', tip: 'signingFee', align: 'right', sort: (r) => r.fee, render: (r) => <span className={r.fee > team.budget ? 'bad' : ''}>{money(r.fee)}</span> },
    {
      key: 'act', label: '', align: 'right', render: (r) => !r.willing ? <span className="muted small" title="Stars won't race more than one league below their level.">Too good</span> : (
        <button className="btn btn-sm btn-primary" disabled={seatsFree === 0 || r.fee > team.budget || racing} onClick={() => doHire(r.d)}
          title={seatsFree === 0 ? 'Both seats are full. Release a driver first.' : r.fee > team.budget ? 'Not enough money' : r.d.payBudget ? 'Pay driver: fixed 2-season deal' : 'Open contract talks'}>
          {r.d.payBudget ? 'Sign' : 'Talk'}
        </button>
      ),
    },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <h1>Drivers</h1>
        <p>Two seats. Pace matters most, but <Tip k="racecraft">racecraft</Tip> wins fights and <Tip k="tyreManagement">tyre management</Tip> makes strategy easier.</p>
      </div>
      {flash}
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[
        { id: 'team', label: 'Your drivers', count: mine.length },
        { id: 'market', label: 'Transfer market', count: market.length },
      ]} />

      {talks && <ContractTalks d={talks} onClose={() => setTalks(null)} onSigned={(m) => { show(m); setTab('team'); }} />}

      {tab === 'team' && (
        <div className="grid grid-2">
          {mine.map((d) => {
            const cost = d.contract ? releaseCost(d.contract.salary, d.contract.yearsLeft) : 0;
            return (
              <section key={d.id} className="card driver-card" style={{ ['--team' as string]: team.colors.primary }}>
                <div className="driver-head">
                  <div>
                    <div className="driver-name">{d.firstName} <b>{d.lastName}</b></div>
                    <div className="muted small">{FLAG[d.nationality]} · Age {d.age} · <Tip k="potential">Potential</Tip> {potStr(d)}{d.payBudget ? <Tip k="payDriver" plain><span className="badge badge-pay">Pay driver</span></Tip> : null} <TraitChips d={d} /></div>
                  </div>
                  <div className="ovr-badge"><Tip k="overall" plain>{driverOverall(d)}</Tip><span>OVR</span></div>
                </div>
                <MoraleBar m={d.morale} />
                {STATS.map((s) => <StatBar key={s.k} k={s.k} label={s.label} value={d[s.k] as number} compare={potentialRange(g, d).hi} compareLabel={`Potential ${potStr(d)}`} />)}
                <div className="contract-row">
                  {(d.contract?.salary ?? 0) < 0
                    ? <span><Tip k="payDriver">Brings</Tip> <b className="good">{money(-(d.contract?.salary ?? 0))}</b>/race</span>
                    : <span><Tip k="salary">Salary</Tip> <b>{money(d.contract?.salary ?? 0)}</b>/race{d.contract?.winBonus ? <span className="muted"> · win +{money(d.contract.winBonus)}</span> : null}{d.contract?.podiumBonus ? <span className="muted"> · podium +{money(d.contract.podiumBonus)}</span> : null}</span>}
                  <span><Tip k="contract">Contract</Tip> <b>{d.contract?.yearsLeft ?? 0}</b> season(s)</span>
                  <ConfirmButton className="btn btn-sm" disabled={racing || cost > team.budget} confirmText={`Settle ${money(cost)}? Morale -8`}
                    onConfirm={() => { const r = release(d.id); show(r.ok ? `${d.lastName} released.` : r.reason, r.ok ? 'good' : 'bad'); }}>
                    Release
                  </ConfirmButton>
                </div>
              </section>
            );
          })}
          {Array.from({ length: seatsFree }, (_, i) => (
            <Empty key={i}>
              <p>Empty seat</p>
              <button className="btn btn-primary" onClick={() => setTab('market')}>Find a driver ›</button>
            </Empty>
          ))}
        </div>
      )}

      {tab === 'market' && (
        <section className="card">
          <div className="filters">
            <input className="search" placeholder="Search name…" value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="seg">
              {(['all', 'u21', '21-28', '29+'] as AgeFilter[]).map((a) => (
                <button key={a} className={age === a ? 'on' : ''} onClick={() => setAge(a)}>{a === 'all' ? 'All ages' : a === 'u21' ? 'Under 21' : a}</button>
              ))}
            </div>
            <label className="check"><input type="checkbox" checked={afford} onChange={(e) => setAfford(e.target.checked)} /> Can afford</label>
            <span className="muted small" style={{ marginLeft: 'auto' }}>{seatsFree === 0 ? 'Both seats full: release a driver to sign someone.' : `${seatsFree} seat free`}</span>
          </div>
          <DataTable rows={filtered} columns={cols} rowKey={(r) => r.d.id} initialSort={{ key: 'ovr', dir: 'desc' }} empty="No drivers match these filters." />
        </section>
      )}
    </div>
  );
}
