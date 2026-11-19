import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

export type ScreenId =
  | 'hq' | 'drivers' | 'staff' | 'car' | 'standings' | 'race' | 'review' | 'glossary';

export const SCREENS: { id: ScreenId; label: string; icon: string; blurb: string; hidden?: boolean }[] = [
  { id: 'hq', label: 'HQ Dashboard', icon: '⌂', blurb: 'Your team at a glance: next race, budget and alerts.' },
  { id: 'drivers', label: 'Drivers', icon: '◉', blurb: 'Your two drivers, their stats and contracts, plus the transfer market.' },
  { id: 'staff', label: 'Staff', icon: '✦', blurb: 'Engineers and mechanics who make the car faster and more reliable.' },
  { id: 'car', label: 'Car / R&D', icon: '⚙', blurb: 'Spend money on research to improve engine, aero, chassis and reliability.' },
  { id: 'standings', label: 'Standings', icon: '☰', blurb: 'The race calendar and the championship tables.' },
  { id: 'race', label: 'Race Weekend', icon: '⚑', blurb: 'Qualifying, then the live race with timing tower and track map.' },
  { id: 'review', label: 'Season Review', icon: '★', blurb: 'Final tables, promotion and relegation, and contracts.', hidden: true },
  { id: 'glossary', label: 'Glossary', icon: '?', blurb: 'Every racing term explained in plain English.' },
];

interface NavState {
  current: ScreenId;
  go: (id: ScreenId) => void;
  back: () => void;
  forward: () => void;
  canBack: boolean;
  canForward: boolean;
}

const NavContext = createContext<NavState | null>(null);

// Simple in-app history: a list of visited screens and a pointer into it.
export function NavProvider({ children }: { children: ReactNode }) {
  const [hist, setHist] = useState<{ stack: ScreenId[]; i: number }>({ stack: ['hq'], i: 0 });

  const go = useCallback((id: ScreenId) => {
    setHist((h) =>
      h.stack[h.i] === id ? h : { stack: [...h.stack.slice(0, h.i + 1), id], i: h.i + 1 },
    );
  }, []);
  const back = useCallback(() => setHist((h) => (h.i > 0 ? { ...h, i: h.i - 1 } : h)), []);
  const forward = useCallback(
    () => setHist((h) => (h.i < h.stack.length - 1 ? { ...h, i: h.i + 1 } : h)),
    [],
  );

  const value: NavState = {
    current: hist.stack[hist.i],
    go, back, forward,
    canBack: hist.i > 0,
    canForward: hist.i < hist.stack.length - 1,
  };
  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNav(): NavState {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error('useNav must be used inside NavProvider');
  return ctx;
}
