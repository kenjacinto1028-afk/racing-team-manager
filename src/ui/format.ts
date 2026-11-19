export function money(n: number, opts: { sign?: boolean } = {}): string {
  const sign = n < 0 ? '-' : opts.sign && n > 0 ? '+' : '';
  const a = Math.abs(n);
  let s: string;
  if (a >= 1e6) s = `$${(a / 1e6).toFixed(a >= 1e7 ? 1 : 2)}M`;
  else if (a >= 1e3) s = `$${Math.round(a / 1e3)}k`;
  else s = `$${Math.round(a)}`;
  return sign + s;
}

export function lapTime(t: number): string {
  if (!t) return '-';
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s.toFixed(3).padStart(6, '0')}`;
}

export function gapStr(t: number): string {
  return `+${t.toFixed(t >= 100 ? 1 : 3)}`;
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export const ROLE_LABEL: Record<string, string> = {
  raceEngineer: 'Race Engineer', chiefMechanic: 'Chief Mechanic', pitCrewChief: 'Pit Crew Chief', technicalDirector: 'Technical Director',
};

export const FLAG: Record<string, string> = {
  GB: '🇬🇧', IT: '🇮🇹', FR: '🇫🇷', DE: '🇩🇪', ES: '🇪🇸', NL: '🇳🇱', BR: '🇧🇷', JP: '🇯🇵', AU: '🇦🇺', US: '🇺🇸', MX: '🇲🇽', FI: '🇫🇮', PH: '🇵🇭', CA: '🇨🇦',
};

/** Colour for a 0-100 rating: red → amber → green. */
export function ratingColor(v: number): string {
  if (v >= 75) return 'var(--good)';
  if (v >= 55) return 'var(--info)';
  if (v >= 40) return 'var(--warn)';
  return 'var(--bad)';
}
