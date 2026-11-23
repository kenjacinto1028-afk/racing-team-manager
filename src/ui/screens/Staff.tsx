import { useMemo, useState } from 'react';
import { STAFF_ROLES } from '../../engine/generate';
import { releaseCost, staffOffer } from '../../engine/market';
import { courseCost } from '../../engine/development';
import type { Staff as StaffT, StaffRole } from '../../engine/types';
import { useGame } from '../../store/gameStore';
import { Tabs, useFlash } from '../components/bits';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DataTable, type Column } from '../components/DataTable';
import { Rating, StatBar } from '../components/StatBar';
import { Tip } from '../components/Tip';
import { money, ROLE_LABEL } from '../format';
import { usePlayer } from '../hooks';
import { StaffLink } from '../components/Links';

const EFFECT: Record<StaffRole, string> = {
  raceEngineer: 'Faster laps through better car setup.',
  chiefMechanic: 'Fewer mechanical failures (DNFs).',
  pitCrewChief: 'Quicker pit stops, fewer slow ones.',
  technicalDirector: 'Cheaper, bigger R&D upgrades.',
  scout: "Sharper read on drivers' potential.",
};

export function Staff() {
  const { g, team } = usePlayer();
  const hire = useGame((s) => s.hireStaff);
  const release = useGame((s) => s.releaseStaff);
  const course = useGame((s) => s.sendOnCourse);
  const racing = useGame((s) => !!s.race);
  const [role, setRole] = useState<StaffRole | 'all'>('all');
  const [releasing, setReleasing] = useState<string | null>(null);
  const [flash, show] = useFlash();

  const market = useMemo(() => g.staffMarket.map((id) => ({ s: g.staff[id], ...staffOffer(g, team.id, id) })), [g, team.id]);
  const rows = market.filter((r) => role === 'all' || r.s.role === role);

  const doHire = (s: StaffT) => {
    const r = hire(s.id, 2);
    show(r.ok ? `${s.name} joins as ${ROLE_LABEL[s.role]}.` : r.reason, r.ok ? 'good' : 'bad');
  };

  type Row = (typeof market)[number];
  const cols: Column<Row>[] = [
    { key: 'name', label: 'Name', sort: (r) => r.s.name, render: (r) => <b><StaffLink id={r.s.id} /></b> },
    { key: 'role', label: 'Role', sort: (r) => r.s.role, render: (r) => <Tip k={r.s.role}>{ROLE_LABEL[r.s.role]}</Tip> },
    { key: 'age', label: 'Age', tip: 'age', align: 'center', sort: (r) => r.s.age, render: (r) => r.s.age },
    { key: 'rating', label: 'Rating', tip: 'rating', align: 'center', sort: (r) => r.s.rating, render: (r) => <Rating v={r.s.rating} k="rating" /> },
    {
      key: 'vs', label: 'Vs yours', tip: 'vsYours', align: 'center', sort: (r) => r.s.rating - (g.staff[team.staffIds[r.s.role] ?? '']?.rating ?? 0),
      render: (r) => {
        const d = r.s.rating - (g.staff[team.staffIds[r.s.role] ?? '']?.rating ?? 0);
        return <span className={d > 0 ? 'good' : d < 0 ? 'bad' : 'muted'}>{d > 0 ? '+' : ''}{d}</span>;
      },
    },
    { key: 'sal', label: 'Salary', tip: 'salary', align: 'right', sort: (r) => r.salary, render: (r) => money(r.salary) },
    { key: 'fee', label: 'Fee', tip: 'signingFee', align: 'right', sort: (r) => r.fee, render: (r) => <span className={r.fee > team.budget ? 'bad' : ''}>{money(r.fee)}</span> },
    { key: 'act', label: '', align: 'right', render: (r) => <button className="btn btn-sm btn-primary" disabled={r.fee > team.budget || racing} onClick={() => doHire(r.s)}>Hire</button> },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <h1>Staff</h1>
        <p>One person per role. Hiring a replacement sends the current one to the market. Releasing someone costs a <Tip k="settlement">settlement</Tip> and a little <Tip k="morale">morale</Tip>.</p>
      </div>
      {flash}
      <div className="grid grid-5">
        {STAFF_ROLES.map((r) => {
          const s = team.staffIds[r] ? g.staff[team.staffIds[r]!] : null;
          return (
            <section key={r} className="card staff-card">
              <div className="stat-label"><Tip k={r}>{ROLE_LABEL[r]}</Tip></div>
              {s ? (
                <>
                  <div className="staff-name"><StaffLink id={s.id} /></div>
                  <StatBar label="Rating" k="rating" value={s.rating} />
                  <div className="muted small">{EFFECT[r]}</div>
                  <div className="contract-row small">
                    <span>{money(s.contract?.salary ?? 0)}/race</span>
                    <span>{s.contract?.yearsLeft ?? 0} season(s)</span>
                  </div>
                  <button className="btn btn-sm" disabled={racing || s.courseSeason === g.season || s.rating >= 95 || courseCost(g, s.id) > team.budget}
                    title={s.courseSeason === g.season ? 'Already on a course this season' : 'Rating +2 to +4'}
                    onClick={() => { const res = course(s.id); show(res.ok ? `${s.name} finished a course.` : res.reason, res.ok ? 'good' : 'bad'); }}>
                    <Tip k="staffCourse" plain>Course · {money(courseCost(g, s.id))}</Tip>
                  </button>
                  {(() => {
                    const cost = s.contract ? releaseCost(s.contract.salary, s.contract.yearsLeft) : 0;
                    return (
                      <>
                        <button className="btn btn-sm btn-ghost" disabled={racing || cost > team.budget} onClick={() => setReleasing(s.id)}>Release</button>
                        {releasing === s.id && (
                          <ConfirmDialog
                            title={`Release ${s.name}?`}
                            confirmLabel="Release"
                            danger
                            onCancel={() => setReleasing(null)}
                            onConfirm={() => {
                              const res = release(s.id);
                              setReleasing(null);
                              show(res.ok ? `${s.name} released.` : res.reason, res.ok ? 'good' : 'bad');
                            }}
                          >
                            <p>Ending the contract early costs a settlement of <b>{money(cost)}</b>, paid now.</p>
                            <p className="muted small">Team morale drops by 4. The {ROLE_LABEL[s.role]} post stays empty until you hire someone.</p>
                          </ConfirmDialog>
                        )}
                      </>
                    );
                  })()}
                </>
              ) : (
                <div className="bad">Vacant. Hire someone below.</div>
              )}
            </section>
          );
        })}
      </div>

      <section className="card">
        <div className="card-head"><h3>Staff market</h3></div>
        <Tabs<StaffRole | 'all'> value={role} onChange={setRole} tabs={[
          { id: 'all', label: 'All', count: market.length },
          ...STAFF_ROLES.map((r) => ({ id: r, label: ROLE_LABEL[r], count: market.filter((m) => m.s.role === r).length })),
        ]} />
        <DataTable rows={rows} columns={cols} rowKey={(r) => r.s.id} initialSort={{ key: 'rating', dir: 'desc' }} empty="Nobody available for this role." />
      </section>
    </div>
  );
}
