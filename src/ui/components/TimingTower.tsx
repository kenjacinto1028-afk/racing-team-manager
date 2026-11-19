import { useState } from 'react';
import { order, type RaceState } from '../../engine/raceSim';
import type { Compound, Team } from '../../engine/types';
import { lapTime } from '../format';
import { Tip } from './Tip';

export function TyreBadge({ c, age }: { c: Compound; age?: number }) {
  return (
    <span className="tyre-wrap">
      <Tip k={c} plain><span className={`tyre tyre-${c}`}>{c[0].toUpperCase()}</span></Tip>
      {age !== undefined && <span className="tyre-age">{age}</span>}
    </span>
  );
}

/** Live order: position, driver, gap or interval, tyre, stops. */
export function TimingTower({ race, teams, playerTeamId }: { race: RaceState; teams: Record<string, Team>; playerTeamId: string }) {
  const [mode, setMode] = useState<'gap' | 'interval'>('interval');
  const ord = order(race.cars);
  const leader = ord[0];
  return (
    <div className="tower">
      <div className="tower-head">
        <span><Tip k="lap">Lap</Tip> <b>{Math.min(race.lap + (race.finished ? 0 : 1), race.totalLaps)}</b>/{race.totalLaps}</span>
        <div className="seg seg-sm">
          <button className={mode === 'interval' ? 'on' : ''} onClick={() => setMode('interval')}><Tip k="interval" plain>Int</Tip></button>
          <button className={mode === 'gap' ? 'on' : ''} onClick={() => setMode('gap')}><Tip k="gap" plain>Gap</Tip></button>
        </div>
      </div>
      <ol className="tower-list">
        {ord.map((c, i) => {
          const team = teams[c.c.teamId];
          const prev = ord[i - 1];
          const gap = i === 0 ? 0 : mode === 'gap' ? c.totalTime - leader.totalTime : c.totalTime - prev.totalTime;
          const fastest = race.fastestLap?.driverId === c.c.driverId;
          return (
            <li key={c.c.driverId} className={'tower-row' + (c.c.teamId === playerTeamId ? ' me' : '') + (c.dnf ? ' out' : '')}>
              <span className="tw-pos">{c.dnf ? '-' : i + 1}</span>
              <i className="tw-bar" style={{ background: team.colors.primary }} />
              <span className="tw-name">{c.c.name.slice(0, 3).toUpperCase()}<span className="tw-full">{c.c.name}</span></span>
              <span className={'tw-gap' + (fastest ? ' fastest' : '')}>
                {c.dnf ? <Tip k="dnf" plain>OUT</Tip> : race.lap === 0 ? '' : i === 0 ? 'Leader' : `+${gap.toFixed(gap >= 100 ? 1 : 3)}`}
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
