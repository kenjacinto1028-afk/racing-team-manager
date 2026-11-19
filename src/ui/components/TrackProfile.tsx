import type { Track } from '../../engine/types';
import { StatBar } from './StatBar';

export function TrackProfile({ track }: { track: Track }) {
  const p = track.profile;
  return (
    <div className="track-profile">
      <StatBar label="Power" k="trackPower" value={p.power * 100} color="var(--info)" />
      <StatBar label="Downforce" k="trackDownforce" value={p.downforce * 100} color="var(--info)" />
      <StatBar label="Tyre wear" k="trackTyreWear" value={p.tyreWear * 100} color="var(--warn)" />
      <StatBar label="Overtaking difficulty" k="trackOvertaking" value={p.overtaking * 100} color="var(--bad)" />
    </div>
  );
}
