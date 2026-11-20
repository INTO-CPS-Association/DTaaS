import { generateKeyPairSync } from 'node:crypto';
import { describe, expect, it } from '@jest/globals';
import Signer from 'src/auth/signer';
import { offlineNotification } from 'src/dto/notify.dto';
import { verifiedPayload } from 'test/sign.util';
import {
  clientOptions,
  defaultResponseTopic,
  isPublishableTopic,
  mqttConfigSchema,
  mqttRoutes,
  notifyTopic,
  presenceWill,
  requestTopic,
} from 'src/mqtt/mqtt.config';

const valid = { url: 'mqtt://localhost:1883', topic: 'dtaas/user1/runner' };

const unsigned = new Signer(undefined, 'hospital-1');

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
    ['a reserved topic', { ...valid, topic: '$SYS/runner' }],
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

  it('Should accept a single-level base topic', () => {
    expect(mqttConfigSchema.safeParse({ ...valid, topic: 'r' }).success).toBe(
      true,
    );
  });

  it.each([
    ['client/replies', true],
    ['replies', true],
    ['', false],
    ['#', false],
    ['client/+/replies', false],
    ['$SYS/replies', false],
  ])('Should tell whether %p can be published to', (topic, expected) => {
    expect(isPublishableTopic(topic)).toBe(expected);
  });

  it('Should put the notifications two levels under the base topic', () => {
    expect(notifyTopic('dtaas/runner', 'state')).toBe(
      'dtaas/runner/notify/state',
    );
    expect(notifyTopic('dtaas/runner', 'escalation')).toBe(
      'dtaas/runner/notify/escalation',
    );
  });

  it('Should serve escalations one level under the base topic', () => {
    expect(mqttRoutes).toContain('escalate');
    expect(requestTopic('dtaas/runner', 'escalate')).toBe(
      'dtaas/runner/escalate',
    );
  });

  it('Should serve the peers one level under the base topic', () => {
    expect(mqttRoutes).toEqual(expect.arrayContaining(['peers', 'set-peers']));
    expect(requestTopic('dtaas/runner', 'set-peers')).toBe(
      'dtaas/runner/set-peers',
    );
  });

  it('Should give a retained will that says the runner is offline', () => {
    expect(presenceWill('dtaas/runner', 'hospital-1', unsigned)).toEqual({
      topic: 'dtaas/runner/notify/presence',
      payload: JSON.stringify({
        kind: 'presence',
        id: 'hospital-1',
        time: null,
        data: { online: false },
      }),
      qos: 1,
      retain: true,
    });
  });

  it('Should sign the will with a key, keeping its time null', () => {
    const { privateKey, publicKey } = generateKeyPairSync('ed25519');
    const signer = new Signer(privateKey, 'hospital-1');
    const will = presenceWill('dtaas/runner', 'hospital-1', signer);
    const payload = String(will?.payload);

    expect(verifiedPayload(payload, publicKey, 'hospital-1')).toEqual(
      offlineNotification('hospital-1', null),
    );
    expect(payload).toBe(
      signer.encode(offlineNotification('hospital-1', null)),
    );
  });

  it('Should connect with the will and keep retrying', () => {
    const version4 = { ...valid, protocolVersion: 4 as const };
    const options = clientOptions(version4, 'dt-1', unsigned);

    expect(options).toEqual({
      username: undefined,
      password: undefined,
      protocolVersion: 4,
      reconnectOnConnackError: true,
      will: presenceWill('dtaas/user1/runner', 'dt-1', unsigned),
    });
  });
});
