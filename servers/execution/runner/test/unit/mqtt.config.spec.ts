import { describe, expect, it } from '@jest/globals';
import {
  defaultResponseTopic,
  mqttConfigSchema,
  requestTopic,
} from 'src/mqtt/mqtt.config';

const valid = { url: 'mqtt://localhost:1883', topic: 'dtaas/user1/runner' };

describe('MQTT configuration', () => {
  it('Should accept a minimal configuration and default to MQTT 5', () => {
    expect(mqttConfigSchema.parse(valid)).toEqual({
      ...valid,
      protocolVersion: 5,
    });
  });

  it('Should accept credentials and MQTT 3.1.1', () => {
    const config = {
      ...valid,
      url: 'mqtts://broker.example.com',
      username: 'user',
      password: 'secret',
      protocolVersion: 4,
    };
    expect(mqttConfigSchema.parse(config)).toEqual(config);
  });

  it.each([
    ['a non-MQTT url', { ...valid, url: 'http://localhost:1883' }],
    ['a missing topic', { url: valid.url }],
    ['a wildcard topic', { ...valid, topic: 'dtaas/+/runner' }],
    ['a multi-level wildcard', { ...valid, topic: 'dtaas/#' }],
    ['a trailing separator', { ...valid, topic: 'dtaas/runner/' }],
    ['an empty topic', { ...valid, topic: '' }],
    ['an unsupported version', { ...valid, protocolVersion: 3 }],
    ['an unknown key', { ...valid, port: 1883 }],
  ])('Should reject %s', (_, config) => {
    expect(mqttConfigSchema.safeParse(config).success).toBe(false);
  });

  it('Should derive the request and response topics', () => {
    const topic = requestTopic('dtaas/runner', 'execute');
    expect(topic).toEqual('dtaas/runner/execute');
    expect(defaultResponseTopic(topic)).toEqual(
      'dtaas/runner/execute/response',
    );
  });
});
