import { describe, expect, it } from '@jest/globals';
import { notifyConfigSchema } from 'src/notify/notify.config';

const url = 'https://manager.example.org/dt-events';

describe('Webhook configuration', () => {
  it.each([
    { url },
    { url, token: 'secret' },
    { url: 'http://localhost:8080' },
  ])('Should accept %p', (config) => {
    expect(notifyConfigSchema.parse(config)).toEqual(config);
  });

  it.each([
    { url: 'manager.example.org' },
    { url: 'mqtt://localhost:1883' },
    { url, secret: 'token' },
    {},
  ])('Should reject %p', (config) => {
    expect(notifyConfigSchema.safeParse(config).success).toBe(false);
  });
});
