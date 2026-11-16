import { generateKeyPairSync } from 'node:crypto';
import { once } from 'node:events';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
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
import supertest from 'supertest';
import Signer from 'src/auth/signer';
import Config from 'src/config/configuration.service';
import MqttService from 'src/mqtt/mqtt.service';
import { PeerConfig } from 'src/peers/peers.config';
import { digitalTwin, poll, post, startRunner } from './fsm.util';
import { Broker, startBroker, stopBroker } from './mqtt.util';

// PowerShell takes a second or more to start on a loaded Windows host
const TIMEOUT = 30000;

const BASE = 'dtaas/test/peer-events';

const PEER_TOPIC = `${BASE}/hospital-2`;

const DEFINITION = `
events: [neighbour-full, neighbour-down]
subscriptions:
  - peer: hospital-2
    when:
      state: full
    event: neighbour-full
  - peer: hospital-2
    when:
      online: false
    event: neighbour-down
states:
  loop:
    transitions:
      neighbour-full:
        state: loop
        stop: true
      neighbour-down:
        state: create
        stop: true
  create:
    transitions:
      neighbour-full:
        state: create
        stop: true
`;

const signer = new Signer(
  generateKeyPairSync('ed25519').privateKey,
  'hospital-2',
);

const peer = (publicKey?: string): PeerConfig => ({
  id: 'hospital-2',
  topic: PEER_TOPIC,
  attributes: {},
  enabled: true,
  publicKey,
});

// A notification of hospital-2, as its runner sends it
const notice = (kind: string, data: unknown) => ({
  kind,
  id: 'hospital-2',
  time: null,
  data,
});

const inState = (state: string) =>
  notice('state', { id: 'hospital-2', machine: { state } });

const OFFLINE = notice('presence', { online: false });

const RETAINED = { qos: 1, retain: true } as const;

describe('Events raised by the notices of a peer', () => {
  const cleanups: Array<() => Promise<void>> = [];
  let broker: Broker;
  let client: MqttClient;
  let app: INestApplication;

  const publish = (kind: string, body: unknown, encode = JSON.stringify) =>
    client.publishAsync(`${PEER_TOPIC}/notify/${kind}`, encode(body), RETAINED);

  // The runner of the state machine, following hospital-2 as listed
  const start = async (listed: PeerConfig) => {
    jest.spyOn(Config.prototype, 'getPeers').mockReturnValue([listed]);
    const dir = digitalTwin(DEFINITION, ['loop']);
    cleanups.push(() => {
      rmSync(dir, { recursive: true, force: true });
      return Promise.resolve();
    });
    app = await startRunner(join(dir, 'runner.yaml'));
    cleanups.push(() => app.close());
    const subscribed = once(broker.aedes, 'subscribe');
    app.get<MqttService>(MqttService).start();
    await subscribed;
  };

  const machine = (check: (body: Record<string, unknown>) => boolean) =>
    poll(app, '/fsm', check);

  // The counters of the events that reached the machine, once n did
  const eventsOnceRequested = async (n: number) => {
    const body = await poll(
      app,
      '/metrics',
      ({ machine }) =>
        (machine as { events: { requested: number } }).events.requested === n,
    );
    return (body.machine as { events: unknown }).events;
  };

  beforeEach(async () => {
    broker = await startBroker();
    cleanups.push(() => stopBroker(broker));
    jest
      .spyOn(Config.prototype, 'getMqtt')
      .mockReturnValue({ url: broker.url, topic: BASE, protocolVersion: 4 });
    client = await connectAsync(broker.url, { protocolVersion: 4 });
    cleanups.push(() => client.endAsync());
  });

  afterEach(async () => {
    const undo = async (left: Array<() => Promise<void>>): Promise<void> => {
      const last = left.pop();
      if (last !== undefined) {
        await last();
        await undo(left);
      }
    };
    await undo(cleanups);
    jest.restoreAllMocks();
  }, TIMEOUT);

  it(
    'Should raise the event of a retained full at startup',
    async () => {
      await publish('state', inState('full'));

      await start(peer());

      // before the first transition the event finds no transition
      expect(await eventsOnceRequested(1)).toEqual({
        requested: 1,
        accepted: 0,
        noTransition: 1,
      });
    },
    TIMEOUT,
  );

  it(
    'Should raise once for a later full, and on the will of the peer',
    async () => {
      await start(peer());
      await post(app, '/fsm/transition', { state: 'loop' });
      await publish('state', inState('open'));
      await publish('state', inState('full'));
      await publish('state', inState('full'));
      await machine(({ entry }) => entry === 2);

      const will = await connectAsync(broker.url, {
        protocolVersion: 4,
        reconnectPeriod: 0,
        will: {
          topic: `${PEER_TOPIC}/notify/presence`,
          payload: Buffer.from(JSON.stringify(OFFLINE)),
          ...RETAINED,
        },
      });
      cleanups.push(() => will.endAsync(true));
      will.stream.destroy();

      await machine(({ state }) => state === 'create');
      expect(await eventsOnceRequested(2)).toMatchObject({ accepted: 2 });
    },
    TIMEOUT,
  );

  it(
    'Should drop an unsigned document of a peer with a key',
    async () => {
      await start(peer(String(signer.publicKey())));

      await publish('state', inState('full'));
      await publish('presence', OFFLINE, (body) => signer.encode(body));

      expect(await eventsOnceRequested(1)).toEqual({
        requested: 1,
        accepted: 0,
        noTransition: 1,
      });
    },
    TIMEOUT,
  );

  it(
    'Should raise nothing for a disabled peer, and count its first notice after an enable',
    async () => {
      const put = (enabled: boolean) =>
        supertest(app.getHttpServer())
          .put('/peers')
          .send({ 'hospital-2': enabled });
      await start(peer());
      await post(app, '/fsm/transition', { state: 'create' });
      await publish('state', inState('full'));
      await machine(({ entry }) => entry === 2);

      await put(false);
      await publish('state', inState('open'));
      await publish('state', inState('full'));
      await put(true);

      await machine(({ entry }) => entry === 3);
      expect(await eventsOnceRequested(2)).toMatchObject({ accepted: 2 });
    },
    TIMEOUT,
  );
});
