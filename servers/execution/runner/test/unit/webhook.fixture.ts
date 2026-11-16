import { jest } from '@jest/globals';
import { Logger } from '@nestjs/common';
import Signer from 'src/auth/signer';
import Config from 'src/config/configuration.service';
import { NotificationDto } from 'src/dto/notify.dto';
import { NotifyConfig } from 'src/notify/notify.config';
import WebhookClient from 'src/notify/webhook.client';

export const notification: NotificationDto = {
  kind: 'state',
  id: 'hospital-1',
  time: '2026-10-25T10:00:00.000Z',
  data: { id: 'hospital-1' },
};

export const webhook: NotifyConfig = {
  url: 'https://user:password@manager.example.org/dt-events',
  token: 'secret',
};

export const FAILURE =
  'Webhook notification to manager.example.org failed: TypeError: fetch failed';

export const answer = (status: number) =>
  new Response(status === 204 ? null : 'body', { status });

export const networkError = () => new TypeError('fetch failed');

// A webhook client of the configuration and signer, with its errors
// recorded
export function setup(
  config: NotifyConfig | null = webhook,
  signer = new Signer(undefined, 'hospital-1'),
) {
  const client = new WebhookClient({
    getNotify: () => config ?? undefined,
    getSigner: () => signer,
  } as unknown as Config);
  const error = jest
    .spyOn(Logger.prototype, 'error')
    .mockImplementation(() => undefined);
  return { client, error };
}
