import { describe, expect, it } from '@jest/globals';
import isPlainTopic, { commandTopicOf } from 'src/topic';

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

describe('commandTopicOf', () => {
  const VALVE = 'SWiM/CTO/plant/01/loop1/A/A-0001/position';

  it('puts cmd and the command in place of the quantity of an actuator', () => {
    expect(commandTopicOf(VALVE, 'set')).toBe(
      'SWiM/CTO/plant/01/loop1/A/A-0001/cmd/set',
    );
  });

  it.each([
    ['a sensor', VALVE.replace('/A/', '/S/'), 'set'],
    ['a topic of another shape', 'alice/pump/flow', 'set'],
    ['a command with a slash', VALVE, 'set/x'],
    ['a command in capitals', VALVE, 'SET'],
  ])('takes no command for %s', (_label, topic, command) => {
    expect(commandTopicOf(topic, command)).toBeUndefined();
  });
});
