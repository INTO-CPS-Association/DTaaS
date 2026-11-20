import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { Logger } from '@nestjs/common';
import { offlineNotification } from 'src/dto/notify.dto';
import { mqttConfig, setup } from './mqtt.fixture';

const NOW = new Date('2026-10-25T10:00:00.000Z');

const WARNING =
  'The MQTT broker did not confirm the leave, so it may publish the will';

// A started service, with its warnings recorded
function started() {
  const { client, service } = setup(mqttConfig);
  service.start();
  const warn = jest
    .spyOn(Logger.prototype, 'warn')
    .mockImplementation(() => undefined);
  return { client, service, warn };
}

const never = () => new Promise<undefined>(() => undefined);

describe('MQTT service presence', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('Should call the connect listeners on each connection', () => {
    const { client, service } = started();
    const listener = jest.fn();
    service.onConnect(listener);

    client.emit('connect');
    client.emit('connect');

    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('Should call a listener at once if the client is connected', () => {
    const { client, service } = started();
    const early = jest.fn();
    service.onConnect(early);
    client.connected = true;
    const late = jest.fn();
    service.onConnect(late);

    expect([early.mock.calls.length, late.mock.calls.length]).toEqual([0, 1]);
  });

  it('Should leave with a retained offline notice and a graceful end', async () => {
    jest.useFakeTimers({ now: NOW });
    const { client, service, warn } = started();

    await service.beforeApplicationShutdown();

    expect(client.publishAsync).toHaveBeenCalledWith(
      'dtaas/runner/notify/presence',
      JSON.stringify(offlineNotification('hospital-1', NOW.toISOString())),
      { qos: 1, retain: true },
    );
    expect(client.endAsync).toHaveBeenCalledTimes(1);
    expect(client.endAsync).toHaveBeenCalledWith();
    expect(client.publishAsync.mock.invocationCallOrder[0]).toBeLessThan(
      client.endAsync.mock.invocationCallOrder[0],
    );
    expect(client.stream.destroy).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it('Should leave nothing without MQTT', async () => {
    const { client, service } = setup(undefined);
    service.start();

    await service.beforeApplicationShutdown();

    expect(client.publishAsync).not.toHaveBeenCalled();
    expect(client.endAsync).not.toHaveBeenCalled();
  });

  it('Should force the end if the notice is not acknowledged in 2 s', async () => {
    jest.useFakeTimers();
    const { client, service, warn } = started();
    client.publishAsync.mockReturnValueOnce(never());

    const shutdown = service.beforeApplicationShutdown();
    await jest.advanceTimersByTimeAsync(1999);
    expect(client.endAsync).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1);
    await shutdown;

    expect(client.endAsync).toHaveBeenCalledTimes(1);
    expect(client.endAsync).toHaveBeenCalledWith(true);
    expect(warn).toHaveBeenCalledWith(WARNING);
  });

  it('Should destroy the socket if the end does not finish in 2 s', async () => {
    jest.useFakeTimers();
    const { client, service, warn } = started();
    client.endAsync.mockReturnValueOnce(never());

    const shutdown = service.beforeApplicationShutdown();
    await jest.advanceTimersByTimeAsync(1999);
    expect(client.stream.destroy).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1);
    await shutdown;

    expect(client.stream.destroy).toHaveBeenCalledTimes(1);
    expect(client.endAsync).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(WARNING);
    expect(service.status()).toBe('disconnected');
  });
});
