import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import { connectAsync, MqttClient } from 'mqtt';
import Access from 'src/auth/access';
import Config from 'src/config/configuration.service';
import { mqttPayload, newCaller } from 'test/sign.util';
import { MEASURED } from 'test/utils';
import { Broker, startBroker, startRunner, stopBroker } from './mqtt.util';

const TOPIC = 'dtaas/test/auth';

const alice = newCaller('alice');
const manager = newCaller('manager-1');

const success = {
  status: 'success',
  result: {
    exitCode: 0,
    stdout: 'hello world',
    stderr: '',
    resources: MEASURED,
  },
};

const unauthorized = (message: string) => ({
  statusCode: 401,
  message,
  error: 'Unauthorized',
});

// Publishes the payload on the route and resolves with the parsed reply
async function request(
  client: MqttClient,
  route: string,
  payload: string | Buffer,
): Promise<unknown> {
  const reply = new Promise<unknown>((resolve) => {
    client.once('message', (_topic, body) => {
      resolve(JSON.parse(body.toString()));
    });
  });
  await client.publishAsync(`${TOPIC}/${route}`, payload, { qos: 1 });
  return reply;
}

// Resolves once the runner subscribed to its execute topic
const subscribed = ({ aedes }: Broker) =>
  new Promise<void>((resolve) => {
    aedes.on('subscribe', (subscriptions) => {
      if (subscriptions.some(({ topic }) => topic === `${TOPIC}/execute`)) {
        resolve();
      }
    });
  });

describe('Access control over MQTT end-to-end tests', () => {
  let broker: Broker;
  let client: MqttClient;
  let app: INestApplication;

  const start = async (access?: Access) => {
    const runnerSubscribed = subscribed(broker);
    const mqtt = { url: broker.url, topic: TOPIC, protocolVersion: 4 as const };
    app = await startRunner(mqtt);
    if (access !== undefined) {
      jest.spyOn(app.get<Config>(Config), 'access').mockReturnValue(access);
    }
    await runnerSubscribed;
  };

  // The aud is the id of the test configuration
  const envelope = (topic: string, body?: unknown, caller = alice) =>
    mqttPayload(caller, 'test-runner', topic, body);

  beforeEach(async () => {
    broker = await startBroker();
    client = await connectAsync(broker.url, { protocolVersion: 4 });
    await client.subscribeAsync(`${TOPIC}/+/response`, { qos: 1 });
  });

  afterEach(async () => {
    await app.close();
    await client.endAsync();
    await stopBroker(broker);
    jest.restoreAllMocks();
  });

  describe('with auth', () => {
    beforeEach(() =>
      start(
        new Access(
          [
            { name: 'alice', role: 'client', publicKey: alice.publicKey },
            {
              name: 'manager-1',
              role: 'manager',
              publicKey: manager.publicKey,
            },
          ],
          'test-runner',
        ),
      ),
    );

    it('Should run the command of an envelope', async () => {
      const payload = envelope(`${TOPIC}/execute`, { name: 'create' });

      expect(await request(client, 'execute', payload)).toEqual(success);
    });

    it('Should refuse a plain payload', async () => {
      const reply = await request(client, 'execute', '{"name":"create"}');

      expect(reply).toEqual(unauthorized('missing credential'));
    });

    it('Should refuse an envelope for another topic', async () => {
      const payload = envelope(`${TOPIC}/status`, { name: 'create' });

      expect(await request(client, 'execute', payload)).toEqual(
        unauthorized('credential does not match the request'),
      );
    });

    it('Should refuse a manager to stop', async () => {
      const payload = envelope(`${TOPIC}/stop`, {}, manager);

      expect(await request(client, 'stop', payload)).toEqual({
        statusCode: 403,
        message: 'manager may not call stop',
        error: 'Forbidden',
      });
    });

    it('Should answer health without a credential', async () => {
      const reply = await request(client, 'health', '');

      expect(reply).toMatchObject({ status: 'ok', mqtt: 'connected' });
    });
  });

  it('Should run a plain payload without auth', async () => {
    await start();

    expect(await request(client, 'execute', '{"name":"create"}')).toEqual(
      success,
    );
  });
});
