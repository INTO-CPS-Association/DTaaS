import { describe, expect, it } from '@jest/globals';
import { isPlainTopic, topicToRoutingKey } from 'src/broker/routing-key';

describe('topicToRoutingKey', () => {
  it("maps MQTT's '/' to AMQP's '.'", () => {
    expect(topicToRoutingKey('a/b/c')).toBe('a.b.c');
  });

  it("swaps a '.' in the topic to '/', as the MQTT plugin does", () => {
    expect(topicToRoutingKey('site.1/pump')).toBe('site/1.pump');
  });
});

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
