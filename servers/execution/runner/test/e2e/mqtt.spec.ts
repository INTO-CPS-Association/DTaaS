import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import supertest from 'supertest';
import { connectAsync, MqttClient } from 'mqtt';
import { MqttRoute } from 'src/mqtt/mqtt.config';
import { commandNames, MEASURED } from 'test/utils';
import { queriesJSON } from './util';
import {
  lateSubscriber,
  nextNotification,
  startBroker,
  startRunner,
  stopBroker,
} from './mqtt.util';

const TOPIC = 'dtaas/test/runner';

// Publishes one request and resolves with the topic and parsed body
// of the reply
async function request(
  client: MqttClient,
  route: MqttRoute,
  body: unknown = {},
): Promise<{ topic: string; body: unknown }> {
  const reply = new Promise<{ topic: string; body: unknown }>((resolve) => {
    client.once('message', (topic, payload) => {
      resolve({ topic, body: JSON.parse(payload.toString()) });
    });
  });
  await client.publishAsync(`${TOPIC}/${route}`, JSON.stringify(body), {
    qos: 1,
  });
  return reply;
}

// Expects the reply on the default response topic of the route
async function expectReply(
  client: MqttClient,
  route: MqttRoute,
  body: unknown,
  expected: unknown,
): Promise<void> {
  expect(await request(client, route, body)).toEqual({
    topic: `${TOPIC}/${route}/response`,
    body: expected,
  });
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
  let url: string;
  // Undo only what started, so that a failed setup can not keep jest
  // from exiting
  const cleanups: Array<() => Promise<void>> = [];

  beforeEach(async () => {
    const broker = await startBroker();
    cleanups.push(() => stopBroker(broker));
    url = broker.url;
    client = await connectAsync(broker.url, { protocolVersion: 4 });
    cleanups.push(() => client.endAsync());
    await client.subscribeAsync(`${TOPIC}/+/response`, { qos: 1 });
    const runnerSubscribed = new Promise<void>((resolve) => {
      broker.aedes.on('subscribe', (subscriptions) => {
        if (subscriptions.some(({ topic }) => topic === `${TOPIC}/execute`)) {
          resolve();
        }
      });
    });
    // aedes supports MQTT 3.1.1 only
    app = await startRunner({
      url: broker.url,
      topic: TOPIC,
      protocolVersion: 4,
    });
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
      await expectReply(client, 'execute', query.reqBody, query.resBody.POST);
      await expectReply(client, 'status', {}, query.resBody.GET);
    });
  });

  it('replies to execute with the result of a script given input', () =>
    expectReply(
      client,
      'execute',
      { name: 'echo-input', input: { ward: 'B' } },
      {
        status: 'success',
        result: {
          exitCode: 0,
          stdout: expect.stringContaining('{"ward":"B"}'),
          stderr: '',
          resources: MEASURED,
        },
      },
    ));

  it('replies with the command history', async () => {
    await expectReply(client, 'history', {}, []);
    await request(client, 'execute', { name: 'create' });
    await request(client, 'execute', { name: 'configure' });
    await expectReply(client, 'history', {}, [
      expect.objectContaining({ id: 1, name: 'create', resources: MEASURED }),
      expect.objectContaining({ id: 2, name: 'configure', status: 'invalid' }),
    ]);
  });

  it('replies with the history that the payload asks for', async () => {
    await request(client, 'execute', { name: 'create' });
    await request(client, 'execute', { name: 'configure' });

    await expectReply(client, 'history', { limit: 1 }, [
      expect.objectContaining({ id: 2, name: 'configure', by: null }),
    ]);
    await expectReply(
      client,
      'history',
      { limit: 0 },
      { message: 'Validation Failed', error: 'Bad Request', statusCode: 400 },
    );
  });

  it('replies with the descriptor of the digital twin', async () => {
    const { body } = await supertest(app.getHttpServer()).get('/dt');

    await expectReply(client, 'dt', {}, body);
    expect(body).toEqual({
      id: 'test-runner',
      attributes: {},
      commands: ['create', 'loop', 'ignore-term', 'echo-input', 'fail', 'busy'],
      stateMachine: false,
      manager: { commands: [] },
      peers: [],
      publicKey: null,
    });
  });

  it('replies with the state document of GET /state', async () => {
    const { body } = await supertest(app.getHttpServer()).get('/state');

    await expectReply(
      client,
      'state',
      {},
      { ...body, time: expect.any(String) },
    );
    expect(body).toMatchObject({ id: 'test-runner', machine: null });
  });

  it('replies to stop with the stopped commands', () =>
    expectReply(client, 'stop', {}, { stopped: [] }));

  it('serves HTTP and MQTT from the same command queue', async () => {
    await request(client, 'execute', { name: 'create' });
    const { body } = await supertest(app.getHttpServer())
      .get('/history')
      .expect(200);
    expect(commandNames(body)).toEqual(['create']);
  });

  it('replies to the parameters routes as HTTP does', async () => {
    const { body } = await supertest(app.getHttpServer()).get('/parameters');
    const refused = await supertest(app.getHttpServer())
      .put('/parameters')
      .send({ scope: ['multi'] });

    await expectReply(client, 'parameters', {}, body);
    await expectReply(client, 'set-parameters', { scope: 'multi' }, body);
    await expectReply(
      client,
      'set-parameters',
      { scope: ['multi'] },
      refused.body,
    );
    expect([body, refused.status]).toEqual([
      { status: 'no state machine', state: null },
      400,
    ]);
  });

  it('keeps the last state document for a later subscriber', async () => {
    const topic = `${TOPIC}/notify/state`;
    await client.subscribeAsync(topic, { qos: 1 });
    const finished = nextNotification(
      client,
      topic,
      ({ command }) => command?.status === 'valid',
    );
    await supertest(app.getHttpServer()).post('/').send({ name: 'create' });
    const notification = await finished;

    expect(await lateSubscriber(url, 4, topic)).toEqual({
      ...notification,
      retain: true,
    });
    expect(notification.body).toMatchObject({
      kind: 'state',
      id: 'test-runner',
    });
  });
});
