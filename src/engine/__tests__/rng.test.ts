import { describe, expect, it } from 'vitest';
import { createRng, hashSeed } from '../rng';

describe('rng', () => {
  it('same seed gives the same sequence', () => {
    const a = createRng(123), b = createRng(123);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });
  it('different seeds differ', () => {
    expect(createRng(1).next()).not.toBe(createRng(2).next());
  });
  it('int stays in range and hits both ends', () => {
    const r = createRng(9);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const v = r.int(1, 6);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
      seen.add(v);
    }
    expect(seen.size).toBe(6);
  });
  it('can resume from saved state', () => {
    const a = createRng(77);
    a.next(); a.next();
    const b = createRng(a.state());
    expect(b.next()).toBe(a.next());
  });
  it('shuffle keeps every item', () => {
    const s = createRng(5).shuffle([1, 2, 3, 4, 5]);
    expect([...s].sort()).toEqual([1, 2, 3, 4, 5]);
  });
  it('hashSeed is stable and order-sensitive', () => {
    expect(hashSeed('a', 1)).toBe(hashSeed('a', 1));
    expect(hashSeed('a', 1)).not.toBe(hashSeed(1, 'a'));
  });
});
