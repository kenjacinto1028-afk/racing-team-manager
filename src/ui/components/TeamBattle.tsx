import { useRef } from 'react';
import type { RaceState } from '../../engine/raceSim';
import { teamBattle, textOn } from '../../engine/raceView';
import type { Team } from '../../engine/types';
import type { RaceLook } from '../raceLook';
import { Tip } from './Tip';

const ROW_H = 34;

/**
 * Live team ranking: points each team would score if the race ended now.
 * Rows slide to their new place each lap; arrows show the change since the previous lap.
 */
export function TeamBattle({ race, teams, playerTeamId, look }: { race: RaceState; teams: Record<string, Team>; playerTeamId: string; look: RaceLook }) {
  const rows = teamBattle(race);
  const rank: Record<string, number> = {};
  rows.forEach((r, i) => { rank[r.teamId] = i; });

  // Remember the ranking at the start of each lap so arrows show the latest change.
  const hist = useRef<{ lap: number; prev: Record<string, number>; cur: Record<string, number> }>({ lap: race.lap, prev: rank, cur: rank });
  if (hist.current.lap !== race.lap) hist.current = { lap: race.lap, prev: hist.current.cur, cur: rank };
  else hist.current.cur = rank;
  const prev = hist.current.prev;

  return (
    <div className="tb">
      <div className="tb-head">
        <h3><Tip k="teamBattle">Team battle</Tip></h3>
        {!race.finished && <span className="tb-live">LIVE</span>}
      </div>
      <div className="tb-sub">Points if the race ended now</div>
      <ol className="tb-list" style={{ height: rows.length * ROW_H }}>
        {/* Keyed by team and positioned by rank, so rows glide when the order changes. */}
        {[...rows].sort((a, b) => a.teamId.localeCompare(b.teamId)).map((r) => {
          const i = rank[r.teamId];
          const moved = race.lap > 0 ? (prev[r.teamId] ?? i) - i : 0;
          const color = look.colors[r.teamId] ?? teams[r.teamId]?.colors.primary ?? '#888';
          const me = r.teamId === playerTeamId;
          return (
            <li key={r.teamId} className={'tb-row' + (me ? ' me' : '') + (moved > 0 ? ' up' : moved < 0 ? ' down' : '')} style={{ transform: `translateY(${i * ROW_H}px)` }}>
              <span className="tb-rank">{i + 1}</span>
              <span className={'tb-move' + (moved > 0 ? ' up' : moved < 0 ? ' down' : '')}>{moved > 0 ? `▲${moved}` : moved < 0 ? `▼${-moved}` : '–'}</span>
              <i className="tb-bar" style={{ background: color }} />
              <span className="tb-name" title={r.cars.map((c) => `#${look.numbers[c.driverId] ?? ''} ${c.dnf ? 'out' : c.pitted ? 'in pit' : `P${c.pos}`}`).join(' · ')}>
                {teams[r.teamId]?.name ?? r.teamId}
              </span>
              <span className="tb-cars">
                {r.cars.map((c) => (
                  <span key={c.driverId} className={c.dnf ? 'out' : ''} style={{ background: color, color: textOn(color) }}>{look.numbers[c.driverId] ?? ''}</span>
                ))}
              </span>
              <span className="tb-pts">{r.points}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
