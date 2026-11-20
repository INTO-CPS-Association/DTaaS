import { describe, expect, it, jest } from '@jest/globals';
import { message, mqttConfig, packet, setup } from './mqtt.fixture';

const PRESENCE = 'dtaas/hospital-2/notify/presence';

const notice = Buffer.from('{"kind":"presence"}');

describe('MQTT service following topics', () => {
  it('Should subscribe a followed topic and hand its messages to the listener', async () => {
    const { client, handle, service } = setup(mqttConfig);
    const listener = jest.fn();
    service.start();

    service.follow(PRESENCE, listener);
    await message(client, PRESENCE, notice, { ...packet(), retain: true });

    expect(client.subscribe).toHaveBeenLastCalledWith(
      PRESENCE,
      { qos: 1 },
      expect.any(Function),
    );
    expect(listener).toHaveBeenCalledWith(notice);
    expect(handle).not.toHaveBeenCalled();
    expect(client.publishAsync).not.toHaveBeenCalled();
  });

  it('Should unsubscribe an unfollowed topic and ignore its messages', async () => {
    const { client, handle, service } = setup(mqttConfig);
    const listener = jest.fn();
    service.start();
    service.follow(PRESENCE, listener);

    service.unfollow(PRESENCE);
    await message(client, PRESENCE, notice, packet());

    expect(client.unsubscribe).toHaveBeenCalledWith(PRESENCE);
    expect(listener).not.toHaveBeenCalled();
    expect(handle).not.toHaveBeenCalled();
  });

  it('Should subscribe the topics followed before the start', () => {
    const { client, service } = setup(mqttConfig);
    service.follow(PRESENCE, jest.fn());
    service.follow('dtaas/hospital-3/notify/state', jest.fn());

    service.start();

    expect(client.subscribe).toHaveBeenCalledTimes(1);
    expect(client.subscribe.mock.calls[0][0]).toEqual(
      expect.arrayContaining([
        'dtaas/runner/execute',
        PRESENCE,
        'dtaas/hospital-3/notify/state',
      ]),
    );
  });

  it('Should neither connect nor subscribe without MQTT', () => {
    const { client, connect, service } = setup(undefined);
    service.follow(PRESENCE, jest.fn());
    service.unfollow(PRESENCE);

    service.start();

    expect(connect).not.toHaveBeenCalled();
    expect(client.subscribe).not.toHaveBeenCalled();
    expect(client.unsubscribe).not.toHaveBeenCalled();
  });
});
