import { describe, expect, it } from '@jest/globals';
import Replays from 'src/auth/replay';

const NOW = 1793005516;

describe('Replay cache', () => {
  it('Should refuse a jti seen before until exp plus the skew', () => {
    const replays = new Replays();
    replays.remember('jti-1', NOW + 30, NOW);

    expect(() => replays.remember('jti-1', NOW + 30, NOW + 1)).toThrow(
      'replayed credential',
    );
    expect(() => replays.remember('jti-1', NOW + 30, NOW + 60)).toThrow(
      'replayed credential',
    );
  });

  it('Should forget a jti once its token can no longer be accepted', () => {
    const replays = new Replays();
    replays.remember('jti-1', NOW + 30, NOW);

    expect(() => replays.remember('jti-1', NOW + 30, NOW + 61)).not.toThrow();
  });

  it('Should keep other jti apart', () => {
    const replays = new Replays();
    replays.remember('jti-1', NOW + 30, NOW);

    expect(() => replays.remember('jti-2', NOW + 30, NOW)).not.toThrow();
  });

  it('Should prune expired entries on insert', () => {
    const replays = new Replays();
    replays.remember('jti-1', NOW, NOW);
    replays.remember('jti-2', NOW + 60, NOW);
    replays.remember('jti-3', NOW + 60, NOW + 31);

    expect(replays.size()).toBe(2);
  });
});
