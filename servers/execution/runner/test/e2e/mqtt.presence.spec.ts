import { once } from 'node:events';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import { Client } from 'aedes';
import { connectAsync, MqttClient } from 'mqtt';
import {
  Broker,
  lateSubscriber,
  nextNotification,
  Notification,
  startBroker,
  startRunner,
  stopBroker,
} from './mqtt.util';

const TOPIC = 'dtaas/test/runner';
const PRESENCE = `${TOPIC}/notify/presence`;

// the will waits for mqtt.js to reconnect, a second after the loss
const RECONNECT_TIMEOUT = 10000;

type Presence = { online: boolean };

const isOnline = ({ online }: Presence) => online;

const isOffline = ({ online }: Presence) => !online;

const offline = (time: unknown) => ({
  kind: 'presence',
  id: 'test-runner',
  time,
  data: { online: false },
});

// Cuts the runner's connection on the broker's side, as a crash or a
// network failure would, so the runner sends no DISCONNECT
const cutConnection = (runner: Client) => runner.conn.destroy();

describe('Runner MQTT presence end-to-end tests', () => {
  let broker: Broker;
  let client: MqttClient;
  let app: INestApplication | undefined;
  let runner: Client;
  let online: Promise<Notification>;

  beforeEach(async () => {
    broker = await startBroker();
    client = await connectAsync(broker.url, { protocolVersion: 4 });
    await client.subscribeAsync(PRESENCE, { qos: 1 });
    online = nextNotification<Presence>(client, PRESENCE, isOnline);
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
    app = undefined;
    await client.endAsync();
    await stopBroker(broker);
  });

  it('announces the runner with its descriptor, retained', async () => {
    const { body, raw } = await online;

    expect(body).toEqual({
      kind: 'presence',
      id: 'test-runner',
      time: expect.any(String),
      data: {
        online: true,
        descriptor: {
          id: 'test-runner',
          attributes: {},
          commands: [
            'create',
            'loop',
            'ignore-term',
            'echo-input',
            'fail',
            'busy',
          ],
          stateMachine: false,
          manager: { commands: [] },
          peers: [],
          publicKey: null,
        },
      },
    });
    expect(await lateSubscriber(broker.url, 4, PRESENCE)).toEqual({
      body,
      retain: true,
      raw,
    });
  });

  it('leaves with a retained offline notice that has a time', async () => {
    await online;
    const left = nextNotification<Presence>(client, PRESENCE, isOffline);

    await app?.close();
    app = undefined;
    const { body, raw } = await left;

    expect(body).toEqual(offline(expect.any(String)));
    expect(await lateSubscriber(broker.url, 4, PRESENCE)).toEqual({
      body,
      retain: true,
      raw,
    });
  });

  it(
    'has the broker publish the will and announces itself on reconnect',
    async () => {
      await online;
      const will = nextNotification<Presence>(client, PRESENCE, isOffline);
      const again = nextNotification<Presence>(client, PRESENCE, isOnline);

      cutConnection(runner);

      expect((await will).body).toEqual(offline(null));
      expect((await again).body).toMatchObject({
        id: 'test-runner',
        data: { online: true },
      });
    },
    RECONNECT_TIMEOUT,
  );
});
