import { useMemo, useState } from 'react';
import { LEAGUES } from '../../data/leagues';
import { BUDGET_CAP, payDriverIncome, raceSalaries } from '../../engine/finance';
import { teamStandings } from '../../engine/season';
import { goalProgress, MAX_PARTNERS, sponsorPerRace } from '../../engine/sponsors';
import type { LedgerEntry, SponsorDeal } from '../../engine/types';
import { useGame } from '../../store/gameStore';
import { Tabs, useFlash } from '../components/bits';
import { DataTable, type Column } from '../components/DataTable';
import { Tip } from '../components/Tip';
import { money } from '../format';
import { usePlayer } from '../hooks';

type Tab = 'overview' | 'sponsors' | 'ledger';
type Kind = 'all' | 'in' | 'out';

/** Balance after each race this season, rebuilt backwards from today's budget. */
function balanceSeries(ledger: LedgerEntry[], season: number, budget: number, races: number): { label: string; value: number }[] {
  const mine = ledger.filter((e) => e.season === season);
  const start = budget - mine.reduce((a, e) => a + e.amount, 0);
  const pts = [{ label: 'Start', value: start }];
  let bal = start;
  for (let r = 0; r <= races; r++) {
    const delta = mine.filter((e) => e.round === r).reduce((a, e) => a + e.amount, 0);
    bal += delta;
    if (r === 0) { if (delta) pts.push({ label: 'Pre-season', value: bal }); continue; }
    if (mine.some((e) => e.round === r)) pts.push({ label: `R${r}`, value: bal });
  }
  return pts;
}

