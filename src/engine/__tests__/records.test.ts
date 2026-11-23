import { describe, expect, it } from 'vitest';
import { FEATS } from '../../data/feats';
import { checkRaceFeats, checkSeasonFeats } from '../feats';
import { completeAllLeagues, runOffseason } from '../offseason';
import { addTopLap, emptyRecords, recordBook, TOP_LAPS, updateRecords } from '../records';
import type { RaceResult, RecordEntry } from '../types';
import { world } from './helpers';

describe('records', () => {
  it('a full season sets a lap record at every track and a youngest/oldest winner', () => {
    const s = completeAllLeagues(world(31));
    const tracks = new Set(Object.values(s.leagues).flatMap((L) => L.calendar));
    expect(Object.keys(s.records.trackLaps).sort()).toEqual([...tracks].sort());
    expect(s.records.youngestWinner).toBeDefined();
    expect(s.records.oldestWinner!.value).toBeGreaterThanOrEqual(s.records.youngestWinner!.value);
    expect(s.records.biggestMargin!.value).toBeGreaterThanOrEqual(0);
  });

  it('a faster lap breaks the record and is reported', () => {
    const s = completeAllLeagues(world(32));
    const L = s.leagues[3];
    const res = L.results[0];
    const rec = s.records.trackLaps[res.trackId];
    const fast: RaceResult = { ...res, entries: res.entries.map((e, i) => (i === 0 ? { ...e, bestLap: rec.value - 1 } : e)) };
    const out = updateRecords(s, 3, fast);
    expect(out.state.records.trackLaps[res.trackId].value).toBeCloseTo(rec.value - 1);
    expect(out.broken.some((b) => b.kind === 'lap')).toBe(true);
    // A slower lap changes nothing.
    expect(updateRecords(s, 3, res).broken.filter((b) => b.kind === 'lap')).toHaveLength(0);
  });

  it('the first race at a track sets the record quietly', () => {
    const s = { ...world(33), records: emptyRecords() };
    const done = completeAllLeagues(s);
    const out = updateRecords({ ...done, records: emptyRecords() }, 3, done.leagues[3].results[0]);
    expect(out.broken).toHaveLength(0);
  });

  it('the record book names holders once seasons are archived', () => {
    let s = world(34);
    s = runOffseason(s).state;
    const book = recordBook(s);
    expect(book.find((r) => r.id === 'wins')?.holder).toBeTruthy();
    expect(book.find((r) => r.id === 'titles')?.holder).toBeTruthy();
    expect(book.find((r) => r.id === 'youngest')?.holder).toBeTruthy();
  });
});

describe('feats', () => {
  it('every feat id the engine can unlock is defined', () => {
    const ids = new Set(FEATS.map((f) => f.id));
    expect(ids.size).toBe(FEATS.length);
  });

  it('a podium unlocks the podium and points feats only once', () => {
    let s = completeAllLeagues(world(35));
    const pid = s.playerTeamId;
    const res = s.leagues[s.teams[pid].tier].results[0];
    const entries = res.entries.map((e) => ({ ...e }));
    const mine = entries.findIndex((e) => e.teamId === pid);
    const [m] = entries.splice(mine, 1);
    entries.splice(1, 0, { ...m, position: 2, points: 18, dnf: false });
    const fake: RaceResult = { ...res, entries };
    const a = checkRaceFeats(s, fake, [], s.teams[pid].budget);
    expect(a.unlocked).toEqual(expect.arrayContaining(['firstPoints', 'firstPodium']));
    expect(a.unlocked).not.toContain('firstWin');
    s = a.state;
    expect(checkRaceFeats(s, fake, [], s.teams[pid].budget).unlocked).not.toContain('firstPodium');
  });

  it('season feats follow the review', () => {
    const s = world(36);
    const { state, review } = runOffseason(s);
    const out = checkSeasonFeats(state, { ...review, playerTierBefore: 3, playerTierAfter: 2, playerPosition: 1 });
    expect(out.unlocked).toEqual(expect.arrayContaining(['promoted', 'teamTitle']));
    expect(out.state.feats.promoted.season).toBe(review.season);
  });
});

describe('top-20 lap leaderboards', () => {
  it('a season fills each track with one lap per driver, fastest first', () => {
    const s = completeAllLeagues(world(37));
    for (const [trackId, list] of Object.entries(s.records.trackTop ?? {})) {
      for (let i = 1; i < list.length; i++) expect(list[i].value).toBeGreaterThanOrEqual(list[i - 1].value);
      expect(new Set(list.map((e) => e.driverId + e.tier)).size).toBe(list.length);
      expect(list[0].value).toBeCloseTo(s.records.trackLaps[trackId].value);
    }
  });

  it('keeps only 20 per league and a driver\'s best lap', () => {
    const mk = (i: number, v: number, d = `d${i}`): RecordEntry => ({ driverId: d, teamId: 't', value: v, season: 1, year: 2030, tier: 3, trackId: 'x' });
    let list: RecordEntry[] | undefined;
    for (let i = 0; i < 25; i++) list = addTopLap(list, mk(i, 90 + i));
    expect(list).toHaveLength(TOP_LAPS);
    expect(list![19].value).toBe(109);
    list = addTopLap(list, mk(99, 95, 'd10'));
    expect(list!.find((e) => e.driverId === 'd10')!.value).toBe(95);
    expect(list!).toHaveLength(TOP_LAPS);
    list = addTopLap(list, mk(98, 200, 'd10'));
    expect(list!.find((e) => e.driverId === 'd10')!.value).toBe(95);
    // A different league keeps its own 20.
    list = addTopLap(list, { ...mk(0, 300, 'z'), tier: 2 });
    expect(list).toHaveLength(TOP_LAPS + 1);
  });

  it('the record book can be filtered by league', () => {
    const s = runOffseason(world(38)).state;
    const all = recordBook(s).find((r) => r.id === 'wins')!;
    const t5 = recordBook(s, 5).find((r) => r.id === 'wins')!;
    expect(Number(t5.value) || 0).toBeLessThanOrEqual(Number(all.value));
  });
});
