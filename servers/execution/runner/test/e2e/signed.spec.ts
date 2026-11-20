import { generateKeyPairSync, KeyObject } from 'node:crypto';
import { once } from 'node:events';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import { Client } from 'aedes';
import { connectAsync, MqttClient } from 'mqtt';
import supertest from 'supertest';
import { publicKeyObject } from 'src/auth/auth.config';
import Signer from 'src/auth/signer';
import Config from 'src/config/configuration.service';
import { jwsHeader, unwrap } from './jws.util';
import {
  Broker,
  lateSubscriber,
  nextNotification,
  startBroker,
  startRunner,
  stopBroker,
} from './mqtt.util';
import Webhook from './webhook.util';

const TOPIC = 'dtaas/test/signed';
const STATE = `${TOPIC}/notify/state`;
const PRESENCE = `${TOPIC}/notify/presence`;

// the will waits for mqtt.js to reconnect, a second after the loss
const RECONNECT_TIMEOUT = 10000;

const isOffline = ({ online }: { online: boolean }) => !online;

// Publishes a plain request on the route and resolves with the payload
// of the response, as received
async function request(client: MqttClient, route: string): Promise<string> {
  const topic = `${TOPIC}/${route}/response`;
  await client.subscribeAsync(topic, { qos: 1 });
  const response = new Promise<string>((resolve) => {
    client.on('message', (received, payload) => {
      if (received === topic) {
        resolve(payload.toString());
      }
    });
  });
  await client.publishAsync(`${TOPIC}/${route}`, '', { qos: 1 });
  return response;
}

describe('Signed output end-to-end tests', () => {
  let broker: Broker;
  let client: MqttClient;
  let webhook: Webhook;
  let app: INestApplication;
  let runner: Client;

  // The key the runner gives in GET /dt
  const publicKey = async (): Promise<KeyObject> => {
    const { body } = await supertest(app.getHttpServer()).get('/dt');
    return publicKeyObject(body.publicKey);
  };

  beforeEach(async () => {
    const { privateKey } = generateKeyPairSync('ed25519');
    jest
      .spyOn(Config.prototype, 'getSigner')
      .mockReturnValue(new Signer(privateKey, 'test-runner'));
    webhook = new Webhook();
    const url = await webhook.listen();
    jest.spyOn(Config.prototype, 'getNotify').mockReturnValue({ url });
    broker = await startBroker();
    client = await connectAsync(broker.url, { protocolVersion: 4 });
    await client.subscribeAsync(`${TOPIC}/notify/+`, { qos: 1 });
    const ready = once(broker.aedes, 'clientReady');
    app = await startRunner({
      url: broker.url,
      topic: TOPIC,
      protocolVersion: 4,
    });
    [runner] = (await ready) as [Client];
  });

  afterEach(async () => {
    await app?.close();
    await client.endAsync();
    await stopBroker(broker);
    await webhook.close();
    jest.restoreAllMocks();
  });

  it('signs the retained state document, not GET /state', async () => {
    await nextNotification(client, STATE, () => true);
    const { raw } = await lateSubscriber(broker.url, 4, STATE);
    const state = await supertest(app.getHttpServer()).get('/state');

    expect(jwsHeader(raw)).toEqual({ alg: 'Ed25519', kid: 'test-runner' });
    expect(unwrap(raw, await publicKey())).toMatchObject({
      kind: 'state',
      id: 'test-runner',
      data: { id: 'test-runner', machine: null },
    });
    expect(state.headers['content-type']).toMatch(/^application\/json/);
    expect(state.body).toMatchObject({ id: 'test-runner', machine: null });
  });

  it('signs the online notice, whose descriptor has the publicKey', async () => {
    const { raw } = await lateSubscriber(broker.url, 4, PRESENCE);
    const { body } = await supertest(app.getHttpServer()).get('/dt');

    expect(body.publicKey).toMatch(/^[\w-]{43}$/);
    expect(unwrap(raw, await publicKey())).toMatchObject({
      kind: 'presence',
      data: { online: true, descriptor: { publicKey: body.publicKey } },
    });
  });

  it('signs a response over MQTT', async () => {
    const raw = await request(client, 'dt');
    const { body } = await supertest(app.getHttpServer()).get('/dt');

    expect(unwrap(raw, await publicKey())).toEqual(body);
  });

  it(
    'has the broker publish a signed will',
    async () => {
      const key = await publicKey();
      const will = nextNotification(client, PRESENCE, isOffline);

      runner.conn.destroy();

      expect(unwrap((await will).raw, key)).toEqual({
        kind: 'presence',
        id: 'test-runner',
        time: null,
        data: { online: false },
      });
    },
    RECONNECT_TIMEOUT,
  );

  it('posts a JWS to the webhook as application/jose', async () => {
    const { headers, raw, body } = await webhook.received(() => true);

    expect(headers['content-type']).toBe('application/jose');
    expect(unwrap(raw, await publicKey())).toEqual(body);
    expect(body).toMatchObject({ kind: 'state', id: 'test-runner' });
  });
});
