import { useEffect, useState, type ReactNode } from 'react';
import { LEAGUES } from '../data/leagues';
import { seasonOver, useGame } from '../store/gameStore';
import { ConfirmButton } from './components/bits';
import { Tip } from './components/Tip';
import { Tutorial } from './components/Tutorial';
import { TOUR_KEY } from '../data/tutorial';
import { money } from './format';
import { NavProvider, SCREENS, useNav, type ScreenId } from './nav';
import { Car } from './screens/Car';
import { Dashboard } from './screens/Dashboard';
import { Drivers } from './screens/Drivers';
import { Development } from './screens/Development';
import { Finance } from './screens/Finance';
import { History } from './screens/History';
import { Profile } from './screens/Profile';
import { Glossary } from './screens/Glossary';
import { NewGame } from './screens/NewGame';
import { RaceWeekend } from './screens/RaceWeekend';
import { SeasonReview } from './screens/SeasonReview';
import { Staff } from './screens/Staff';
import { Standings } from './screens/Standings';

function screenFor(id: ScreenId): ReactNode {
  switch (id) {
    case 'hq': return <Dashboard />;
    case 'drivers': return <Drivers />;
    case 'staff': return <Staff />;
    case 'dev': return <Development />;
    case 'car': return <Car />;
    case 'finance': return <Finance />;
    case 'standings': return <Standings />;
    case 'race': return <RaceWeekend />;
    case 'review': return <SeasonReview />;
    case 'history': return <History />;
    case 'profile': return <Profile />;
    case 'glossary': return <Glossary />;
  }
}

function Shell() {
  const { current, go, back, forward, canBack, canForward, profile } = useNav();
  const game = useGame((s) => s.game)!;
  const live = useGame((s) => !!s.race);
  const reset = useGame((s) => s.resetGame);
  const [tour, setTour] = useState(() => {
    try { return !localStorage.getItem(TOUR_KEY); } catch { return false; }
  });
  const closeTour = () => {
    setTour(false);
    try { localStorage.setItem(TOUR_KEY, '1'); } catch { /* ignore */ }
  };
  const screen = SCREENS.find((s) => s.id === current)!;
  const team = game.teams[game.playerTeamId];
  const over = seasonOver(game);

  // Alt+← / Alt+→ move back and forward, like a browser.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); back(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); forward(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [back, forward]);

  // Team colours drive the accent across the whole app.
  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty('--accent', team.colors.primary);
    root.setProperty('--team-secondary', team.colors.secondary);
    root.setProperty('--accent-soft', `color-mix(in srgb, ${team.colors.primary} 16%, transparent)`);
  }, [team.colors.primary, team.colors.secondary]);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">Racing<span>Team</span></div>
          <div className="brand-sub">Manager</div>
        </div>
        <div className="sidebar-team">
          <i className="team-swatch lg" style={{ background: `linear-gradient(135deg, ${team.colors.primary} 60%, ${team.colors.secondary} 60%)` }} />
          <div>
            <div className="sidebar-team-name">{team.name}</div>
            <div className="muted small">{LEAGUES[team.tier].name}</div>
          </div>
        </div>
        <nav className="nav" aria-label="Main">
          {SCREENS.filter((s) => !s.hidden || (s.id === 'review' && over)).map((s) => (
            <button
              key={s.id}
              data-tour={`nav-${s.id}`}
              title={s.blurb}
              className={'nav-item' + (s.id === current ? ' active' : '')}
              onClick={() => go(s.id)}
              aria-current={s.id === current ? 'page' : undefined}
            >
              <span className="nav-icon">{s.icon}</span>
              {s.label}
              {s.id === 'race' && live && <span className="live-dot" title="Race in progress" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div>Season {game.season} · {game.year}</div>
          <button className="btn btn-ghost btn-sm" onClick={() => setTour(true)}>Replay tutorial</button>
          <ConfirmButton className="btn btn-ghost btn-sm" confirmText="Erase save?" onConfirm={reset}>New game</ConfirmButton>
        </div>
      </aside>

      <div className="main">
        <header className="topbar" data-tour="topbar">
          <button className="nav-btn" onClick={back} disabled={!canBack} aria-label="Back" title="Back (Alt+←)">‹</button>
          <button className="nav-btn" onClick={forward} disabled={!canForward} aria-label="Forward" title="Forward (Alt+→)">›</button>
          <span className="crumb">{screen.label}{current === 'profile' && profile ? ` · ${profile.kind === 'driver' ? (game.drivers[profile.id] ? `${game.drivers[profile.id].firstName} ${game.drivers[profile.id].lastName}` : '') : profile.kind === 'staff' ? game.staff[profile.id]?.name ?? '' : game.teams[profile.id]?.name ?? ''}` : ''}</span>
          <span className="topbar-spacer" />
          <span className="pill"><Tip k="morale" plain>Morale</Tip> <b className={team.morale < 50 ? 'bad' : team.morale >= 80 ? 'good' : ''}>{team.morale}</b></span>
          <span className="pill"><Tip k="budget" plain>Budget</Tip> <b className={team.budget < 0 ? 'bad' : ''}>{money(team.budget)}</b></span>
        </header>
        <main className="content" key={current + (profile ? profile.kind + profile.id : "")}>{screenFor(current)}</main>
      </div>

      {tour && <Tutorial onClose={closeTour} />}

      {game.finance.bankrupt && (
        <div className="overlay">
          <div className="modal">
            <span className="tag">Game over</span>
            <h1><Tip k="bankruptcy">Bankrupt</Tip></h1>
            <p>{team.name} spent two races in a row below zero and the owners have shut the team down.</p>
            <button className="btn btn-primary btn-lg" onClick={reset}>Start a new career</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function App() {
  const hasGame = useGame((s) => !!s.game);
  if (!hasGame) return <NewGame />;
  return (
    <NavProvider>
      <Shell />
    </NavProvider>
  );
}
