import { useState } from 'react';
import { order, type RaceState } from '../../engine/raceSim';
import type { Compound, Team } from '../../engine/types';
import { carLap, lapsDown, textOn } from '../../engine/raceView';
import { lapTime } from '../format';
import type { RaceLook } from '../raceLook';
import { Tip } from './Tip';

export function TyreBadge({ c, age }: { c: Compound; age?: number }) {
  return (
    <span className="tyre-wrap">
      <Tip k={c} plain><span className={`tyre tyre-${c}`}>{c[0].toUpperCase()}</span></Tip>
      {age !== undefined && <span className="tyre-age">{age}</span>}
    </span>
  );
}

/** Live order: position, number, driver, lap, gap or interval, tyre, stops. */
export function TimingTower({ race, teams, playerTeamId, look }: { race: RaceState; teams: Record<string, Team>; playerTeamId: string; look?: RaceLook }) {
  const [mode, setMode] = useState<'gap' | 'interval'>('interval');
  const ord = order(race.cars);
  const leader = ord[0];
  const down = lapsDown(race);
  return (
    <div className="tower">
      <div className="tower-head">
        <span><Tip k="lap">Lap</Tip> <b>{Math.min(race.lap + (race.finished ? 0 : 1), race.totalLaps)}</b>/{race.totalLaps}</span>
        <div className="seg seg-sm">
          <button className={mode === 'interval' ? 'on' : ''} onClick={() => setMode('interval')}><Tip k="interval" plain>Int</Tip></button>
          <button className={mode === 'gap' ? 'on' : ''} onClick={() => setMode('gap')}><Tip k="gap" plain>Gap</Tip></button>
        </div>
      </div>
      <div className="tower-cols" aria-hidden>
        <span>Pos</span><span /><span>No.</span><span>Driver</span>
        <span className="c"><Tip k="lap" plain>Lap</Tip></span><span className="r">{mode === 'gap' ? 'Gap' : 'Int'}</span>
        <span className="c">Tyre</span><span className="c">Pit</span>
      </div>
      <ol className="tower-list">
        {ord.map((c, i) => {
          const team = teams[c.c.teamId];
          const color = look?.colors[c.c.teamId] ?? team.colors.primary;
          const prev = ord[i - 1];
          const gap = i === 0 ? 0 : mode === 'gap' ? c.totalTime - leader.totalTime : c.totalTime - prev.totalTime;
          const fastest = race.fastestLap?.driverId === c.c.driverId;
          const lapsBehind = down[c.c.driverId] ?? 0;
          // Interval to a car on an earlier lap is still shown in seconds; laps down always wins in Gap mode.
          const lapsGap = mode === 'gap' ? lapsBehind : lapsBehind - (down[prev?.c.driverId ?? ''] ?? 0);
          const pitting = c.pittedThisLap && !c.dnf && race.lap > 0 && !race.finished;
          const surname = c.c.name.split(' ').slice(-1)[0].toUpperCase();
          return (
            <li key={c.c.driverId} className={'tower-row' + (c.c.teamId === playerTeamId ? ' me' : '') + (c.dnf ? ' out' : '')}>
              <span className="tw-pos">{c.dnf ? '-' : i + 1}</span>
              <i className="tw-bar" style={{ background: color }} />
              <span className="tw-num" style={{ background: color, color: textOn(color) }}>{look?.numbers[c.c.driverId] ?? ''}</span>
              <span className="tw-name" title={c.c.name}><span className="tw-sn">{surname}</span></span>
              <span className={'tw-lap' + (pitting ? ' pit' : lapsBehind > 0 ? ' down' : '')}>
                {c.dnf ? '' : pitting ? <Tip k="pitStop" plain>PIT</Tip> : carLap(race, lapsBehind)}
              </span>
              <span className={'tw-gap' + (fastest ? ' fastest' : '') + (lapsGap > 0 && i > 0 && !c.dnf ? ' lapped' : '')}>
                {c.dnf ? <Tip k="dnf" plain>OUT</Tip> : race.lap === 0 ? '' : i === 0 ? 'Leader'
                  : lapsGap > 0 ? <Tip k="lapped" plain>{`+${lapsGap} LAP${lapsGap > 1 ? 'S' : ''}`}</Tip>
                  : `+${gap.toFixed(gap >= 100 ? 1 : 3)}`}
              </span>
              <span className="tw-tyre">{!c.dnf && <TyreBadge c={c.tyre.compound} age={c.tyre.age} />}</span>
              <span className="tw-stops" title="Pit stops">{c.pitRequest && !c.dnf ? <span className="boxing">BOX</span> : c.pitStops}</span>
            </li>
          );
        })}
      </ol>
      {race.fastestLap && (
        <div className="tower-foot"><Tip k="fastestLap">Fastest lap</Tip> <b className="fastest">{lapTime(race.fastestLap.time)}</b> {race.cars.find((c) => c.c.driverId === race.fastestLap!.driverId)?.c.name}</div>
      )}
    </div>
  );
}
