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
import Config from 'src/config/configuration.service';
import { PeerConfig } from 'src/peers/peers.config';
import { poll } from './fsm.util';
import { Broker, startBroker, startRunner, stopBroker } from './mqtt.util';

const BASE = 'dtaas/test';

const PEER: PeerConfig = {
  id: 'hospital-2',
  topic: `${BASE}/hospital-2`,
  attributes: { distance: 12.4 },
  enabled: true,
};

const BACK: PeerConfig = {
  id: 'hospital-1',
  topic: `${BASE}/hospital-1`,
  attributes: {},
  enabled: true,
};

const descriptor = { id: 'hospital-2', peers: [] };

const notice = (kind: string, data: unknown) =>
  JSON.stringify({ kind, id: 'hospital-2', time: null, data });

type Entry = { online: boolean | null; descriptor: unknown; state: unknown };

const entryOf = (body: Record<string, unknown>) => body['hospital-2'] as Entry;

describe('Runner peers over MQTT', () => {
  let broker: Broker;
  let client: MqttClient;
  let apps: INestApplication[];

  // The runner hospital-1, which lists hospital-2 as its peer, or the
  // runner hospital-2, which lists hospital-1 without its attributes
  async function start(id: string): Promise<INestApplication> {
    const mqtt = { url: broker.url, topic: `${BASE}/${id}` };
    const app = await startRunner(
      { ...mqtt, protocolVersion: 4 },
      (config: Config) => {
        jest.spyOn(config, 'getId').mockReturnValue(id);
        jest
          .spyOn(config, 'getPeers')
          .mockReturnValue(id === 'hospital-1' ? [PEER] : [BACK]);
      },
    );
    apps.push(app);
    return app;
  }

  // Polls GET /peers of the runner until the entry of hospital-2 passes
  const peerEntry = async (
    app: INestApplication,
    check: (e: Entry) => boolean,
  ) => entryOf(await poll(app, '/peers', (body) => check(entryOf(body))));

  const put = (app: INestApplication, enabled: boolean) =>
    supertest(app.getHttpServer())
      .put('/peers')
      .send({ 'hospital-2': enabled });

  beforeEach(async () => {
    apps = [];
    broker = await startBroker();
    client = await connectAsync(broker.url, { protocolVersion: 4 });
  });

  afterEach(async () => {
    await Promise.all(apps.map((app) => app.close()));
    await client.endAsync();
    await stopBroker(broker);
  });

  it('shows the retained notices of a peer published before the start', async () => {
    const options = { qos: 1, retain: true } as const;
    await client.publishAsync(
      `${PEER.topic}/notify/presence`,
      notice('presence', { online: true, descriptor }),
      options,
    );
    await client.publishAsync(
      `${PEER.topic}/notify/state`,
      notice('state', { id: 'hospital-2', machine: null }),
      options,
    );
    const runner = await start('hospital-1');

    const entry = await peerEntry(runner, ({ state }) => state !== null);

    expect(entry).toEqual({
      topic: PEER.topic,
      url: null,
      attributes: { distance: 12.4 },
      enabled: true,
      online: true,
      descriptor,
      state: { id: 'hospital-2', machine: null },
    });
  });

  it('sees a peer runner online with its state, and offline when it leaves', async () => {
    const runner = await start('hospital-1');
    const peer = await start('hospital-2');

    const entry = await peerEntry(
      runner,
      ({ online, state }) => online === true && state !== null,
    );
    expect(entry.descriptor).toMatchObject({
      id: 'hospital-2',
      peers: ['hospital-1'],
    });
    expect(entry.state).toMatchObject({ id: 'hospital-2', machine: null });

    apps = apps.filter((app) => app !== peer);
    await peer.close();

    const left = await peerEntry(runner, ({ online }) => online === false);
    expect(left.descriptor).toMatchObject({ id: 'hospital-2' });
  });

  it('forgets a disabled peer and refills the entry when it is enabled', async () => {
    const runner = await start('hospital-1');
    await start('hospital-2');
    await peerEntry(runner, ({ state }) => state !== null);

    const disabled = await put(runner, false);
    expect(entryOf(disabled.body)).toMatchObject({
      enabled: false,
      online: null,
      descriptor: null,
      state: null,
    });

    await put(runner, true);
    const entry = await peerEntry(
      runner,
      ({ online, state }) => online === true && state !== null,
    );
    expect(entry.descriptor).toMatchObject({ id: 'hospital-2' });
  });
});