function BalanceChart({ points, forecast }: { points: { label: string; value: number }[]; forecast: number | null }) {
  const [hover, setHover] = useState<number | null>(null);
  const all = [...points.map((p) => p.value), ...(forecast !== null ? [forecast] : []), 0];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const W = 640, H = 220, P = { l: 56, r: 16, t: 14, b: 26 };
  const n = points.length + (forecast !== null ? 1 : 0);
  const x = (i: number) => P.l + (n <= 1 ? 0 : (i * (W - P.l - P.r)) / (n - 1));
  const y = (v: number) => P.t + (max === min ? 0.5 : (max - v) / (max - min)) * (H - P.t - P.b);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.value)}`).join(' ');
  const ticks = [max, (max + min) / 2, min];
  const last = points.length - 1;
  return (
    <svg className="fin-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Balance over the season">
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} className="fin-grid" />
          <text x={P.l - 8} y={y(t) + 4} textAnchor="end" className="fin-axis">{money(t)}</text>
        </g>
      ))}
      {min < 0 && <line x1={P.l} x2={W - P.r} y1={y(0)} y2={y(0)} className="fin-zero" />}
      {forecast !== null && last >= 0 && (
        <line x1={x(last)} y1={y(points[last].value)} x2={x(last + 1)} y2={y(forecast)} className="fin-forecast" />
      )}
      <path d={path} className="fin-line" />
      {points.map((p, i) => (
        <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
          <rect x={x(i) - 14} y={P.t} width={28} height={H - P.t - P.b} fill="transparent" />
          <circle cx={x(i)} cy={y(p.value)} r={hover === i ? 5 : 3.5} className="fin-dot" />
          <text x={x(i)} y={H - 8} textAnchor="middle" className="fin-axis">{p.label}</text>
        </g>
      ))}
      {forecast !== null && (
        <g onMouseEnter={() => setHover(-1)} onMouseLeave={() => setHover(null)}>
          <rect x={x(last + 1) - 14} y={P.t} width={28} height={H - P.t - P.b} fill="transparent" />
          <circle cx={x(last + 1)} cy={y(forecast)} r={4} className="fin-dot fin-dot-hollow" />
          <text x={x(last + 1)} y={H - 8} textAnchor="middle" className="fin-axis">End</text>
        </g>
      )}
      {hover !== null && (() => {
        const v = hover === -1 ? forecast! : points[hover].value;
        const cx = hover === -1 ? x(last + 1) : x(hover);
        const label = hover === -1 ? 'Forecast' : points[hover].label;
        const bx = Math.min(Math.max(cx - 60, P.l), W - P.r - 120);
        return (
          <g pointerEvents="none">
            <line x1={cx} x2={cx} y1={P.t} y2={H - P.b} className="fin-cross" />
            <rect x={bx} y={Math.max(2, y(v) - 44)} width={120} height={34} rx={6} className="fin-tip" />
            <text x={bx + 10} y={Math.max(2, y(v) - 44) + 14} className="fin-tip-label">{label}</text>
            <text x={bx + 10} y={Math.max(2, y(v) - 44) + 28} className="fin-tip-value">{money(v)}</text>
          </g>
        );
      })()}
    </svg>
  );
}

function DealCard({ d, offer, onSign, disabled }: { d: SponsorDeal; offer?: boolean; onSign?: () => void; disabled?: boolean }) {
  const { g } = usePlayer();
  const p = goalProgress(g, d.goal);
  const pct = d.goal.kind === 'teamPos' ? (p.current ? Math.min(100, (d.goal.target / p.current) * 100) : 0) : Math.min(100, (p.current / p.target) * 100);
  return (
    <section className={'card sponsor-card' + (offer ? ' offer' : '')}>
      <div className="card-head">
        <div>
          <span className="tag">{d.kind === 'title' ? <Tip k="titleSponsor">Title sponsor</Tip> : <Tip k="partnerSponsor">Partner</Tip>}</span>
          <h3 className="sponsor-name">{d.name}</h3>
        </div>
        <div className="sponsor-pay"><b>{money(d.perRace)}</b><span>per race</span></div>
      </div>
      <div className="sponsor-goal">
        <span className="muted small"><Tip k="sponsorGoal">Goal</Tip></span>
        <div>{p.text}</div>
        {!offer && (
          <div className="goal-track" title={d.goal.kind === 'teamPos' ? `Currently ${p.current ? 'P' + p.current : 'no races yet'}` : `${p.current} of ${p.target}`}>
            <i style={{ width: `${pct}%` }} className={p.met ? 'met' : !p.possible ? 'lost' : ''} />
          </div>
        )}
        <div className="contract-row small">
          <span>Bonus <b>{money(d.bonus)}</b></span>
          <span>{d.seasons} season{d.seasons > 1 ? 's' : ''}</span>
          {!offer && <span className={p.met ? 'good' : !p.possible ? 'bad' : 'muted'}>{p.met ? 'On track' : !p.possible ? 'Out of reach' : d.goal.kind === 'teamPos' ? (p.current ? `Now P${p.current}` : 'Not started') : `${p.current}/${p.target}`}</span>}
          {offer && <button className="btn btn-sm btn-primary" disabled={disabled} onClick={onSign}>Sign</button>}
        </div>
      </div>
    </section>
  );
}

export function Finance() {
  const { g, team, tier, league } = usePlayer();
  const sign = useGame((s) => s.signSponsor);
  const setCap = useGame((s) => s.setBudgetCap);
  const racing = useGame((s) => !!s.race);
  const [tab, setTab] = useState<Tab>('overview');
  const [kind, setKind] = useState<Kind>('all');
  const [flash, show] = useFlash();

  const L = g.leagues[tier];
  const done = L.results.length;
  const left = league.races - done;
  const sponsors = sponsorPerRace(g);
  const payIn = payDriverIncome(g, team.id);
  const salaries = raceSalaries(g, team.id);
  const thisSeason = g.finance.ledger.filter((e) => e.season === g.season);
  const pointsMoney = thisSeason.filter((e) => e.label.startsWith('Points bonus')).reduce((a, e) => a + e.amount, 0);
  const avgPoints = done ? pointsMoney / done : 0;
  const netPerRace = sponsors + payIn - salaries + avgPoints;
  const pos = teamStandings(L).findIndex((r) => r.id === team.id) + 1;
  const prize = LEAGUES[tier].prizeMoney[(done ? pos : 6) - 1] ?? 0;
  const goalBonus = g.sponsors.active.filter((d) => goalProgress(g, d.goal).met).reduce((a, d) => a + d.bonus, 0);
  const forecast = team.budget + netPerRace * left + prize + goalBonus;

  const points = useMemo(() => balanceSeries(g.finance.ledger, g.season, team.budget, league.races), [g.finance.ledger, g.season, team.budget, league.races]);

  const income = thisSeason.filter((e) => e.amount > 0).reduce((a, e) => a + e.amount, 0);
  const costs = thisSeason.filter((e) => e.amount < 0).reduce((a, e) => a + e.amount, 0);
  const byLabel = (es: LedgerEntry[]) => {
    const m = new Map<string, number>();
    for (const e of es) {
      const k = e.label.startsWith('Points bonus') ? 'Points bonus' : e.label.startsWith('R&D') ? 'R&D upgrades' : e.label.startsWith('Signed') || e.label.startsWith('Hired') ? 'Signing fees' : e.label.startsWith('Released') ? 'Settlements' : e.label.startsWith('Sponsor bonus') ? 'Sponsor bonuses' : e.label.startsWith('Prize') ? 'Prize money' : e.label;
      m.set(k, (m.get(k) ?? 0) + e.amount);
    }
    return [...m.entries()].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  };
  const inLines = byLabel(thisSeason.filter((e) => e.amount > 0));
  const outLines = byLabel(thisSeason.filter((e) => e.amount < 0));

  const ledgerRows = g.finance.ledger.map((e, i) => ({ ...e, i })).filter((e) => kind === 'all' || (kind === 'in' ? e.amount > 0 : e.amount < 0));
  type LRow = (typeof ledgerRows)[number];
  const ledgerCols: Column<LRow>[] = [
    { key: 'when', label: 'When', sort: (r) => r.i, render: (r) => <span className="muted">S{r.season} · {r.round === 0 ? 'Pre-season' : `R${r.round}`}</span> },
    { key: 'label', label: 'Item', sort: (r) => r.label, render: (r) => r.label },
    { key: 'amt', label: 'Amount', align: 'right', sort: (r) => r.amount, render: (r) => <b className={r.amount < 0 ? 'bad' : 'good'}>{money(r.amount, { sign: true })}</b> },
  ];

  const hasTitle = g.sponsors.active.some((d) => d.kind === 'title');
  const partners = g.sponsors.active.filter((d) => d.kind === 'partner').length;
  const doSign = (d: SponsorDeal) => {
    const r = sign(d.id);
    show(r.ok ? `${d.name} signed.` : r.reason, r.ok ? 'good' : 'bad');
  };

  return (
    <div className="page">
      <div className="page-head">
        <h1>Finance</h1>
        <p>Sponsors pay every race, salaries go out every race. Hit sponsor goals for bonuses and keep the balance above zero.</p>
      </div>
      {flash}
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[
        { id: 'overview', label: 'Overview' },
        { id: 'sponsors', label: 'Sponsors', count: g.sponsors.active.length },
        { id: 'ledger', label: 'Ledger', count: g.finance.ledger.length },
      ]} />

      {tab === 'overview' && (
        <>
          <div className="grid grid-4">
            <div className="card kpi">
              <div className="stat-label"><Tip k="budget">Balance</Tip></div>
              <div className={'stat-value' + (team.budget < 0 ? ' neg' : '')}>{money(team.budget)}</div>
              <div className="kpi-sub">Season {g.season} · after {done} of {league.races} races</div>
            </div>
            <div className="card kpi">
              <div className="stat-label"><Tip text="Sponsor deals plus pay-driver money and average points bonus, per race.">Income per race</Tip></div>
              <div className="stat-value">{money(sponsors + payIn + avgPoints)}</div>
              <div className="kpi-sub">Sponsors {money(sponsors)}{payIn ? ` · Pay drivers ${money(payIn)}` : ''}</div>
            </div>
            <div className="card kpi">
              <div className="stat-label"><Tip k="salary">Salaries per race</Tip></div>
              <div className="stat-value">{money(salaries)}</div>
              <div className={'kpi-sub ' + (netPerRace < 0 ? 'bad' : 'good')}>Net {money(netPerRace, { sign: true })} per race</div>
            </div>
            <div className="card kpi">
              <div className="stat-label"><Tip k="forecast">Season-end forecast</Tip></div>
              <div className={'stat-value' + (forecast < 0 ? ' neg' : '')}>{money(forecast)}</div>
              <div className="kpi-sub">Incl. {money(prize)} prize{goalBonus ? ` + ${money(goalBonus)} sponsor bonus` : ''}</div>
            </div>
          </div>

          <section className="card">
            <div className="card-head"><h3>Balance this season</h3><span className="muted small">Dashed line: forecast to season end</span></div>
            <BalanceChart points={points} forecast={left > 0 ? forecast : null} />
          </section>

          <div className="grid grid-2">
            <section className="card">
              <div className="card-head"><h3>Income this season</h3><b className="good">{money(income)}</b></div>
              <table className="data compact"><tbody>
                {inLines.length === 0 && <tr><td className="empty">Nothing yet. Sponsors pay after each race.</td></tr>}
                {inLines.map(([k, v]) => <tr key={k}><td>{k}</td><td style={{ textAlign: 'right' }}>{money(v)}</td></tr>)}
              </tbody></table>
            </section>
            <section className="card">
              <div className="card-head"><h3>Costs this season</h3><b className="bad">{money(costs)}</b></div>
              <table className="data compact"><tbody>
                {outLines.length === 0 && <tr><td className="empty">No costs yet.</td></tr>}
                {outLines.map(([k, v]) => <tr key={k}><td>{k}</td><td style={{ textAlign: 'right' }}>{money(v)}</td></tr>)}
              </tbody></table>
            </section>
          </div>

          <section className="card">
            <div className="card-head">
              <h3><Tip k="budgetCap">Budget cap</Tip> (Formula Prime only)</h3>
              <label className="check"><input type="checkbox" checked={g.settings.budgetCap} disabled={racing} onChange={(e) => setCap(e.target.checked)} /> On</label>
            </div>
            <p className="muted small" style={{ margin: 0 }}>
              When on, every Formula Prime team can spend at most {money(BUDGET_CAP)} per season on R&D and signing fees.
              {tier === 1 ? ` You have spent ${money(team.spend)} this season.` : ' It only matters once you reach Formula Prime.'}
            </p>
          </section>
        </>
      )}

      {tab === 'sponsors' && (
        <>
          <h3 className="section-title">Your deals</h3>
          <div className="grid grid-2">
            {g.sponsors.active.map((d) => <DealCard key={d.id} d={d} />)}
            {!hasTitle && <div className="placeholder"><p>No title sponsor. Pick one from the offers below.</p></div>}
          </div>
          <h3 className="section-title">
            Offers <span className="muted small">· {hasTitle ? '' : '1 title slot open · '}{MAX_PARTNERS - partners} partner slot{MAX_PARTNERS - partners === 1 ? '' : 's'} open</span>
          </h3>
          {g.sponsors.offers.length === 0 ? (
            <div className="placeholder"><p>No open offers. New offers arrive at the start of each season for any empty slots.</p></div>
          ) : (
            <div className="grid grid-3">
              {g.sponsors.offers.map((d) => <DealCard key={d.id} d={d} offer disabled={racing} onSign={() => doSign(d)} />)}
            </div>
          )}
        </>
      )}

      {tab === 'ledger' && (
        <section className="card">
          <div className="filters">
            <div className="seg">
              {(['all', 'in', 'out'] as Kind[]).map((k) => (
                <button key={k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>{k === 'all' ? 'All' : k === 'in' ? 'Income' : 'Costs'}</button>
              ))}
            </div>
          </div>
          <DataTable rows={ledgerRows} columns={ledgerCols} rowKey={(r) => String(r.i)} initialSort={{ key: 'when', dir: 'desc' }} empty="No transactions yet." />
        </section>
      )}
    </div>
  );
}
