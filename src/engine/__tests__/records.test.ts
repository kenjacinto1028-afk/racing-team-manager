import { describe, expect, it } from 'vitest';
import { FEATS } from '../../data/feats';
import { checkRaceFeats, checkSeasonFeats } from '../feats';
import { completeAllLeagues, runOffseason } from '../offseason';
import { emptyRecords, recordBook, updateRecords } from '../records';
import type { RaceResult } from '../types';
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
