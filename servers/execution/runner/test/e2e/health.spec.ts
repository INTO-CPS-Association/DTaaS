import { afterEach, describe, expect, it } from '@jest/globals';
import { HttpStatus, INestApplication } from '@nestjs/common';
import supertest from 'supertest';
import { startRunner } from './mqtt.util';

async function health(app: INestApplication) {
  const { body } = await supertest(app.getHttpServer())
    .get('/health')
    .expect(HttpStatus.OK);
  expect(Number.isInteger(body.uptime)).toBe(true);
  return body;
}

describe('Runner health end-to-end tests', () => {
  let app: INestApplication;

  afterEach(async () => {
    await app.close();
  });

  it('Should report a runner without MQTT as ok', async () => {
    app = await startRunner();
    expect(await health(app)).toEqual(
      expect.objectContaining({
        status: 'ok',
        mqtt: 'disabled',
        database: 'memory',
        scripts: null,
      }),
    );
  });

  it('Should report a runner without its broker as degraded', async () => {
    // nothing listens on port 1, so the client keeps reconnecting
    app = await startRunner({
      url: 'mqtt://127.0.0.1:1',
      topic: 'dtaas/test/runner',
      protocolVersion: 4,
    });
    expect(await health(app)).toEqual(
      expect.objectContaining({ status: 'degraded', mqtt: 'disconnected' }),
    );
  });
});
