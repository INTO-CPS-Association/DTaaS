import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { EventEmitter } from 'node:events';
import { Logger } from '@nestjs/common';
import type { MqttClient } from 'mqtt';
import { Subject } from 'rxjs';
import type { ExecutionRecord } from 'src/digital-twins/interfaces/execution-record.interface.js';
import MqttService, { type MqttConnect } from 'src/mqtt/mqtt.service.js';
import {
  type FakeDigitalTwinsService,
  createFakeDigitalTwinsService,
  execution,
} from '../../support/fake-digital-twins-service.js';

const settings = {
  url: 'mqtt://broker.example.org:1883',
  username: 'manager',
  password: 's3cret',
  baseTopic: 'dtaas/execution-manager/user1',
};
const base = settings.baseTopic;

class FakeClient extends EventEmitter {
  connected = false;

  readonly subscribe = jest.fn();

  readonly publishAsync = jest.fn<MqttClient['publishAsync']>(
    async () => undefined,
  );

  readonly endAsync = jest.fn<(force?: boolean) => Promise<void>>(
    async () => undefined,
  );

  async receive(topic: string, payload: object): Promise<void> {
    this.emit('message', topic, Buffer.from(JSON.stringify(payload)));
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
  }
}

describe('MqttService', () => {
  let client: FakeClient;
  let connect: jest.Mock<MqttConnect>;
  let changes: Subject<ExecutionRecord>;
  let operations: FakeDigitalTwinsService;
  let mqttService: MqttService;
  let warn: jest.SpiedFunction<Logger['warn']>;
  let log: jest.SpiedFunction<Logger['log']>;
  let error: jest.SpiedFunction<Logger['error']>;

  beforeEach(() => {
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    error = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    client = new FakeClient();
    connect = jest.fn<MqttConnect>(() => client as unknown as MqttClient);
    changes = new Subject<ExecutionRecord>();
    operations = createFakeDigitalTwinsService(changes);
    mqttService = new MqttService(settings, operations, connect);
    mqttService.onModuleInit();
  });

  afterEach(async () => {
    await mqttService.onModuleDestroy();
    jest.restoreAllMocks();
  });

  describe('the connection', () => {
    it('connects with the settings and keeps trying after a refused login', () => {
      expect(connect).toHaveBeenCalledWith('mqtt://broker.example.org:1883', {
        username: 'manager',
        password: 's3cret',
        reconnectPeriod: 1000,
        reconnectOnConnackError: true,
      });
    });

    it('subscribes to the request topics on every connect', () => {
      client.emit('connect');
      client.emit('connect');

      expect(client.subscribe).toHaveBeenCalledTimes(2);
      expect(client.subscribe).toHaveBeenLastCalledWith(
        `${base}/requests/+`,
        { qos: 1 },
        expect.any(Function),
      );
    });

    it('warns once while the broker is unreachable and says when it is back', () => {
      client.emit('error', new Error('connect ECONNREFUSED'));
      client.emit('offline');
      client.emit('error', new Error('connect ECONNREFUSED'));
      client.emit('error', new Error('connect ECONNREFUSED'));

      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith(
        'MQTT broker mqtt://broker.example.org:1883 is unreachable, retrying every second: connect ECONNREFUSED',
      );

      client.emit('connect');

      expect(log).toHaveBeenCalledWith(
        'Connected to MQTT broker mqtt://broker.example.org:1883',
      );

      client.emit('offline');

      expect(warn).toHaveBeenCalledTimes(2);
      expect(warn).toHaveBeenLastCalledWith(
        'MQTT broker mqtt://broker.example.org:1883 is unreachable, retrying every second: the connection closed',
      );
    });

    it('reports an error on a live connection', () => {
      client.connected = true;

      client.emit('error', new Error('unexpected packet'));

      expect(warn).toHaveBeenCalledWith(
        'MQTT broker mqtt://broker.example.org:1883: unexpected packet',
      );
    });

    it('connects with the credentials in the URL but keeps them out of the log', async () => {
      const url = 'mqtt://manager:s3cret@broker.example.org:1883';
      const otherClient = new FakeClient();
      const otherConnect = jest.fn<MqttConnect>(
        () => otherClient as unknown as MqttClient,
      );
      const other = new MqttService(
        { ...settings, url },
        operations,
        otherConnect,
      );
      other.onModuleInit();

      otherClient.emit('connect');
      otherClient.emit('offline');
      otherClient.connected = true;
      otherClient.emit('error', new Error('unexpected packet'));

      expect(otherConnect).toHaveBeenCalledWith(url, expect.any(Object));
      const logged = [...log.mock.calls, ...warn.mock.calls].flat().join('\n');
      expect(logged).toContain(
        'Connected to MQTT broker mqtt://broker.example.org:1883',
      );
      expect(logged).not.toContain('s3cret');
      await other.onModuleDestroy();
    });

    it('ends the connection and stops publishing on shutdown', async () => {
      await mqttService.onModuleDestroy();
      changes.next(execution);

      expect(client.endAsync).toHaveBeenCalledWith(true);
      expect(client.publishAsync).not.toHaveBeenCalled();
    });
  });

  describe('requests', () => {
    it('answers on the default response topic at QoS 0', async () => {
      operations.listDigitalTwins.mockResolvedValue([]);

      await client.receive(`${base}/requests/list-digital-twins`, {
        correlationId: 'c-1',
      });

      expect(client.publishAsync).toHaveBeenCalledWith(
        `${base}/responses/list-digital-twins`,
        JSON.stringify({ correlationId: 'c-1', ok: true, data: [] }),
        { qos: 0, retain: false },
      );
    });

    it('answers on the response topic the request names', async () => {
      operations.listDigitalTwins.mockResolvedValue([]);

      await client.receive(`${base}/requests/list-digital-twins`, {
        correlationId: 'c-2',
        responseTopic: `${base}/responses/clients/7`,
      });

      expect(client.publishAsync).toHaveBeenCalledWith(
        `${base}/responses/clients/7`,
        expect.any(String),
        { qos: 0, retain: false },
      );
    });

    it('answers an unknown operation on its own response topic', async () => {
      await client.receive(`${base}/requests/reboot`, { correlationId: 'c-3' });

      expect(client.publishAsync).toHaveBeenCalledWith(
        `${base}/responses/reboot`,
        expect.stringContaining('unknown-operation'),
        { qos: 0, retain: false },
      );
    });

    it('ignores a message outside the request topics', async () => {
      await client.receive(`${base}/responses/list-digital-twins`, {
        correlationId: 'c-4',
      });

      expect(client.publishAsync).not.toHaveBeenCalled();
    });

    it('logs the error behind an internal response', async () => {
      const failure = new Error('token leaked');
      operations.listDigitalTwins.mockRejectedValue(failure);

      await client.receive(`${base}/requests/list-digital-twins`, {
        correlationId: 'c-5',
      });

      expect(error).toHaveBeenCalledWith(
        'MQTT request list-digital-twins failed',
        failure.stack,
      );
      expect(client.publishAsync).toHaveBeenCalledWith(
        `${base}/responses/list-digital-twins`,
        expect.not.stringContaining('token leaked'),
        { qos: 0, retain: false },
      );
    });

    it('reports a response that could not be published', async () => {
      operations.listDigitalTwins.mockResolvedValue([]);
      client.publishAsync.mockRejectedValue(new Error('client disconnecting'));

      await client.receive(`${base}/requests/list-digital-twins`, {
        correlationId: 'c-6',
      });

      expect(warn).toHaveBeenCalledWith(
        `MQTT publish to ${base}/responses/list-digital-twins failed: client disconnecting`,
      );
    });
  });

  describe('events', () => {
    it('publishes every execution change at QoS 1, not retained', () => {
      changes.next(execution);

      expect(client.publishAsync).toHaveBeenCalledWith(
        `${base}/digital-twins/hello-world/executions/e-1`,
        JSON.stringify(execution),
        { qos: 1, retain: false },
      );
    });
  });
});
