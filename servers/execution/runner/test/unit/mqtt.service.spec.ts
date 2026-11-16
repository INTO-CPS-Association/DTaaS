import { describe, expect, it, jest } from '@jest/globals';
import type { IPublishPacket } from 'mqtt';
import { presenceWill } from 'src/mqtt/mqtt.config';
import { message, mqttConfig, packet, setup, unsigned } from './mqtt.fixture';

describe('MQTT service', () => {
  it('Should stay disconnected without an MQTT configuration', async () => {
    const { connect, service } = setup(undefined);
    service.start();
    expect(connect).not.toHaveBeenCalled();
    await expect(service.beforeApplicationShutdown()).resolves.toBeUndefined();
  });

  it('Should connect with the configured options and subscribe', () => {
    const { client, connect, service } = setup(mqttConfig);
    service.start();
    expect(connect).toHaveBeenCalledWith('mqtt://user:secret@localhost:1883', {
      username: 'user',
      password: 'secret',
      protocolVersion: 5,
      reconnectOnConnackError: true,
      will: presenceWill('dtaas/runner', 'hospital-1', unsigned),
    });
    expect(client.subscribe).toHaveBeenCalledWith(
      [
        'dtaas/runner/execute',
        'dtaas/runner/status',
        'dtaas/runner/history',
        'dtaas/runner/transition',
        'dtaas/runner/event',
        'dtaas/runner/fsm',
        'dtaas/runner/dt',
        'dtaas/runner/state',
        'dtaas/runner/health',
        'dtaas/runner/stop',
        'dtaas/runner/parameters',
        'dtaas/runner/set-parameters',
        'dtaas/runner/escalate',
        'dtaas/runner/metrics',
        'dtaas/runner/peers',
        'dtaas/runner/set-peers',
      ],
      { qos: 1 },
      expect.any(Function),
    );
  });

  it('Should log a refused subscription', () => {
    const { client, service } = setup(mqttConfig);
    service.start();
    const error = jest
      .spyOn(service['logger'], 'error')
      .mockImplementation(() => undefined);
    const callback = client.subscribe.mock.calls[0][2] as (
      error: Error | null,
    ) => void;

    callback(null);
    callback(new Error('Subscribe error: Not authorized'));

    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith(
      'MQTT subscription failed: Subscribe error: Not authorized',
    );
  });

  it('Should reply on the default response topic', async () => {
    const { client, handle, service } = setup(mqttConfig);
    service.start();
    const payload = Buffer.from('{"name":"create"}');

    await message(client, 'dtaas/runner/execute', payload, packet());

    expect(handle).toHaveBeenCalledWith('execute', {
      body: { name: 'create' },
      requestKey: undefined,
    });
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

  it.each(['dtaas/runner/execute', '', '#', 'client/+', '$SYS/replies'])(
    'Should reply on the default topic instead of %p',
    async (responseTopic) => {
      const { client, service } = setup(mqttConfig);
      service.start();

      await message(
        client,
        'dtaas/runner/status',
        Buffer.alloc(0),
        packet({ responseTopic }),
      );

      expect(client.publishAsync).toHaveBeenCalledWith(
        'dtaas/runner/status/response',
        '{"status":"success"}',
        { qos: 1 },
      );
    },
  );

  it.each([['key-1'], [['key-1', 'key-2']]])(
    'Should pass the request key of the user property %p on',
    async (value) => {
      const { client, handle, service } = setup(mqttConfig);
      service.start();
      const payload = Buffer.from('{"name":"create"}');

      await message(
        client,
        'dtaas/runner/execute',
        payload,
        packet({ userProperties: { 'idempotency-key': value } }),
      );

      expect(handle).toHaveBeenCalledWith('execute', {
        body: { name: 'create' },
        requestKey: 'key-1',
      });
    },
  );

  it('Should ignore a retained request', async () => {
    const { client, handle, service } = setup(mqttConfig);
    service.start();
    const warn = jest
      .spyOn(service['logger'], 'warn')
      .mockImplementation(() => undefined);
    const retained = { ...packet(), retain: true } as IPublishPacket;

    await message(client, 'dtaas/runner/execute', Buffer.from('{}'), retained);

    expect(handle).not.toHaveBeenCalled();
    expect(client.publishAsync).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      'Ignored a retained request on dtaas/runner/execute',
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
      expect.stringContaining('response on dtaas/runner/history failed'),
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

    client.emit('error', new Error('refused'));
    client.emit('error', new Error('refused'));
    client.emit('connect');
    client.emit('error', new Error('refused'));

    expect(log).toHaveBeenCalledWith(
      'Connected to MQTT broker at localhost:1883',
    );
    expect(error).toHaveBeenCalledTimes(2);
    expect(error).toHaveBeenCalledWith('MQTT error: refused');
  });

  it('Should report MQTT as disabled without an MQTT configuration', () => {
    const { service } = setup(undefined);
    service.start();
    expect(service.status()).toBe('disabled');
  });

  it('Should report whether the client is connected', async () => {
    const { client, service } = setup(mqttConfig);
    expect(service.status()).toBe('disconnected');
    service.start();
    expect(service.status()).toBe('disconnected');
    client.connected = true;
    expect(service.status()).toBe('connected');
    await service.beforeApplicationShutdown();
    expect(service.status()).toBe('disconnected');
  });
});
