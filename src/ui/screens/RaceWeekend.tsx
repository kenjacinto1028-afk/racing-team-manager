import { useEffect, useMemo, useRef, useState } from 'react';
import { TRACK_BY_ID } from '../../data/tracks';
import { COMPOUNDS, wearPerLap } from '../../engine/performance';
import { order, tyreLife, type RaceCar, type RaceState } from '../../engine/raceSim';
import type { Compound, DriverMode, GameState, Team } from '../../engine/types';
import { seasonOver, useGame, type RaceSpeed } from '../../store/gameStore';
import { Pos, TeamName, useFlash } from '../components/bits';
import { DataTable, type Column } from '../components/DataTable';
import { TimingTower, TyreBadge } from '../components/TimingTower';
import { Tip } from '../components/Tip';
import { TrackMap } from '../components/TrackMap';
import { TrackProfile } from '../components/TrackProfile';
import { FLAG, gapStr, lapTime, money, ordinal } from '../format';
import { usePlayer } from '../hooks';
import { useNav } from '../nav';

/** Real seconds per lap at 1x. */
const LAP_MS = 3000;

export function RaceWeekend() {
  const { g, team, tier, league } = usePlayer();
  const weekend = useGame((s) => s.weekend);
  const race = useGame((s) => s.race);
  const lastRace = useGame((s) => s.lastRace);
  const L = g.leagues[tier];
  const done = L.results.length;

  if (race) return <LiveRace race={race} g={g} team={team} />;
  if (weekend) return <Qualifying />;
  if (lastRace && lastRace.season === g.season && lastRace.round === done && done > 0) return <Results />;
  if (seasonOver(g)) return <SeasonDone />;

  const track = TRACK_BY_ID[L.calendar[done]];
  return <PreRace trackId={track.id} round={done + 1} races={league.races} />;
}

function SeasonDone() {
  const { go } = useNav();
  return (
    <div className="page">
      <div className="page-head"><h1>Season complete</h1><p>All races are done. See the final tables, who goes up and down, and sort out contracts.</p></div>
      <div><button className="btn btn-primary btn-lg" onClick={() => go('review')}>Season review ›</button></div>
    </div>
  );
}

