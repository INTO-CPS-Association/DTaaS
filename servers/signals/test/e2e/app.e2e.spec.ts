import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import AppModule from 'src/app.module';
import Config from 'src/config/config.service';
import { configureSignalsApp } from 'src/main';

describe('Signals gateway skeleton', () => {
  let app: NestExpressApplication;
  let base = '';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>({
      bodyParser: false,
      logger: false,
    });
    configureSignalsApp(app, moduleRef.get(Config));
    await app.listen(0, '127.0.0.1');
    base = await app.getUrl();
  });

  afterAll(async () => {
    await app.close();
  });

  it('answers the health check', async () => {
    const response = await fetch(`${base}/signals/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
    expect(response.headers.get('x-powered-by')).toBeNull();
  });

  it.each(['stream', 'range'])(
    'answers 501 on the placeholder %s route',
    async (route) => {
      const response = await fetch(`${base}/signals/${route}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths: [] }),
      });
      expect(response.status).toBe(501);
      expect(await response.json()).toEqual({
        status: 'not-implemented',
        route,
      });
    },
  );

  it('refuses a body above the payload limit', async () => {
    const response = await fetch(`${base}/signals/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ padding: 'x'.repeat(70 * 1024) }),
    });
    expect(response.status).toBe(413);
  });
});
