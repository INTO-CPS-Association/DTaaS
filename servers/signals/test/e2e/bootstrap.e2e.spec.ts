import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { createServer } from 'node:net';
import { bootstrap } from 'src/main';

// The configuration refuses port 0, so the test asks the system for a free
// port first and gives it to the service as SIGNALS_PORT.
function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

describe('bootstrap', () => {
  const original = { ...process.env };
  let app: NestExpressApplication;
  let port = 0;

  beforeAll(async () => {
    port = await freePort();
    process.env.SIGNALS_PORT = String(port);
    process.env.SIGNALS_HOSTNAME = '127.0.0.1';
    app = await bootstrap();
  });

  afterAll(async () => {
    await app.close();
    process.env = original;
  });

  it('starts the service on the configured port and hostname', async () => {
    const response = await fetch(`http://127.0.0.1:${port}/signals/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
    expect(response.headers.get('x-powered-by')).toBeNull();
  });
});
