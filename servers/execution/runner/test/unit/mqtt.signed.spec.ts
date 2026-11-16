import { generateKeyPairSync } from 'node:crypto';
import { describe, expect, it } from '@jest/globals';
import Signer from 'src/auth/signer';
import { NotificationDto, offlineNotification } from 'src/dto/notify.dto';
import { verifiedPayload } from 'test/sign.util';
import { message, mqttConfig, packet, setup } from './mqtt.fixture';

const { privateKey, publicKey } = generateKeyPairSync('ed25519');

const signer = new Signer(privateKey, 'dt-1');

const notification: NotificationDto = {
  kind: 'state',
  id: 'dt-1',
  time: '2026-10-25T10:00:00.000Z',
  data: {},
};

// The payload of a JWS that the signer's key signed, as the runner's
// own parseJws and verifyJws read it
const verified = (text: unknown) =>
  verifiedPayload(String(text), publicKey, 'dt-1');

describe('MQTT service with a signing key', () => {
  it('Should connect with a signed will', () => {
    const { connect, service } = setup(mqttConfig, undefined, signer);
    service.start();
    const { will } = connect.mock.calls[0][1];

    expect(verified(will?.payload)).toEqual(
      offlineNotification('hospital-1', null),
    );
    expect(will?.payload).toBe(
      signer.encode(offlineNotification('hospital-1', null)),
    );
  });

  it('Should publish a signed response', async () => {
    const { client, service } = setup(mqttConfig, undefined, signer);
    service.start();

    await message(client, 'dtaas/runner/status', Buffer.alloc(0), packet());

    const [, payload] = client.publishAsync.mock.calls[0];
    expect(verified(payload)).toEqual({ status: 'success' });
    expect(payload).toBe(signer.encode({ status: 'success' }));
  });

  it('Should publish a signed notification', async () => {
    const { client, service } = setup(mqttConfig, undefined, signer);
    service.start();

    await service.notify('state', notification, true);

    expect(client.publishAsync).toHaveBeenCalledWith(
      'dtaas/runner/notify/state',
      signer.encode(notification),
      { qos: 1, retain: true },
    );
    expect(verified(client.publishAsync.mock.calls[0][1])).toEqual(
      notification,
    );
  });
});
