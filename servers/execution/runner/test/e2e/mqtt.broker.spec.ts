import { randomUUID } from 'node:crypto';
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
import { nextReply, Reply, startRunner } from './mqtt.util';

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

  beforeEach(async () => {
    client = await connectAsync(url, { protocolVersion: 5 });
    await client.subscribeAsync(`${REPLIES}/#`, { qos: 1 });
    app = await startConnectedRunner();
  });

  afterEach(async () => {
    await app?.close();
    app = undefined;
    await client.endAsync();
    jest.restoreAllMocks();
  });

  it('replies on the response topic with the correlation data', async () => {
    const reply = await request('execute', { name: 'create' });
    expect(reply.body).toEqual({ status: 'success' });

    const status = await request('status', {});
    expect(status.body).toEqual({
      name: 'create',
      status: 'valid',
      logs: { stdout: 'hello world', stderr: '' },
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
    expect((await history().expect(200)).body).toEqual([{ name: 'create' }]);
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
      expect((await history().expect(200)).body).toEqual([{ name: 'create' }]);
    } finally {
      // an empty retained message deletes the retained request
      await client.publishAsync(`${TOPIC}/execute`, '', retained);
    }
  });
});
