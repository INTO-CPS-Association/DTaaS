import { EventEmitter } from 'node:events';
import { describe, expect, it, jest } from '@jest/globals';
import type { IPublishPacket, MqttClient } from 'mqtt';
import Config from 'src/config/configuration.service';
import MqttRequestHandler from 'src/mqtt/mqtt-request.handler';
import MqttService, { MqttConnect } from 'src/mqtt/mqtt.service';
import { MqttConfig } from 'src/mqtt/mqtt.config';

class FakeClient extends EventEmitter {
  subscribe = jest.fn();

  publishAsync = jest.fn(
    async (_topic: string, _message: string, _options: unknown) => undefined,
  );

  endAsync = jest.fn(async () => undefined);
}

const mqttConfig: MqttConfig = {
  url: 'mqtt://localhost:1883',
  topic: 'dtaas/runner',
  username: 'user',
  password: 'secret',
  protocolVersion: 5,
};

function setup(options: MqttConfig | undefined) {
  const client = new FakeClient();
  const connect = jest.fn<MqttConnect>(() => client as unknown as MqttClient);
  const config = { getMqtt: () => options } as unknown as Config;
  const handle = jest.fn(
    async (_route: string, _payload: Buffer): Promise<unknown> => ({
      status: 'success',
    }),
  );
  const handler = { handle } as unknown as MqttRequestHandler;
  const service = new MqttService(config, handler, connect);
  return { client, connect, handle, service };
}

const packet = (properties?: IPublishPacket['properties']) =>
  ({ properties }) as IPublishPacket;

// The service answers asynchronously, so wait for the reply to go out
const message = async (client: FakeClient, ...args: unknown[]) => {
  client.emit('message', ...args);
  await new Promise(setImmediate);
};

describe('MQTT service', () => {
  it('Should stay disconnected without an MQTT configuration', async () => {
    const { connect, service } = setup(undefined);
    service.start();
    expect(connect).not.toHaveBeenCalled();
    await expect(service.onApplicationShutdown()).resolves.toBeUndefined();
  });

  it('Should connect with the configured options and subscribe', () => {
    const { client, connect, service } = setup(mqttConfig);
    service.start();
    expect(connect).toHaveBeenCalledWith('mqtt://localhost:1883', {
      username: 'user',
      password: 'secret',
      protocolVersion: 5,
    });
    expect(client.subscribe).toHaveBeenCalledWith(
      ['dtaas/runner/execute', 'dtaas/runner/status', 'dtaas/runner/history'],
      { qos: 1 },
    );
  });

  it('Should reply on the default response topic', async () => {
    const { client, handle, service } = setup(mqttConfig);
    service.start();
    const payload = Buffer.from('{"name":"create"}');

    await message(client, 'dtaas/runner/execute', payload, packet());

    expect(handle).toHaveBeenCalledWith('execute', payload);
    expect(client.publishAsync).toHaveBeenCalledWith(
      'dtaas/runner/execute/response',
      '{"status":"success"}',
      { qos: 1 },
    );
  });

  it('Should reply on the MQTT 5 response topic with correlation data', async () => {
    const { client, service } = setup(mqttConfig);
    service.start();
    const correlationData = Buffer.from('42');

    await message(
      client,
      'dtaas/runner/status',
      Buffer.alloc(0),
      packet({ responseTopic: 'client/replies', correlationData }),
    );

    expect(client.publishAsync).toHaveBeenCalledWith(
      'client/replies',
      '{"status":"success"}',
      { qos: 1, properties: { correlationData } },
    );
  });

  it('Should ignore messages on other topics', async () => {
    const { client, handle, service } = setup(mqttConfig);
    service.start();
    await message(client, 'dtaas/runner/other', Buffer.alloc(0), packet());
    expect(handle).not.toHaveBeenCalled();
    expect(client.publishAsync).not.toHaveBeenCalled();
  });

  it('Should log a failed reply instead of crashing', async () => {
    const { client, service } = setup(mqttConfig);
    service.start();
    client.publishAsync.mockRejectedValueOnce(new Error('offline'));
    const log = jest
      .spyOn(service['logger'], 'error')
      .mockImplementation(() => undefined);

    await message(client, 'dtaas/runner/history', Buffer.alloc(0), packet());

    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('dtaas/runner/history failed'),
    );
  });

  it('Should log connection events and errors', () => {
    const { client, service } = setup(mqttConfig);
    service.start();
    const log = jest
      .spyOn(service['logger'], 'log')
      .mockImplementation(() => undefined);
    const error = jest
      .spyOn(service['logger'], 'error')
      .mockImplementation(() => undefined);

    client.emit('connect');
    client.emit('error', new Error('refused'));

    expect(log).toHaveBeenCalledWith(
      'Connected to MQTT broker at mqtt://localhost:1883',
    );
    expect(error).toHaveBeenCalledWith('MQTT error: refused');
  });

  it('Should ignore messages after shutdown', async () => {
    const { client, handle, service } = setup(mqttConfig);
    service.start();
    await service.onApplicationShutdown();

    await message(client, 'dtaas/runner/history', Buffer.alloc(0), packet());

    expect(client.endAsync).toHaveBeenCalled();
    expect(handle).not.toHaveBeenCalled();
  });
});
