import { describe, expect, it } from 'vitest';
import { careerRecords, driverCareerRows, driverTrophies, staffCareerRows, teamHistory, teamTrophies } from '../careers';
import { completeAllLeagues, runOffseason } from '../offseason';
import { world } from './helpers';

describe('careers', () => {
  const seasons = () => {
    let s = world(21);
    for (let i = 0; i < 3; i++) s = runOffseason(s).state;
    return s;
  };

  it('a champion has a title trophy and a season-by-season career', () => {
    const s = seasons();
    const champ = s.history[1].champions[2]!;
    expect(driverTrophies(s, champ).some((t) => t.season === 2 && t.kind === 'title')).toBe(true);
    const rows = driverCareerRows(s, champ);
    expect(rows.find((r) => r.season === 2)?.pos).toBe(1);
    const rec = careerRecords(rows, 1);
    expect(rec.titles).toBe(1);
    expect(rec.bestSeasonPos).toBe(1);
    expect(rec.wins).toBeGreaterThan(0);
    expect(rows.every((r) => typeof r.ovr === 'number')).toBe(true);
  });

  it('team history lists each season and marks promotions', () => {
    const s = seasons();
    const anyPromoted = s.history[0].tables[3][0].teamId;
    const hist = teamHistory(s, anyPromoted);
    expect(hist).toHaveLength(3);
    expect(hist[0]).toMatchObject({ season: 1, tier: 3, pos: 1, moved: 'up' });
    expect(teamTrophies(s, anyPromoted).some((t) => t.kind === 'promotion')).toBe(true);
    expect(teamTrophies(s, anyPromoted).some((t) => t.kind === 'teamTitle')).toBe(true);
  });

  it('includes the live season once racing starts', () => {
    const s = world(5);
    const d = s.teams[s.playerTeamId].driverIds[0];
    expect(driverCareerRows(s, d)).toHaveLength(0);
    const mid = completeAllLeagues(s);
    const rows = driverCareerRows(mid, d);
    expect(rows).toHaveLength(1);
    expect(rows[0].live).toBe(true);
    const sid = s.teams[s.playerTeamId].staffIds.raceEngineer!;
    expect(staffCareerRows(mid, sid)[0].live).toBe(true);
    expect(teamHistory(mid, s.playerTeamId)[0].live).toBe(true);
  });
});
