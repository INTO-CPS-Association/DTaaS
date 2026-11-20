import { describe, expect, it, jest } from '@jest/globals';
import { NotificationDto } from 'src/dto/notify.dto';
import { mqttConfig, setup } from './mqtt.fixture';

const notification: NotificationDto = {
  kind: 'state',
  id: 'hospital-1',
  time: '2026-10-25T10:00:00.000Z',
  data: {},
};

describe('MQTT service notifications', () => {
  it.each([true, false])(
    'Should publish with QoS 1 under the base topic, retained: %p',
    async (retain) => {
      const { client, service } = setup(mqttConfig);
      service.start();

      await service.notify('state', notification, retain);

      expect(client.publishAsync).toHaveBeenCalledWith(
        'dtaas/runner/notify/state',
        JSON.stringify(notification),
        { qos: 1, retain },
      );
    },
  );

  it('Should publish nothing without MQTT or before it starts', async () => {
    const disabled = setup(undefined);
    disabled.service.start();
    const unstarted = setup(mqttConfig);

    await disabled.service.notify('state', notification, true);
    await unstarted.service.notify('state', notification, true);

    expect(disabled.client.publishAsync).not.toHaveBeenCalled();
    expect(unstarted.client.publishAsync).not.toHaveBeenCalled();
  });

  it('Should log a failed notification', async () => {
    const { client, service } = setup(mqttConfig);
    service.start();
    client.publishAsync.mockRejectedValueOnce(
      new Error('client disconnecting'),
    );
    const error = jest
      .spyOn(service['logger'], 'error')
      .mockImplementation(() => undefined);

    await service.notify('escalation', notification, false);

    expect(error).toHaveBeenCalledWith(
      'MQTT notification on dtaas/runner/notify/escalation failed: Error: client disconnecting',
    );
  });
});
