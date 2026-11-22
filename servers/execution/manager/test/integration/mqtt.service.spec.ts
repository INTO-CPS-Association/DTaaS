import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { randomUUID } from 'node:crypto';
import { HttpStatus, INestApplication, Logger } from '@nestjs/common';
import type { MqttClient } from 'mqtt';
import { Subject } from 'rxjs';
import supertest from 'supertest';
import { DigitalTwinNotFoundError } from 'src/digital-twins/digital-twins.errors.js';
import type { ExecutionRecord } from 'src/digital-twins/interfaces/execution-record.interface.js';
import { createFakeDigitalTwinsService } from '../support/fake-digital-twins-service.js';
import {
  type Broker,
  connectClient,
  nextMessage,
  startBroker,
  subscribed,
} from '../support/mqtt.js';
import { createTestApp } from '../support/test-app.js';

jest.setTimeout(20000);

const changes = new Subject<ExecutionRecord>();
const fakeService = createFakeDigitalTwinsService(changes);

const prefix = `test/${randomUUID()}`;
const base = `${prefix}/user1`;
const requestFilter = `${base}/requests/+`;
const listResponses = `${base}/responses/list-digital-twins`;

describe('MQTT service against an in-process broker', () => {
  let broker: Broker;
  let app: INestApplication;
  let client: MqttClient;

  beforeAll(async () => {
    broker = await startBroker();
    const serviceSubscribed = subscribed(broker, requestFilter);
    app = await createTestApp(fakeService, {
      url: broker.url,
      baseTopic: base,
    });
    await serviceSubscribed;
    client = await connectClient(broker.url);
  });

  afterAll(async () => {
    await client.endAsync(true);
    await app.close();
    await broker.stop();
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  async function request(operation: string, payload: object): Promise<void> {
    await client.publishAsync(
      `${base}/requests/${operation}`,
      JSON.stringify(payload),
      { qos: 1 },
    );
  }

  it('answers a request on the default response topic with its correlation ID', async () => {
    fakeService.listDigitalTwins.mockResolvedValue([
      { name: 'hello-world', description: 'Says hello' },
    ]);
    const response = nextMessage(client, listResponses);

    await request('list-digital-twins', { correlationId: 'c-1' });

    expect(await response).toEqual({
      body: {
        correlationId: 'c-1',
        ok: true,
        data: [{ name: 'hello-world', description: 'Says hello' }],
      },
      qos: 0,
      retain: false,
    });
  });

  it('answers on the response topic the request names', async () => {
    fakeService.listExecutions.mockResolvedValue([]);
    const replies = `${base}/responses/${randomUUID()}`;
    const response = nextMessage(client, replies);

    await request('list-executions', {
      correlationId: 'c-2',
      dtName: 'hello-world',
      responseTopic: replies,
    });

    expect((await response).body).toEqual({
      correlationId: 'c-2',
      ok: true,
      data: [],
    });
    expect(fakeService.listExecutions).toHaveBeenCalledWith('hello-world');
  });

  it('reports an error with its code and message', async () => {
    fakeService.getDigitalTwin.mockRejectedValue(
      new DigitalTwinNotFoundError('nope'),
    );
    const response = nextMessage(client, `${base}/responses/get-digital-twin`);

    await request('get-digital-twin', { correlationId: 'c-3', dtName: 'nope' });

    expect((await response).body).toEqual({
      correlationId: 'c-3',
      ok: false,
      error: { code: 'not-found', message: 'Digital twin nope not found' },
    });
  });

  it('answers a response topic with a wildcard on the default topic and stays connected', async () => {
    const rejected = nextMessage(client, listResponses);

    await request('list-digital-twins', {
      correlationId: 'c-4',
      responseTopic: `${base}/responses/#`,
    });

    expect((await rejected).body).toMatchObject({
      correlationId: 'c-4',
      ok: false,
      error: { code: 'bad-request' },
    });
    fakeService.listDigitalTwins.mockResolvedValue([]);
    const answered = nextMessage(client, listResponses);
    await request('list-digital-twins', { correlationId: 'c-5' });
    expect((await answered).body).toEqual({
      correlationId: 'c-5',
      ok: true,
      data: [],
    });
  });

  it('comes back after the broker refuses the response topic of a request', async () => {
    // A valid topic name with more levels than the broker accepts. The broker
    // closes the connection of a client that publishes to it.
    const levels = Array.from({ length: 150 }, () => 'a').join('/');
    const refused = `${base}/responses/${levels}`;
    fakeService.listDigitalTwins.mockResolvedValue([]);
    const resubscribed = subscribed(broker, requestFilter);

    await request('list-digital-twins', {
      correlationId: 'c-6',
      responseTopic: refused,
    });
    await resubscribed;

    const answered = nextMessage(client, listResponses);
    await request('list-digital-twins', { correlationId: 'c-7' });
    expect((await answered).body).toEqual({
      correlationId: 'c-7',
      ok: true,
      data: [],
    });
  });

  it('publishes every execution change as an event at QoS 1, not retained', async () => {
    const record: ExecutionRecord = {
      id: 'e-1',
      dtName: 'hello-world',
      pipelineId: 42,
      timestamp: 1700000000000,
      status: 'completed',
      jobLogs: [{ jobName: 'execute', log: 'done' }],
    };
    const event = nextMessage(
      client,
      `${base}/digital-twins/hello-world/executions/e-1`,
    );

    changes.next(record);

    expect(await event).toEqual({ body: record, qos: 1, retain: false });
  });

  it('keeps the REST API working while the broker is down and answers again when it is back', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn');
    const { port } = broker;
    await client.endAsync(true);
    await broker.stop();

    await supertest(app.getHttpServer())
      .get('/execution-manager/health')
      .expect(HttpStatus.OK);
    // Long enough for the service to try the broker more than once.
    await new Promise((resolve) => {
      setTimeout(resolve, 2500);
    });
    const outageWarnings = warn.mock.calls.filter(([message]) =>
      String(message).includes('is unreachable'),
    );
    expect(outageWarnings).toHaveLength(1);

    broker = await startBroker(port);
    await subscribed(broker, requestFilter);
    client = await connectClient(broker.url);
    fakeService.listDigitalTwins.mockResolvedValue([]);
    const answered = nextMessage(client, listResponses);
    await request('list-digital-twins', { correlationId: 'c-8' });
    expect((await answered).body).toEqual({
      correlationId: 'c-8',
      ok: true,
      data: [],
    });
  });
});
