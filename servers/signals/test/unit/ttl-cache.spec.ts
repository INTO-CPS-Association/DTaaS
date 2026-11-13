import { describe, expect, it } from '@jest/globals';
import TtlCache from 'src/auth/ttl-cache';

describe('TtlCache', () => {
  it('returns a value until it expires', () => {
    const cache = new TtlCache<string>();
    cache.set('a', 'one', 1000, 0);
    expect(cache.get('a', 999)).toBe('one');
    expect(cache.get('a', 1000)).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it('stays within its bound by dropping expired, then oldest entries', () => {
    const cache = new TtlCache<number>(2);
    cache.set('old', 1, 10, 0);
    cache.set('kept', 2, 100, 0);
    cache.set('new', 3, 100, 50);
    expect(cache.get('old', 50)).toBeUndefined();
    expect(cache.size).toBe(2);
    cache.set('newest', 4, 100, 60);
    expect(cache.size).toBe(2);
    expect(cache.get('kept', 60)).toBeUndefined();
    expect(cache.get('newest', 60)).toBe(4);
  });
});
