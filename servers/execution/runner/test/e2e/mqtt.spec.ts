import { once } from 'node:events';
import { AddressInfo, createServer, Server } from 'node:net';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Aedes } from 'aedes';
import supertest from 'supertest';
import { connectAsync, MqttClient } from 'mqtt';
import Keyv from 'keyv';
import AppModule from 'src/app.module';
import Config from 'src/config/configuration.service';
import MqttService from 'src/mqtt/mqtt.service';
import { MqttRoute } from 'src/mqtt/mqtt.config';
import { configFilename } from 'test/utils';
import { queriesJSON } from './util';

const TOPIC = 'dtaas/test/runner';

type Broker = { aedes: Aedes; server: Server; url: string };

async function startBroker(): Promise<Broker> {
  const aedes = await Aedes.createBroker();
  const server = createServer(aedes.handle);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address() as AddressInfo;
  return { aedes, server, url: `mqtt://127.0.0.1:${port}` };
}

async function stopBroker({ aedes, server }: Broker): Promise<void> {
  await new Promise<void>((resolve) => {
    aedes.close(() => resolve());
  });
  server.close();
  await once(server, 'close');
}

async function startRunner(url: string): Promise<INestApplication> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleFixture.createNestApplication({ logger: false });
  const config = app.get<Config>(Config);
  const options = new Keyv();
  await options.set('configFile', configFilename);
  await config.loadConfig(options);
  // aedes supports MQTT 3.1.1 only
  jest
    .spyOn(config, 'getMqtt')
    .mockReturnValue({ url, topic: TOPIC, protocolVersion: 4 });
  await app.init();
  app.get<MqttService>(MqttService).start();
  return app;
}

// Publishes one request and resolves with the parsed reply
async function request(
  client: MqttClient,
  route: MqttRoute,
  body: unknown = {},
): Promise<unknown> {
  const responseTopic = `${TOPIC}/${route}/response`;
  const reply = new Promise((resolve) => {
    client.once('message', (topic, payload) => {
      expect(topic).toEqual(responseTopic);
      resolve(JSON.parse(payload.toString()));
    });
  });
  await client.publishAsync(`${TOPIC}/${route}`, JSON.stringify(body), {
    qos: 1,
  });
  return reply;
}

const queryTypes: (keyof typeof queriesJSON)[] = [
  'permitted',
  'notPermitted',
  'nonExisting',
  'incorrect',
];

describe('Runner MQTT end-to-end tests', () => {
  let client: MqttClient;
  let app: INestApplication;
  // Undo only what started, so that a failed setup can not keep jest
  // from exiting
  const cleanups: Array<() => Promise<void>> = [];

  beforeEach(async () => {
    const broker = await startBroker();
    cleanups.push(() => stopBroker(broker));
    client = await connectAsync(broker.url, { protocolVersion: 4 });
    cleanups.push(() => client.endAsync());
    await client.subscribeAsync(`${TOPIC}/+/response`, { qos: 1 });
    const runnerSubscribed = new Promise((resolve) => {
      broker.aedes.once('subscribe', resolve);
    });
    app = await startRunner(broker.url);
    cleanups.push(() => app.close());
    await runnerSubscribed;
  });

  afterEach(async () => {
    for (const cleanup of cleanups.splice(0).reverse()) {
      await cleanup();
    }
    jest.restoreAllMocks();
  });

  queryTypes.forEach((key) => {
    const query = queriesJSON[key];
    it(`replies to execute and status for the ${key} command`, async () => {
      expect(await request(client, 'execute', query.reqBody)).toEqual(
        query.resBody.POST,
      );
      expect(await request(client, 'status')).toEqual(query.resBody.GET);
    });
  });

  it('replies with the command history', async () => {
    expect(await request(client, 'history')).toEqual([]);
    await request(client, 'execute', { name: 'create' });
    await request(client, 'execute', { name: 'configure' });
    expect(await request(client, 'history')).toEqual([
      { name: 'create' },
      { name: 'configure' },
    ]);
  });

  it('serves HTTP and MQTT from the same command queue', async () => {
    await request(client, 'execute', { name: 'create' });
    await supertest(app.getHttpServer())
      .get('/history')
      .expect(200, [{ name: 'create' }]);
  });
});
