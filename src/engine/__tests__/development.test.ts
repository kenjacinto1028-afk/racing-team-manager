import { describe, expect, it } from 'vitest';
import { LEAGUES } from '../../data/leagues';
import {
  buildFacility, developAfterRace, FACILITY_BUILD_RACES, promoteYouth, sendOnCourse, setTraining, signYouth, traitEffects, trainDriver, UNHAPPY,
} from '../development';
import { renewContract, runOffseason } from '../offseason';
import { createRng } from '../rng';
import { recordResult } from '../season';
import { fakeResult, world } from './helpers';
import type { Driver } from '../types';

describe('training', () => {
  it('young drivers improve toward potential; veterans barely move', () => {
    const s = world();
    const d = { ...s.drivers[s.teams[s.playerTeamId].driverIds[0]], potential: 90, pace: 50, training: 'pace' } as Driver;
    const rng = createRng(1);
    let young: Driver = { ...d, age: 18 }, old: Driver = { ...d, age: 34 };
    for (let i = 0; i < 40; i++) { young = trainDriver(young, rng, 0, 0); old = trainDriver(old, rng, 0, 0); }
    expect(young.pace - 50).toBeGreaterThan(8);
    expect(old.pace - 50).toBeLessThan(4);
  });

  it('never trains past potential', () => {
    const s = world();
    let d = { ...s.drivers[s.teams[s.playerTeamId].driverIds[0]], potential: 52, pace: 50, age: 18, training: 'pace' } as Driver;
    const rng = createRng(2);
    for (let i = 0; i < 200; i++) d = trainDriver(d, rng, 5, 5);
    expect(d.pace).toBeLessThanOrEqual(53);
  });

  it('focus can be set per driver', () => {
    const s = world();
    const id = s.teams[s.playerTeamId].driverIds[0];
    expect(setTraining(s, id, 'tyres').drivers[id].training).toBe('tyres');
  });
});

describe('traits', () => {
  it('map to race modifiers', () => {
    expect(traitEffects(['tyreWhisperer']).tyreWearMult).toBe(0.9);
    expect(traitEffects(['hotHeaded']).crashMult).toBe(1.5);
    expect(traitEffects(['streetSpecialist'], 'monaco').lapDelta).toBeLessThan(0);
    expect(traitEffects(['streetSpecialist'], 'harbour').lapDelta).toBe(0);
  });

  it('some drivers start with traits and more appear over seasons', () => {
    let s = world(3);
    const count = () => Object.values(s.drivers).filter((d) => d.teamId && d.traits.length).length;
    const before = count();
    expect(before).toBeGreaterThan(0);
    for (let i = 0; i < 3; i++) s = runOffseason(s).state;
    expect(Object.values(s.drivers).some((d) => d.traits.length >= 2)).toBe(true);
  });
});

describe('morale', () => {
  it('points lift morale, and unhappy drivers refuse to renew', () => {
    let s = world();
    const pid = s.playerTeamId;
    const order = [pid, ...s.leagues[3].teamIds.filter((x) => x !== pid)];
    s = recordResult(s, 3, fakeResult(s, 3, order, 1));
    s = developAfterRace(s, 3, s.leagues[3].results[0]);
    const [d1] = s.teams[pid].driverIds;
    expect(s.drivers[d1].morale).toBeGreaterThan(70);
    const sad = { ...s, drivers: { ...s.drivers, [d1]: { ...s.drivers[d1], morale: UNHAPPY - 5 } } };
    expect(renewContract(sad, 'driver', d1, 2)).toBe(sad);
  });
});

describe('youth academy', () => {
  it('sign a teenager, they train, and can be promoted at 17', () => {
    let s = world();
    const pid = s.playerTeamId;
    expect(s.youthPool.length).toBe(6);
    const kid = s.youthPool[0];
    const r = signYouth(s, kid);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    s = r.state;
    expect(s.teams[pid].academy).toEqual([kid]);
    expect(s.drivers[kid].academyTeamId).toBe(pid);
    expect(promoteYouth(s, kid).ok).toBe(false);
    // Make them 17 with a free seat.
    s = { ...s, drivers: { ...s.drivers, [kid]: { ...s.drivers[kid], age: 17 } } };
    const [d1] = s.teams[pid].driverIds;
    s = { ...s, teams: { ...s.teams, [pid]: { ...s.teams[pid], driverIds: s.teams[pid].driverIds.filter((x) => x !== d1) } } };
    const p = promoteYouth(s, kid);
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    expect(p.state.teams[pid].driverIds).toContain(kid);
    expect(p.state.drivers[kid].contract?.yearsLeft).toBe(2);
  });

  it('academy kids survive the offseason and a new pool arrives', () => {
    let s = world();
    const r = signYouth(s, s.youthPool[0]);
    if (r.ok) s = r.state;
    const kid = s.teams[s.playerTeamId].academy[0];
    const next = runOffseason(s).state;
    expect(next.teams[next.playerTeamId].academy).toContain(kid);
    expect(next.drivers[kid].age).toBe(s.drivers[kid].age + 1);
    expect(next.youthPool.length).toBe(6);
    expect(next.youthPool).not.toContain(s.youthPool[1]);
  });
});

describe('staff and facilities', () => {
  it('a course raises rating once per season', () => {
    let s = world();
    const sid = s.teams[s.playerTeamId].staffIds.raceEngineer!;
    const before = s.staff[sid].rating;
    const r = sendOnCourse(s, sid);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    s = r.state;
    expect(s.staff[sid].rating).toBeGreaterThan(before);
    expect(sendOnCourse(s, sid).ok).toBe(false);
  });

  it('a facility takes races to build, then levels up', () => {
    let s = world();
    const pid = s.playerTeamId;
    s = { ...s, teams: { ...s.teams, [pid]: { ...s.teams[pid], budget: 1e9 } } };
    const r = buildFacility(s, 'simulator');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    s = r.state;
    expect(buildFacility(s, 'gym').ok).toBe(false);
    for (let i = 1; i <= FACILITY_BUILD_RACES; i++) {
      const res = fakeResult(s, 3, s.leagues[3].teamIds, i);
      s = developAfterRace(recordResult(s, 3, res), 3, res);
    }
    expect(s.teams[pid].facilities.simulator).toBe(1);
    expect(s.teams[pid].building).toBeNull();
    expect(LEAGUES[3].races).toBeGreaterThan(FACILITY_BUILD_RACES);
  });
});
