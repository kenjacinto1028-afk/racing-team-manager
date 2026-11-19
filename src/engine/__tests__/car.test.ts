import { describe, expect, it } from 'vitest';
import { LEAGUES } from '../../data/leagues';
import { PART_BY_ID } from '../../data/parts';
import { TRACK_BY_ID, TRACKS } from '../../data/tracks';
import {
  afterRace, applyGridPenalties, canChangeConcept, conceptDelta, effectiveCar, fitPart, idealSetup, projectRaces,
  replaceUnit, setConcept, setupDelta, startProject, unitAllowance, wearRisk,
} from '../car';
import { prepareWeekend } from '../raceSetup';
import { simulateRace } from '../raceSim';
import { recordResult } from '../season';
import type { Competitor } from '../performance';
import { fakeResult, world } from './helpers';

describe('car concepts', () => {
  it('low-drag is faster on power tracks and slower on twisty ones', () => {
    const power = TRACKS.reduce((a, t) => (t.profile.power - t.profile.downforce > a.profile.power - a.profile.downforce ? t : a));
    const twisty = TRACK_BY_ID.monaco;
    expect(conceptDelta('lowDrag', power)).toBeLessThan(0);
    expect(conceptDelta('lowDrag', twisty)).toBeGreaterThan(0);
    expect(conceptDelta('highDownforce', twisty)).toBeLessThan(0);
    expect(conceptDelta('balanced', twisty)).toBe(0);
  });

  it('can only change before the first race', () => {
    let s = world();
    expect(canChangeConcept(s)).toBe(true);
    const r = setConcept(s, 'lowDrag');
    expect(r.ok && r.state.teams[s.playerTeamId].concept).toBe('lowDrag');
    s = recordResult(s, 3, fakeResult(s, 3, s.leagues[3].teamIds, 1));
    expect(setConcept(s, 'highDownforce').ok).toBe(false);
  });
});

describe('setup', () => {
  it('the ideal setup is quickest; two steps off is slowest', () => {
    const t = TRACK_BY_ID.monaco;
    const ideal = idealSetup(t);
    expect(ideal.wing).toBe('high');
    expect(setupDelta(ideal, t)).toBeCloseTo(-0.16);
    expect(setupDelta({ wing: 'low', suspension: ideal.suspension }, t)).toBeGreaterThan(setupDelta(ideal, t));
  });
});

describe('parts and R&D projects', () => {
  it('a project costs money up front, takes races, then the part can be fitted', () => {
    let s = world();
    const pid = s.playerTeamId;
    const before = s.teams[pid].budget;
    const r = startProject(s, pid, 'rearWing-lowdrag');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    s = r.state;
    expect(s.teams[pid].budget).toBeLessThan(before);
    expect(fitPart(s, pid, 'rearWing-lowdrag').ok).toBe(false);
    const races = s.teams[pid].projects[0].racesLeft;
    for (let i = 1; i <= races; i++) s = afterRace(recordResult(s, 3, fakeResult(s, 3, s.leagues[3].teamIds, i)), 3);
    expect(s.teams[pid].ownedParts).toContain('rearWing-lowdrag');
    const f = fitPart(s, pid, 'rearWing-lowdrag');
    expect(f.ok).toBe(true);
    if (!f.ok) return;
    const car = effectiveCar(f.state.teams[pid]);
    expect(car.engine).toBe(Math.min(99, s.teams[pid].car.engine + 3));
    expect(car.aero).toBe(s.teams[pid].car.aero - 3);
  });

  it('only two projects at once, and a good TD is quicker', () => {
    let s = world();
    const pid = s.playerTeamId;
    s = { ...s, teams: { ...s.teams, [pid]: { ...s.teams[pid], budget: 1e9 } } };
    for (const id of ['rearWing-lowdrag', 'brakes-cooled']) { const r = startProject(s, pid, id); if (r.ok) s = r.state; }
    expect(startProject(s, pid, 'floor-stiff').ok).toBe(false);
    expect(projectRaces('floor-groundeffect', 80)).toBe(PART_BY_ID['floor-groundeffect'].races - 1);
  });
});

