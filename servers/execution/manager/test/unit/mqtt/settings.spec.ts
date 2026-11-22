import { describe, expect, it } from '@jest/globals';
import { resolveMqttSettings } from 'src/mqtt/settings.js';

const url = 'mqtt://localhost:1883';

describe('resolveMqttSettings', () => {
  it('builds the base topic from the topic prefix and the username', () => {
    const settings = { url, 'topic-prefix': 'dtaas/execution-manager' };

    expect(resolveMqttSettings(settings, 'user1')).toEqual({
      url,
      username: undefined,
      password: undefined,
      baseTopic: 'dtaas/execution-manager/user1',
    });
  });

  it('keeps the configured settings', () => {
    const resolved = resolveMqttSettings(
      {
        url: 'mqtts://broker.example.org:8883',
        username: 'manager',
        password: 's3cret ',
        'topic-prefix': 'site/twins',
      },
      'user1',
    );

    expect(resolved).toEqual({
      url: 'mqtts://broker.example.org:8883',
      username: 'manager',
      password: 's3cret ',
      baseTopic: 'site/twins/user1',
    });
  });

  it('strips the slashes around the topic prefix', () => {
    const resolved = resolveMqttSettings(
      { url, 'topic-prefix': '/site/twins/' },
      'user1',
    );

    expect(resolved.baseTopic).toBe('site/twins/user1');
  });

  it.each([
    ['a wildcard in the topic prefix', 'dtaas/#', 'user1'],
    ['a wildcard in the username', 'dtaas', 'user+1'],
    ['a control character', `dtaas${String.fromCodePoint(1)}`, 'user1'],
  ])('refuses %s', (_, prefix, username) => {
    expect(() =>
      resolveMqttSettings({ url, 'topic-prefix': prefix }, username),
    ).toThrow(
      'mqtt.topic-prefix and gitlab.username do not form an MQTT topic name',
    );
  });
});
