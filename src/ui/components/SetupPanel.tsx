import { conceptDelta, idealSetup, setupDelta } from '../../engine/car';
import type { SuspensionSetting, Track, WingLevel } from '../../engine/types';
import { useGame } from '../../store/gameStore';
import { usePlayer } from '../hooks';
import { CONCEPT_LABEL } from '../format';
import { Tip } from './Tip';

const WINGS: WingLevel[] = ['low', 'medium', 'high'];
const SUSP: SuspensionSetting[] = ['soft', 'medium', 'stiff'];

const secs = (v: number) => (Math.abs(v) < 0.005 ? '±0.00s' : `${v < 0 ? '-' : '+'}${Math.abs(v).toFixed(2)}s`);

/** Pre-race car setup: wing level and suspension. A good race engineer tells you what the track wants. */
export function SetupPanel({ track }: { track: Track }) {
  const { g, team } = usePlayer();
  const setSetup = useGame((s) => s.setSetup);
  const setup = g.setup;
  const engId = team.staffIds.raceEngineer;
  const engineer = engId ? g.staff[engId]?.rating ?? 0 : 0;
  const ideal = idealSetup(track);
  const knows = engineer >= 50;
  const delta = setupDelta(setup, track);
  const concept = conceptDelta(team.concept, track);

  return (
    <section className="card">
      <h3><Tip k="setup">Car setup</Tip></h3>
      <div className="setup-row">
        <span className="small"><Tip k="wingLevel">Wing level</Tip></span>
        <div className="seg seg-sm">
          {WINGS.map((w) => <button key={w} className={setup.wing === w ? 'on' : ''} onClick={() => setSetup({ ...setup, wing: w })}>{w}</button>)}
        </div>
      </div>
      <div className="setup-row">
        <span className="small"><Tip k="suspensionSetting">Suspension</Tip></span>
        <div className="seg seg-sm">
          {SUSP.map((s) => <button key={s} className={setup.suspension === s ? 'on' : ''} onClick={() => setSetup({ ...setup, suspension: s })}>{s}</button>)}
        </div>
      </div>
      <p className="muted small" style={{ margin: '8px 0 0' }}>
        {knows
          ? <>Your <Tip k="raceEngineer">race engineer</Tip> suggests <b>{ideal.wing}</b> wings and <b>{ideal.suspension}</b> suspension here.</>
          : <>Your race engineer (rating {engineer}) isn't sure what this track wants. Hint: twisty tracks like more wing; tyre-hungry tracks like softer suspension.</>}
      </p>
      <div className="contract-row small">
        <span>Setup <b className={delta < 0 ? 'good' : delta > 0 ? 'bad' : ''}>{knows ? secs(delta) : '?'}</b> per lap</span>
        <span><Tip k="carConcept">{CONCEPT_LABEL[team.concept]}</Tip> <b className={concept < 0 ? 'good' : concept > 0 ? 'bad' : ''}>{secs(concept)}</b> per lap</span>
      </div>
    </section>
  );
}
