import { useMemo, useState } from 'react';
import { LEAGUES } from '../../data/leagues';
import { driverOverall, generateWorld } from '../../engine/generate';
import { useGame } from '../../store/gameStore';
import { FLAG, money } from '../format';
import { Rating, StatBar } from '../components/StatBar';
import { Tip } from '../components/Tip';

const PALETTE = ['#e10600', '#ff8000', '#ffd400', '#2ecc71', '#00a19c', '#1e90ff', '#3a2bd6', '#8e44ad', '#ff6fa8', '#c0c6cf', '#ffffff', '#111111'];

function shortFrom(name: string): string {
  const letters = name.replace(/[^A-Za-z ]/g, '').trim().split(/\s+/);
  const s = letters.length > 1 ? letters.map((w) => w[0]).join('') + letters[0].slice(1, 3) : letters[0] ?? '';
  return s.slice(0, 3).toUpperCase().padEnd(3, 'X');
}

export function NewGame() {
  const newGame = useGame((s) => s.newGame);
  const [seed] = useState(() => Date.now() % 2147483647);
  const [name, setName] = useState('Phoenix Racing');
  const [primary, setPrimary] = useState('#e10600');
  const [secondary, setSecondary] = useState('#ffffff');
  const [pick, setPick] = useState<string | null>(null);

  // Preview the world for this seed so we can offer real candidates.
  const preview = useMemo(() => generateWorld(seed, { name: 'x', short: 'X', primary: '#000', secondary: '#fff' }), [seed]);
  const candidates = useMemo(
    () => preview.driverMarket.map((id) => preview.drivers[id])
      .filter((d) => driverOverall(d) <= LEAGUES[3].driverRange[1])
      .sort((a, b) => driverOverall(b) - driverOverall(a)).slice(0, 3),
    [preview],
  );
  const current = preview.teams[preview.playerTeamId].driverIds.map((id) => preview.drivers[id]);

  const valid = name.trim().length >= 3;
  const start = () => valid && newGame({ name: name.trim(), short: shortFrom(name), primary, secondary }, { seed, pickDriverId: pick ?? undefined });

  return (
    <div className="newgame" style={{ ['--accent' as string]: primary }}>
      <div className="newgame-inner">
        <div className="newgame-hero">
          <span className="tag">New career</span>
          <h1>Build your team</h1>
          <p>You are the <Tip k="teamPrincipal">team principal</Tip>. Start in <Tip k="tiers">Formula Academy</Tip> with {money(LEAGUES[3].startBudget)}, finish in the top 2 to be <Tip k="promotion">promoted</Tip>, and climb to Formula Prime.</p>
        </div>

        <div className="grid grid-2">
          <section className="card">
            <h3>1 · Team identity</h3>
            <label className="field">
              <span>Team name</span>
              <input value={name} maxLength={28} onChange={(e) => setName(e.target.value)} placeholder="e.g. Phoenix Racing" />
            </label>
            <div className="field">
              <span>Primary colour</span>
              <div className="swatches">
                {PALETTE.map((c) => <button key={c} aria-label={c} className={'swatch' + (c === primary ? ' on' : '')} style={{ background: c }} onClick={() => setPrimary(c)} />)}
                <input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} aria-label="Custom primary colour" />
              </div>
            </div>
            <div className="field">
              <span>Secondary colour</span>
              <div className="swatches">
                {PALETTE.map((c) => <button key={c} aria-label={c} className={'swatch' + (c === secondary ? ' on' : '')} style={{ background: c }} onClick={() => setSecondary(c)} />)}
                <input type="color" value={secondary} onChange={(e) => setSecondary(e.target.value)} aria-label="Custom secondary colour" />
              </div>
            </div>
            <div className="livery" style={{ background: `linear-gradient(120deg, ${primary} 0 58%, ${secondary} 58% 66%, ${primary} 66%)` }}>
              <span>{shortFrom(name)}</span>
            </div>
          </section>

          <section className="card">
            <h3>2 · Sign a lead driver (optional)</h3>
            <p className="muted small">Your team comes with {current.map((d) => d.lastName).join(' and ')}. Pick one prospect to replace the slower of the two at no cost, or keep both.</p>
            <div className="pick-list">
              {candidates.map((d) => (
                <button key={d.id} className={'pick' + (pick === d.id ? ' on' : '')} onClick={() => setPick(pick === d.id ? null : d.id)}>
                  <div className="pick-head">
                    <span>{FLAG[d.nationality]} <b>{d.firstName} {d.lastName}</b> <span className="muted">· {d.age}</span></span>
                    <Rating v={driverOverall(d)} k="overall" />
                  </div>
                  <StatBar label="Pace" k="pace" value={d.pace} />
                  <StatBar label="Potential" k="potential" value={d.potential} />
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="newgame-foot">
          <button className="btn btn-primary btn-lg" disabled={!valid} onClick={start}>Start career ›</button>
        </div>
      </div>
    </div>
  );
}
