import { describe, expect, it } from 'vitest';
import { TIERS } from '../../data/leagues';
import { completeAllLeagues, renewContract, runOffseason, syncOtherLeagues } from '../offseason';
import { autoRaceNext } from '../raceSetup';
import { isLeagueComplete } from '../season';
import { world } from './helpers';

describe('offseason', () => {
  it('keeps other leagues in step with the player', () => {
    let s = world();
    for (let i = 0; i < 4; i++) s = syncOtherLeagues(autoRaceNext(s, 3));
    expect(s.leagues[3].results).toHaveLength(4);
    expect(s.leagues[2].results).toHaveLength(5);
    expect(s.leagues[1].results).toHaveLength(6);
  });

  it('runs a full season into the next one', () => {
    const s0 = completeAllLeagues(world(3));
    TIERS.forEach((t) => expect(isLeagueComplete(s0.leagues[t])).toBe(true));
    const { state: s1, review } = runOffseason(s0);
    expect(s1.season).toBe(2);
    expect(review.promoted).toHaveLength(4);
    expect(review.relegated).toHaveLength(4);
    for (const t of TIERS) {
      expect(s1.leagues[t].results).toHaveLength(0);
      expect(s1.leagues[t].teamIds).toHaveLength(10);
      for (const id of s1.leagues[t].teamIds) {
        const team = s1.teams[id];
        expect(team.tier).toBe(t);
        if (!team.isPlayer) {
          expect(team.driverIds).toHaveLength(2);
          expect(Object.keys(team.staffIds)).toHaveLength(4);
        }
        team.driverIds.forEach((d) => {
          expect(s1.drivers[d].teamId).toBe(id);
          expect(s1.drivers[d].retired).toBeFalsy();
          expect(s1.drivers[d].contract!.yearsLeft).toBeGreaterThan(0);
        });
      }
    }
    expect(s1.teams[s1.playerTeamId].tier).toBe(review.playerTierAfter);
    s1.driverMarket.forEach((id) => expect(s1.drivers[id].teamId).toBeNull());
  });

  it('is deterministic', () => {
    const a = runOffseason(completeAllLeagues(world(5))).state;
    const b = runOffseason(completeAllLeagues(world(5))).state;
    expect(a).toEqual(b);
  });

  it('player drivers with expiring contracts leave unless renewed', () => {
    let s = completeAllLeagues(world(4));
    const pid = s.playerTeamId;
    const [d1, d2] = s.teams[pid].driverIds;
    s = { ...s, drivers: { ...s.drivers, [d1]: { ...s.drivers[d1], contract: { salary: 1, yearsLeft: 1 } }, [d2]: { ...s.drivers[d2], contract: { salary: 1, yearsLeft: 1 } } } };
    s = renewContract(s, 'driver', d1, 2);
    const next = runOffseason(s).state;
    expect(next.teams[pid].driverIds).toContain(d1);
    expect(next.teams[pid].driverIds).not.toContain(d2);
    expect(next.drivers[d1].contract!.yearsLeft).toBe(2);
  });

  it('survives several seasons in a row', () => {
    let s = world(9);
    for (let i = 0; i < 4; i++) s = runOffseason(completeAllLeagues(s)).state;
    expect(s.season).toBe(5);
    const ids = Object.keys(s.drivers);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
