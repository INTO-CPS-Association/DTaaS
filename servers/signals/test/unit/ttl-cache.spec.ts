import { describe, expect, it } from '@jest/globals';
import TtlCache from 'src/auth/ttl-cache';

describe('TtlCache', () => {
  it('returns a value until it expires', () => {
    const cache = new TtlCache<string>();
    cache.set('a', { value: 'one', expiresAt: 1000 }, 0);
    expect(cache.get('a', 999)).toBe('one');
    expect(cache.get('a', 1000)).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it('stays within its bound by dropping expired, then oldest entries', () => {
    const cache = new TtlCache<number>(2);
    cache.set('old', { value: 1, expiresAt: 10 }, 0);
    cache.set('kept', { value: 2, expiresAt: 100 }, 0);
    cache.set('new', { value: 3, expiresAt: 100 }, 50);
    expect(cache.get('old', 50)).toBeUndefined();
    expect(cache.size).toBe(2);
    cache.set('newest', { value: 4, expiresAt: 100 }, 60);
    expect(cache.size).toBe(2);
    expect(cache.get('kept', 60)).toBeUndefined();
    expect(cache.get('newest', 60)).toBe(4);
  });
});
