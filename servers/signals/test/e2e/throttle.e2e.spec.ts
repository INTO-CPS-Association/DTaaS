import { afterEach, describe, expect, it } from '@jest/globals';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import AppModule from 'src/app.module';
import Config from 'src/config/config.service';
import { configureSignalsApp } from 'src/main';
import { getClientTracker } from 'src/socket-address-throttler.guard';

async function appWith(trustedProxies: string[]) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'signals-throttle-'));
  const file = path.join(dir, 'signals.yaml');
  await writeFile(
    file,
    `throttle-limit: 2\ntrusted-proxies: ${JSON.stringify(trustedProxies)}\n`,
  );
  process.env.SIGNALS_CONFIG_PATH = file;
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({
    bodyParser: false,
    logger: false,
  });
  configureSignalsApp(app, moduleRef.get(Config));
  await app.listen(0, '127.0.0.1');
  const base = await app.getUrl();
  const post = (forwardedFor: string) =>
    fetch(`${base}/signals/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': forwardedFor,
      },
      body: '{"paths":["a/b"]}',
    });
  const close = async () => {
    await app.close();
    delete process.env.SIGNALS_CONFIG_PATH;
    await rm(dir, { recursive: true, force: true });
  };
  return { post, close };
}

// Each test starts a whole Nest app, which can take longer than Jest's 5 s
// default on a loaded machine or runner.
const APP_TEST_TIMEOUT = 30_000;

describe('The rate limit behind a proxy', () => {
  let close = async () => undefined as void;

  afterEach(async () => {
    await close();
  });

  it(
    'counts each client a trusted proxy forwards',
    async () => {
      const app = await appWith(['127.0.0.1']);
      close = app.close;
      expect((await app.post('203.0.113.1')).status).toBe(401);
      expect((await app.post('203.0.113.1')).status).toBe(401);
      expect((await app.post('203.0.113.1')).status).toBe(429);
      expect((await app.post('203.0.113.2')).status).toBe(401);
    },
    APP_TEST_TIMEOUT,
  );

  it(
    'ignores a forwarded address from a peer that is not a trusted proxy',
    async () => {
      const app = await appWith([]);
      close = app.close;
      await app.post('203.0.113.1');
      await app.post('203.0.113.2');
      expect((await app.post('203.0.113.3')).status).toBe(429);
    },
    APP_TEST_TIMEOUT,
  );
});

describe('getClientTracker', () => {
  it('falls back to the socket address, then to a fixed key', () => {
    expect(getClientTracker({ socket: { remoteAddress: '10.0.0.1' } })).toBe(
      '10.0.0.1',
    );
    expect(getClientTracker({})).toBe('unknown');
  });
});