describe('power-unit wear and grid penalties', () => {
  it('wear builds each race and raises breakdown risk', () => {
    let s = world();
    const pid = s.playerTeamId;
    s = afterRace(recordResult(s, 3, fakeResult(s, 3, s.leagues[3].teamIds, 1)), 3);
    expect(s.teams[pid].units.engine.wear).toBeGreaterThan(0);
    const worn = { ...s.teams[pid], units: { engine: { used: 1, wear: 95 }, gearbox: { used: 1, wear: 10 } } };
    expect(wearRisk(worn)).toBeGreaterThan(2);
  });

  it('going over the allowance gives a grid penalty at the next race', () => {
    let s = world();
    const pid = s.playerTeamId;
    const allow = unitAllowance(3, 'engine');
    expect(allow).toBe(Math.ceil(LEAGUES[3].races / 4));
    for (let i = 0; i < allow - 1; i++) { const r = replaceUnit(s, pid, 'engine'); if (r.ok) s = r.state; }
    expect(s.teams[pid].gridPenalty).toBe(0);
    const r = replaceUnit(s, pid, 'engine');
    if (r.ok) s = r.state;
    expect(s.teams[pid].gridPenalty).toBe(5);
    const w = prepareWeekend(s, 3)!;
    const [d1] = s.teams[pid].driverIds;
    const quali = w.qualifying.findIndex((q) => q.driverId === d1);
    const grid = w.grid!.indexOf(d1);
    expect(grid).toBeGreaterThanOrEqual(Math.min(19, quali));
    expect(w.penalties![d1]).toBeGreaterThan(0);
    // Served after the race.
    s = afterRace(recordResult(s, 3, fakeResult(s, 3, s.leagues[3].teamIds, 1)), 3);
    expect(s.teams[pid].gridPenalty).toBe(0);
  });

  it('applyGridPenalties moves a car back n places', () => {
    const grid = ['a', 'b', 'c', 'd', 'e'].map((d) => ({ driverId: d, teamId: d === 'b' ? 'T' : 'x' }));
    const { order } = applyGridPenalties(grid, (t) => (t === 'T' ? 2 : 0));
    expect(order).toEqual(['a', 'c', 'd', 'b', 'e']);
  });
});

describe('balance: 100+ races', () => {
  it('the stronger car and driver usually win, but not always', () => {
    const track = TRACK_BY_ID.harbour;
    const mk = (i: number, car: number, pace: number): Competitor => ({
      driverId: `d${i}`, teamId: `t${i}`, name: `D${i}`, pace, consistency: 70, racecraft: 70, tyreManagement: 70, experience: 60,
      car: { engine: car, aero: car, chassis: car, reliability: 75 }, engineer: 60, mechanic: 60, pitCrew: 60,
    });
    let wins = 0, top3 = 0;
    const N = 120;
    for (let seed = 1; seed <= N; seed++) {
      const field = [mk(0, 72, 76), ...Array.from({ length: 19 }, (_, i) => mk(i + 1, 60 + (i % 5), 62 + (i % 6)))];
      const res = simulateRace({ field, grid: field.map((c) => c.driverId), track, seed });
      const order = res.cars.filter((c) => !c.dnf).sort((a, b) => a.totalTime - b.totalTime);
      if (order[0]?.c.driverId === 'd0') wins++;
      if (order.slice(0, 3).some((c) => c.c.driverId === 'd0')) top3++;
    }
    expect(wins / N).toBeGreaterThan(0.5);
    expect(wins / N).toBeLessThan(0.98);
    expect(top3 / N).toBeGreaterThan(0.75);
  });

  it('a full AI season still produces several different winners', () => {
    let s = world(11);
    const winners = new Set<string>();
    for (let r = 1; r <= LEAGUES[3].races; r++) {
      const w = prepareWeekend(s, 3)!;
      const race = simulateRace({ field: w.field, grid: w.grid!, track: TRACK_BY_ID[s.leagues[3].calendar[r - 1]], seed: w.seed });
      const win = race.cars.filter((c) => !c.dnf).sort((a, b) => a.totalTime - b.totalTime)[0];
      winners.add(win.c.teamId);
      s = afterRace(recordResult(s, 3, { round: r, trackId: s.leagues[3].calendar[r - 1], entries: [] }), 3);
    }
    expect(winners.size).toBeGreaterThanOrEqual(2);
  });
});
