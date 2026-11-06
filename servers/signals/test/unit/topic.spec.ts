import { describe, expect, it } from '@jest/globals';
import isPlainTopic from 'src/topic';

describe('isPlainTopic', () => {
  it('accepts a plain topic', () => {
    expect(isPlainTopic('alice/pump/flow', 64)).toBe(true);
  });

  it.each(['', 'a/+', 'a/#', 'a/*', 'a\nb', 'x'.repeat(65)])(
    'refuses %j',
    (topic) => {
      expect(isPlainTopic(topic, 64)).toBe(false);
    },
  );
});