function PreRace({ trackId, round, races }: { trackId: string; round: number; races: number }) {
  const { g, team } = usePlayer();
  const prepare = useGame((s) => s.prepareRace);
  const [flash, show] = useFlash();
  const { go } = useNav();
  const track = TRACK_BY_ID[trackId];
  const short = team.driverIds.length < 2;
  return (
    <div className="page">
      <div className="page-head">
        <span className="tag">Round {round} of {races}</span>
        <h1 style={{ marginTop: 12 }}>{track.name}</h1>
        <p>{track.country} · {track.laps} <Tip k="lap">laps</Tip>. First, <Tip k="qualifying">qualifying</Tip> decides the <Tip k="grid">starting order</Tip>.</p>
      </div>
      {flash}
      <div className="grid grid-2">
        <section className="card map-card"><TrackMap track={track} teams={g.teams} playerTeamId={team.id} /></section>
        <section className="card">
          <h3>Track profile</h3>
          <TrackProfile track={track} />
          <p className="muted small">{track.profile.power > 0.65 ? 'Long straights: a strong engine pays off here.' : track.profile.downforce > 0.65 ? 'Twisty and tight: aero grip is king.' : 'A balanced circuit.'} {track.profile.tyreWear > 0.6 ? 'Hard on tyres, so expect stops to matter.' : ''} {track.profile.overtaking > 0.7 ? 'Passing is very hard: qualifying well is vital.' : ''}</p>
          <div className="race-cta">
            {short ? (
              <button className="btn btn-primary btn-lg" onClick={() => go('drivers')}>Sign a second driver first ›</button>
            ) : (
              <button className="btn btn-primary btn-lg" onClick={() => { const r = prepare(); if (!r.ok) show(r.reason, 'bad'); }}>Run qualifying ›</button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Qualifying() {
  const { g, team } = usePlayer();
  const weekend = useGame((s) => s.weekend)!;
  const start = useGame((s) => s.startRace);
  const track = TRACK_BY_ID[g.leagues[weekend.tier].calendar[weekend.round - 1]];
  const mine = weekend.field.filter((c) => c.teamId === team.id);
  const [compounds, setCompounds] = useState<Record<string, Compound>>(() => Object.fromEntries(mine.map((c) => [c.driverId, 'medium' as Compound])));
  const pole = weekend.qualifying[0];

  type Q = (typeof weekend.qualifying)[number];
  const cols: Column<Q>[] = [
    { key: 'pos', label: 'Pos', sort: (r) => r.position, render: (r) => <Pos n={r.position} />, width: 56 },
    { key: 'driver', label: 'Driver', sort: (r) => g.drivers[r.driverId].lastName, render: (r) => { const d = g.drivers[r.driverId]; return <span>{FLAG[d.nationality]} {d.firstName} <b>{d.lastName}</b></span>; } },
    { key: 'team', label: 'Team', sort: (r) => g.teams[r.teamId].name, render: (r) => <TeamName team={g.teams[r.teamId]} /> },
    { key: 'time', label: 'Time', align: 'right', sort: (r) => r.time, render: (r) => <span className="mono">{lapTime(r.time)}</span> },
    { key: 'gap', label: 'Gap', tip: 'gap', align: 'right', sort: (r) => r.time, render: (r) => <span className="mono muted">{r.position === 1 ? '-' : gapStr(r.time - pole.time)}</span> },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <span className="tag">Round {weekend.round} · Qualifying</span>
        <h1 style={{ marginTop: 12 }}>{track.name}</h1>
        <p><b>{g.drivers[pole.driverId].firstName} {g.drivers[pole.driverId].lastName}</b> takes <Tip k="pole">pole position</Tip>. Your drivers start {mine.map((c) => `P${weekend.qualifying.find((q) => q.driverId === c.driverId)!.position}`).join(' and ')}.</p>
      </div>
      <div className="grid grid-2-1">
        <section className="card">
          <DataTable rows={weekend.qualifying} columns={cols} rowKey={(r) => r.driverId} rowClass={(r) => (r.teamId === team.id ? 'me' : undefined)} />
        </section>
        <section className="card">
          <h3>Starting <Tip k="tyres">tyres</Tip></h3>
          <p className="muted small">Pick a compound for each driver. Softer tyres are faster but wear quicker. Every car must <Tip k="mandatoryStop">pit at least once</Tip>.</p>
          {mine.map((c) => (
            <div key={c.driverId} className="compound-pick">
              <div className="compound-driver">{g.drivers[c.driverId].lastName} <span className="muted small">starts P{weekend.qualifying.find((q) => q.driverId === c.driverId)!.position}</span></div>
              <div className="compound-row">
                {COMPOUNDS.map((comp) => (
                  <button key={comp} className={'compound-btn' + (compounds[c.driverId] === comp ? ' on' : '')} onClick={() => setCompounds({ ...compounds, [c.driverId]: comp })}>
                    <TyreBadge c={comp} />
                    <span>{comp}</span>
                    <span className="muted small">~{tyreLife(c, comp, track)} laps</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="race-cta">
            <button className="btn btn-primary btn-lg" onClick={() => start(compounds)}>Lights out ›</button>
          </div>
        </section>
      </div>
    </div>
  );
}

function useRaceClock(race: RaceState, speed: RaceSpeed, paused: boolean): number {
  const tick = useGame((s) => s.tick);
  const [phase, setPhase] = useState(0);
  const phaseRef = useRef(0);
  const lapRef = useRef(race.lap);

  useEffect(() => {
    if (race.finished || paused) return;
    // A new lap has arrived: start the in-lap clock from zero.
    if (race.lap !== lapRef.current) { lapRef.current = race.lap; phaseRef.current = 0; }
    let raf = 0;
    const dur = LAP_MS / speed;
    const start = performance.now() - phaseRef.current * dur;
    const loop = (now: number) => {
      const p = (now - start) / dur;
      if (p >= 1) { phaseRef.current = 1; tick(); return; }
      phaseRef.current = p;
      setPhase(p);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [race.lap, race.finished, speed, paused, tick]);

  if (race.finished) return 0;
  return race.lap !== lapRef.current ? 0 : phase;
}

function LiveRace({ race, g, team }: { race: RaceState; g: GameState; team: Team }) {
  const speed = useGame((s) => s.raceSpeed);
  const setSpeed = useGame((s) => s.setSpeed);
  const skip = useGame((s) => s.skipRace);
  const finish = useGame((s) => s.finishRace);
  const [paused, setPaused] = useState(false);
  const [feedMine, setFeedMine] = useState(false);
  const phase = useRaceClock(race, speed, paused);
  const mine = race.cars.filter((c) => c.c.teamId === team.id);
  const myIds = new Set(mine.map((c) => c.c.driverId));
  const feed = useMemo(() => [...race.events].reverse().filter((e) => !feedMine || e.driverIds.some((id) => myIds.has(id))).slice(0, 40),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [race.events, feedMine]);

  return (
    <div className="race-page">
      <div className="race-top">
        <div>
          <span className="tag live-tag">{race.finished ? 'Finished' : 'Live'}</span>
          <h2 className="race-title">{race.track.name}</h2>
        </div>
        <div className="race-controls">
          {!race.finished && (
            <>
              <button className="btn btn-sm" onClick={() => setPaused(!paused)}>{paused ? '▶ Resume' : '❚❚ Pause'}</button>
              <div className="seg">
                {([1, 4, 16] as RaceSpeed[]).map((s) => <button key={s} className={speed === s ? 'on' : ''} onClick={() => setSpeed(s)}>{s}×</button>)}
              </div>
              <button className="btn btn-sm" onClick={skip}>Skip to end ⏭</button>
            </>
          )}
          {race.finished && <button className="btn btn-primary btn-lg" onClick={() => finish()}>Results & payout ›</button>}
        </div>
      </div>
      <div className="lap-progress"><i style={{ width: `${((race.lap + phase) / race.totalLaps) * 100}%` }} /></div>

      <div className="race-grid">
        <section className="card map-card">
          <TrackMap track={race.track} race={race} teams={g.teams} playerTeamId={team.id} progress={phase} />
        </section>
        <section className="card tower-card">
          <TimingTower race={race} teams={g.teams} playerTeamId={team.id} />
        </section>
      </div>

      <div className="race-grid-bottom">
        {mine.map((car) => <PitWall key={car.c.driverId} car={car} race={race} position={order(race.cars).indexOf(car) + 1} />)}
        <section className="card feed-card">
          <div className="card-head">
            <h3>Commentary</h3>
            <div className="seg seg-sm">
              <button className={!feedMine ? 'on' : ''} onClick={() => setFeedMine(false)}>All</button>
              <button className={feedMine ? 'on' : ''} onClick={() => setFeedMine(true)}>My team</button>
            </div>
          </div>
          <ul className="feed">
            {feed.map((e, i) => (
              <li key={`${e.lap}-${i}-${e.text}`} className={`feed-${e.type}` + (e.driverIds.some((id) => myIds.has(id)) ? ' mine' : '')}>
                <span className="feed-lap">L{e.lap}</span>{e.text}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

const MODES: DriverMode[] = ['conserve', 'normal', 'push'];

function PitWall({ car, race, position }: { car: RaceCar; race: RaceState; position: number }) {
  const pit = useGame((s) => s.pit);
  const setMode = useGame((s) => s.setMode);
  const perLap = wearPerLap(car.c, car.tyre.compound, car.mode, race.track);
  const lapsLeftOnTyre = Math.max(0, Math.floor((72 - car.tyre.wear) / perLap));
  const lapsLeft = race.totalLaps - race.lap;
  const wearColor = car.tyre.wear > 70 ? 'var(--bad)' : car.tyre.wear > 45 ? 'var(--warn)' : 'var(--good)';
  const disabled = car.dnf || race.finished;

  return (
    <section className={'card pitwall' + (car.dnf ? ' out' : '')}>
      <div className="pitwall-head">
        <div>
          <div className="pitwall-name">{car.c.name}</div>
          <div className="muted small">{car.dnf ? `Out: ${car.dnfReason}` : `${ordinal(position)} · ${car.pitStops} stop${car.pitStops === 1 ? '' : 's'}`}{!car.dnf && car.pitStops === 0 && <> · <Tip k="mandatoryStop"><span className="warn">stop needed</span></Tip></>}</div>
        </div>
        <div className="pitwall-pos">{car.dnf ? 'DNF' : `P${position}`}</div>
      </div>
      {!car.dnf && (
        <>
          <div className="wear">
            <div className="statbar-head">
              <span><TyreBadge c={car.tyre.compound} age={car.tyre.age} /> <Tip k="wear">Tyre wear</Tip></span>
              <span className="statbar-value">{Math.round(car.tyre.wear)}%</span>
            </div>
            <div className="statbar-track"><i style={{ width: `${Math.min(100, car.tyre.wear)}%`, background: wearColor }} /><span className="statbar-mark" style={{ left: '70%' }} title="Tyre cliff (70%)" /></div>
            <div className="muted small" style={{ marginTop: 6 }}>About {lapsLeftOnTyre} good laps left · {lapsLeft} laps to go</div>
            {car.tyre.wear >= 70 && !car.pitRequest && <div className="tyre-alert">Tyres are past the cliff and losing seconds a lap. Pit now!</div>}
          </div>
          <div className="pitwall-label">Driver mode</div>
          <div className="seg full">
            {MODES.map((m) => (
              <button key={m} disabled={disabled} className={car.mode === m ? 'on' : ''} onClick={() => setMode(car.c.driverId, m)}>
                <Tip k={m} plain>{m[0].toUpperCase() + m.slice(1)}</Tip>
              </button>
            ))}
          </div>
          <div className="pitwall-label"><Tip k="pitStop">Pit stop</Tip></div>
          {car.pitRequest ? (
            <div className="boxing-row">
              <span>Boxing this lap for <TyreBadge c={car.pitRequest} /> {car.pitRequest}s</span>
              <button className="btn btn-sm" disabled={disabled} onClick={() => pit(car.c.driverId, null)}>Cancel</button>
            </div>
          ) : (
            <div className="pit-row">
              {COMPOUNDS.map((comp) => (
                <button key={comp} className="btn btn-sm" disabled={disabled || lapsLeft <= 1} onClick={() => pit(car.c.driverId, comp)}>
                  <TyreBadge c={comp} /> Pit
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Results() {
  const { g, team, tier, league } = usePlayer();
  const lastRace = useGame((s) => s.lastRace)!;
  const prepare = useGame((s) => s.prepareRace);
  const [flash, show] = useFlash();
  const { go } = useNav();
  const track = TRACK_BY_ID[lastRace.result.trackId];
  const res = lastRace.result;
  const over = seasonOver(g);
  const lines = g.finance.ledger.filter((e) => e.season === lastRace.season && e.round === lastRace.round && /^(Sponsor|Points bonus|Salaries)/.test(e.label));
  const fastest = res.entries.filter((e) => !e.dnf && e.bestLap > 0).sort((a, b) => a.bestLap - b.bestLap)[0];
  const winner = res.entries[0];
  const L = g.leagues[tier];
  const nextTrack = TRACK_BY_ID[L.calendar[L.results.length]];

  type E = (typeof res.entries)[number];
  const cols: Column<E>[] = [
    { key: 'pos', label: 'Pos', sort: (r) => r.position, render: (r) => (r.dnf ? <span className="pos">-</span> : <Pos n={r.position} />), width: 56 },
    { key: 'driver', label: 'Driver', sort: (r) => g.drivers[r.driverId].lastName, render: (r) => <b>{g.drivers[r.driverId].firstName} {g.drivers[r.driverId].lastName}</b> },
    { key: 'team', label: 'Team', sort: (r) => g.teams[r.teamId].name, render: (r) => <TeamName team={g.teams[r.teamId]} /> },
    { key: 'grid', label: 'Grid', tip: 'grid', align: 'center', sort: (r) => r.grid, render: (r) => { const d = r.grid - r.position; return <span>{r.grid} {!r.dnf && d !== 0 && <span className={d > 0 ? 'good small' : 'bad small'}>{d > 0 ? `▲${d}` : `▼${-d}`}</span>}</span>; } },
    { key: 'stops', label: 'Stops', tip: 'pitStop', align: 'center', sort: (r) => r.pitStops, render: (r) => r.pitStops },
    { key: 'best', label: 'Best lap', tip: 'fastestLap', align: 'right', sort: (r) => r.bestLap || 999, render: (r) => <span className={'mono' + (fastest?.driverId === r.driverId ? ' fastest' : '')}>{lapTime(r.bestLap)}</span> },
    { key: 'time', label: 'Time', align: 'right', sort: (r) => (r.dnf ? 1e9 - r.laps : r.totalTime), render: (r) => <span className="mono">{r.dnf ? <Tip k="dnf">{r.dnfReason ?? 'DNF'}</Tip> : r.position === 1 ? lapTime(r.totalTime) : gapStr(r.totalTime - winner.totalTime)}</span> },
    { key: 'pts', label: 'Pts', tip: 'points', align: 'right', sort: (r) => r.points, render: (r) => (r.points ? <b>{r.points}</b> : <span className="muted">0</span>) },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <span className="tag">Round {lastRace.round} of {league.races} · Result</span>
        <h1 style={{ marginTop: 12 }}>{track.name}</h1>
        <p>{g.drivers[winner.driverId].firstName} {g.drivers[winner.driverId].lastName} wins for {g.teams[winner.teamId].name}.</p>
      </div>
      {flash}
      <div className="grid grid-2-1">
        <section className="card">
          <DataTable rows={res.entries} columns={cols} rowKey={(r) => r.driverId} rowClass={(r) => (r.teamId === team.id ? 'me' : undefined)} />
        </section>
        <div className="stack">
          <section className="card">
            <h3>Payout</h3>
            {lines.map((e, i) => (
              <div className="list-row" key={i}><span>{e.label}</span><b className={e.amount >= 0 ? 'good' : 'bad'}>{money(e.amount, { sign: true })}</b></div>
            ))}
            <div className="list-row total"><span>Net</span><b className={lastRace.budgetAfter - lastRace.budgetBefore >= 0 ? 'good' : 'bad'}>{money(lastRace.budgetAfter - lastRace.budgetBefore, { sign: true })}</b></div>
            <div className="list-row"><span><Tip k="budget">Budget</Tip></span><b>{money(team.budget)}</b></div>
          </section>
          <section className="card">
            {over ? (
              <>
                <h3>Season complete</h3>
                <p className="muted small">That was the final round.</p>
                <button className="btn btn-primary btn-lg" onClick={() => go('review')}>Season review ›</button>
              </>
            ) : (
              <>
                <h3>Next: {nextTrack.name}</h3>
                <p className="muted small">Round {L.results.length + 1} · {nextTrack.country}. Upgrade the car or change staff first if you like.</p>
                <div className="btn-row">
                  <button className="btn" onClick={() => go('hq')}>Back to HQ</button>
                  <button className="btn btn-primary" onClick={() => { const r = prepare(); if (!r.ok) show(r.reason, 'bad'); }}>Qualifying ›</button>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
