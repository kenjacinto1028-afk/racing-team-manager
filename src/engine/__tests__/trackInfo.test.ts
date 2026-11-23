import { describe, expect, it } from 'vitest';
import { TRACKS } from '../../data/tracks';
import { cornerCounts, strategyHint } from '../trackInfo';

describe('trackInfo', () => {
  it('counts some corners on every track', () => {
    for (const t of TRACKS) {
      const c = cornerCounts(t);
      expect(c.slow + c.medium + c.fast).toBeGreaterThan(2);
    }
  });
  it('gives tyre advice that follows tyre wear', () => {
    const hi = TRACKS.reduce((a, b) => (b.profile.tyreWear > a.profile.tyreWear ? b : a));
    const lo = TRACKS.reduce((a, b) => (b.profile.tyreWear < a.profile.tyreWear ? b : a));
    expect(strategyHint(hi).tyres).toMatch(/medium or hard/);
    expect(strategyHint(lo).tyres).toMatch(/Softs/);
  });
});
