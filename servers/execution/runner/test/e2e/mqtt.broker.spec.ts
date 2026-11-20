import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
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
import supertest from 'supertest';
import { connectAsync, IClientPublishOptions, MqttClient } from 'mqtt';
import { commandNames, MEASURED } from 'test/utils';
import Config from 'src/config/configuration.service';
import FsmService from 'src/fsm/fsm.service';
import {
  lateSubscriber,
  nextNotification,
  nextReply,
  Reply,
  startRunner,
} from './mqtt.util';

// Runs only against a real broker, for example
// MQTT_BROKER_URL=mqtt://test.mosquitto.org:1883 yarn test:broker
const BROKER_URL = process.env.MQTT_BROKER_URL;
const describeBroker = BROKER_URL === undefined ? describe.skip : describe;
const url = BROKER_URL ?? '';
// the url may hold credentials, so name only its host
const host = BROKER_URL === undefined ? '' : new URL(BROKER_URL).host;

// Unique topics keep runs apart on a shared public broker
const BASE = `dtaas/test/${randomUUID()}`;
const TOPIC = `${BASE}/runner`;
const REPLIES = `${BASE}/client`;
const STATE = `${TOPIC}/notify/state`;
const PRESENCE = `${TOPIC}/notify/presence`;

jest.setTimeout(30000);

describeBroker(`Runner MQTT 5 end-to-end tests on ${host}`, () => {
  let client: MqttClient;
  let app: INestApplication | undefined;

  // MQTT 5 request with a response topic and correlation data
  async function request(
    route: string,
    body: unknown,
    properties: IClientPublishOptions['properties'] = {},
  ): Promise<Reply> {
    const correlationData = Buffer.from(randomUUID());
    const reply = nextReply(
      client,
      `${REPLIES}/${route}`,
      correlationData.toString(),
    );
    await client.publishAsync(`${TOPIC}/${route}`, JSON.stringify(body), {
      qos: 1,
      properties: {
        responseTopic: `${REPLIES}/${route}`,
        correlationData,
        ...properties,
      },
    });
    const response = await reply;
    expect(response.correlationData).toEqual(correlationData.toString());
    return response;
  }

  // The runner subscribes some time after it starts, so ask for its
  // status until it answers
  async function startConnectedRunner(): Promise<INestApplication> {
    const runner = await startRunner({ url, topic: TOPIC, protocolVersion: 5 });
    const ready = nextReply(client, `${REPLIES}/ready`);
    const ping = setInterval(() => {
      client.publish(`${TOPIC}/status`, '', {
        qos: 1,
        properties: { responseTopic: `${REPLIES}/ready` },
      });
    }, 500);
    try {
      await ready;
    } finally {
      clearInterval(ping);
    }
    return runner;
  }

  const history = () => {
    if (app === undefined) {
      throw new Error('The runner is not running');
    }
    return supertest(app.getHttpServer()).get('/history');
  };

  // Gives the running runner a state machine of one state, create
  const loadMachine = (dir: string): INestApplication => {
    if (app === undefined) {
      throw new Error('The runner is not running');
    }
    const file = join(dir, 'machine.yaml');
    writeFileSync(file, 'states: {create: {}}');
    jest.spyOn(app.get(Config), 'getStateMachine').mockReturnValue(file);
    app.get(FsmService).load();
    return app;
  };

  beforeEach(async () => {
    client = await connectAsync(url, { protocolVersion: 5 });
    await client.subscribeAsync(`${REPLIES}/#`, { qos: 1 });
    app = await startConnectedRunner();
  });

  afterEach(async () => {
    await app?.close();
    app = undefined;
    // an empty retained message deletes the state and presence that the
    // runner left
    await Promise.all(
      [STATE, PRESENCE].map((topic) =>
        client.publishAsync(topic, '', { qos: 1, retain: true }),
      ),
    );
    await client.endAsync();
    jest.restoreAllMocks();
  });

  it('replies on the response topic with the correlation data', async () => {
    const reply = await request('execute', { name: 'create' });
    const logs = { stdout: 'hello world', stderr: '' };
    const figures = { exitCode: 0, resources: MEASURED };
    const success = { status: 'success', result: { ...figures, ...logs } };
    expect(reply.body).toEqual(success);

    const status = await request('status', {});
    expect(status.body).toEqual({
      name: 'create',
      status: 'valid',
      logs,
      ...figures,
    });
  });

  it('replies with the validation error of the HTTP API', async () => {
    const reply = await request('execute', { command: 'create' });
    expect(reply.body).toEqual({
      message: 'Validation Failed',
      error: 'Bad Request',
      statusCode: 400,
    });
  });

  it('runs a request with a repeated idempotency key once', async () => {
    const key = { userProperties: { 'idempotency-key': randomUUID() } };
    const first = await request('execute', { name: 'create' }, key);
    const repeat = await request('execute', { name: 'create' }, key);

    expect(repeat.body).toEqual(first.body);
    expect(commandNames((await history().expect(200)).body)).toEqual([
      'create',
    ]);
  });

  it('replies to an MQTT 3.1.1 client on the default response topic', async () => {
    const legacy = await connectAsync(url, { protocolVersion: 4 });
    try {
      await legacy.subscribeAsync(`${TOPIC}/history/response`, { qos: 1 });
      const reply = nextReply(legacy, `${TOPIC}/history/response`);
      await legacy.publishAsync(`${TOPIC}/history`, '', { qos: 1 });
      expect((await reply).body).toEqual([]);
    } finally {
      await legacy.endAsync();
    }
  });

  it('ignores a retained request when it connects again', async () => {
    await app?.close();
    app = undefined;
    const retained = { qos: 1, retain: true } as const;
    // a name of its own, so that the request below can not join its run
    await client.publishAsync(
      `${TOPIC}/execute`,
      '{"name":"retained"}',
      retained,
    );
    try {
      app = await startConnectedRunner();
      // the broker hands over the retained request on subscription, so
      // before this request; only this one may run
      await request('execute', { name: 'create' });
      expect(commandNames((await history().expect(200)).body)).toEqual([
        'create',
      ]);
    } finally {
      // an empty retained message deletes the retained request
      await client.publishAsync(`${TOPIC}/execute`, '', retained);
    }
  });

  it('keeps the state after a transition for a later subscriber', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'runner-broker-'));
    try {
      const runner = loadMachine(dir);
      await client.subscribeAsync(STATE, { qos: 1 });
      const finished = nextNotification(
        client,
        STATE,
        ({ machine }) => machine?.status === 'valid',
      );
      await supertest(runner.getHttpServer())
        .post('/fsm/transition')
        .send({ state: 'create' });
      const notification = await finished;

      expect(await lateSubscriber(url, 5, STATE)).toEqual({
        ...notification,
        retain: true,
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('keeps the presence for a later subscriber, then the leave', async () => {
    const online = await lateSubscriber(url, 5, PRESENCE);
    await app?.close();
    app = undefined;
    const offline = await lateSubscriber(url, 5, PRESENCE);

    expect(online).toMatchObject({
      body: { kind: 'presence', id: 'test-runner', data: { online: true } },
      retain: true,
    });
    expect(offline).toEqual({
      body: {
        kind: 'presence',
        id: 'test-runner',
        time: expect.any(String),
        data: { online: false },
      },
      retain: true,
      raw: expect.any(String),
    });
  });
});
