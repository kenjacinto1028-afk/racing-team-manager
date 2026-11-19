// All-time records: track lap records, youngest/oldest winner, biggest winning margin, plus career record book.
import { LEAGUES } from '../data/leagues';
import { liveArchive } from './careers';
import type { GameState, RaceRecords, RaceResult, RecordEntry, TierId } from './types';

export interface RecordBreak { kind: 'lap' | 'youngest' | 'oldest' | 'margin'; label: string; detail: string; trackId: string; driverId: string; teamId: string }

export const emptyRecords = (): RaceRecords => ({ trackLaps: {} });

/** Check a finished race against the all-time records. Returns the updated state and what fell. */
export function updateRecords(state: GameState, tier: TierId, result: RaceResult): { state: GameState; broken: RecordBreak[] } {
  const records: RaceRecords = { ...(state.records ?? emptyRecords()), trackLaps: { ...(state.records?.trackLaps ?? {}) } };
  const broken: RecordBreak[] = [];
  const base = { season: state.season, year: state.year, tier, trackId: result.trackId };

  const fastest = result.entries.filter((e) => e.bestLap > 0).sort((a, b) => a.bestLap - b.bestLap)[0];
  if (fastest) {
    const cur = records.trackLaps[result.trackId];
    if (!cur || fastest.bestLap < cur.value) {
      records.trackLaps[result.trackId] = { ...base, driverId: fastest.driverId, teamId: fastest.teamId, value: fastest.bestLap };
      if (cur) broken.push({ kind: 'lap', label: 'New lap record', detail: `${fastest.bestLap.toFixed(3)}s`, trackId: result.trackId, driverId: fastest.driverId, teamId: fastest.teamId });
    }
  }

  const finishers = result.entries.filter((e) => !e.dnf);
  const win = finishers[0];
  if (win) {
    const age = state.drivers[win.driverId]?.age ?? 0;
    const entry = (value: number): RecordEntry => ({ ...base, driverId: win.driverId, teamId: win.teamId, value });
    if (!records.youngestWinner || age < records.youngestWinner.value) {
      if (records.youngestWinner) broken.push({ kind: 'youngest', label: 'Youngest winner ever', detail: `age ${age}`, trackId: result.trackId, driverId: win.driverId, teamId: win.teamId });
      records.youngestWinner = entry(age);
    }
    if (!records.oldestWinner || age > records.oldestWinner.value) {
      if (records.oldestWinner) broken.push({ kind: 'oldest', label: 'Oldest winner ever', detail: `age ${age}`, trackId: result.trackId, driverId: win.driverId, teamId: win.teamId });
      records.oldestWinner = entry(age);
    }
    const second = finishers[1];
    if (second && second.laps === win.laps) {
      const margin = Math.round((second.totalTime - win.totalTime) * 1000) / 1000;
      if (!records.biggestMargin || margin > records.biggestMargin.value) {
        if (records.biggestMargin) broken.push({ kind: 'margin', label: 'Biggest winning margin ever', detail: `by ${margin.toFixed(1)}s`, trackId: result.trackId, driverId: win.driverId, teamId: win.teamId });
        records.biggestMargin = entry(margin);
      }
    }
  }
  return { state: { ...state, records }, broken };
}

export interface BookRow { id: string; title: string; holder: string | null; holderKind: 'driver' | 'team'; value: string; detail: string }

/** Career records across every league and season (archive + live season). */
export function recordBook(state: GameState): BookRow[] {
  const archives = [...state.history];
  if (!archives.some((h) => h.season === state.season) && Object.values(state.leagues).some((L) => L.results.length)) archives.push(liveArchive(state));
  const sum = new Map<string, { wins: number; podiums: number; points: number; races: number }>();
  const titles = new Map<string, number>();
  const teamTitles = new Map<string, number>();
  let bestSeason: { id: string; points: number; season: number; tier: TierId } | null = null;
  for (const h of archives) {
    for (const l of h.drivers) {
      const s = sum.get(l.driverId) ?? { wins: 0, podiums: 0, points: 0, races: 0 };
      s.wins += l.wins; s.podiums += l.podiums; s.points += l.points; s.races += l.races;
      sum.set(l.driverId, s);
      if (h.season !== state.season || state.history.some((x) => x.season === h.season)) {
        if (!bestSeason || l.points > bestSeason.points) bestSeason = { id: l.driverId, points: l.points, season: h.season, tier: l.tier };
      }
    }
    if (state.history.includes(h)) {
      for (const c of Object.values(h.champions)) if (c) titles.set(c, (titles.get(c) ?? 0) + 1);
      for (const t of Object.values(h.tables)) if (t[0]) teamTitles.set(t[0].teamId, (teamTitles.get(t[0].teamId) ?? 0) + 1);
    }
  }
  const top = <T,>(m: Map<string, T>, f: (v: T) => number) => [...m.entries()].sort((a, b) => f(b[1]) - f(a[1]) || (a[0] < b[0] ? -1 : 1))[0];
  const rows: BookRow[] = [];
  const add = (id: string, title: string, e: [string, number] | undefined, unit: string, kind: 'driver' | 'team' = 'driver') =>
    rows.push({ id, title, holder: e && e[1] > 0 ? e[0] : null, holderKind: kind, value: e && e[1] > 0 ? `${e[1]}` : '-', detail: unit });
  const w = top(sum, (v) => v.wins); add('wins', 'Most race wins', w && [w[0], w[1].wins], 'wins');
  const p = top(sum, (v) => v.podiums); add('podiums', 'Most podiums', p && [p[0], p[1].podiums], 'podiums');
  const pts = top(sum, (v) => v.points); add('points', 'Most career points', pts && [pts[0], pts[1].points], 'points');
  const st = top(sum, (v) => v.races); add('starts', 'Most race starts', st && [st[0], st[1].races], 'races');
  add('titles', "Most drivers' titles", top(titles, (v) => v), 'titles');
  add('teamTitles', "Most teams' titles", top(teamTitles, (v) => v), 'titles', 'team');
  const bs = bestSeason as { id: string; points: number; season: number; tier: TierId } | null;
  rows.push({ id: 'season', title: 'Most points in a season', holder: bs?.id ?? null, holderKind: 'driver', value: bs ? `${bs.points}` : '-', detail: bs ? `Season ${bs.season}, ${LEAGUES[bs.tier]?.short ?? ''}` : '' });
  const r = state.records ?? emptyRecords();
  const one = (id: string, title: string, e: RecordEntry | undefined, fmt: (v: number) => string) =>
    rows.push({ id, title, holder: e?.driverId ?? null, holderKind: 'driver', value: e ? fmt(e.value) : '-', detail: e ? `Season ${e.season}, ${LEAGUES[e.tier]?.short ?? ''}` : '' });
  one('youngest', 'Youngest race winner', r.youngestWinner, (v) => `${v} yrs`);
  one('oldest', 'Oldest race winner', r.oldestWinner, (v) => `${v} yrs`);
  one('margin', 'Biggest winning margin', r.biggestMargin, (v) => `${v.toFixed(1)}s`);
  return rows;
}
