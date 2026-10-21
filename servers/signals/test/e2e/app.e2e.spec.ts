import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import type { LoggerService } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import AppModule from 'src/app.module';
import { SIGNAL_BROKER } from 'src/broker/broker';
import Config from 'src/config/config.service';
import { configureSignalsApp } from 'src/main';
import FakeBroker from 'test/helpers/fake-broker';
import { openStream, waitFor } from 'test/helpers/sse-client';
import StubGitLab from 'test/helpers/stub-gitlab';
import { PUMP } from 'test/helpers/twins';

const ALICE_TOKEN = 'alice-oauth-token-0123456789';
const BOB_TOKEN = 'bob-oauth-token-9876543210';
const INFLUX_TOKEN = 'influx-read-token-abcdef';
const FLOW = 'alice/pump/flow';
const ENV_KEYS = [
  'SIGNALS_GITLAB_URL',
  'SIGNALS_INFLUX_URL',
  'SIGNALS_INFLUX_TOKENS_FILE',
];

const INFLUX_CSV =
  '#datatype,string,long,dateTime:RFC3339,double\n,result,table,_time,_value\n,,0,2026-10-01T00:00:00Z,4.5\n';

class CapturingLogger implements LoggerService {
  readonly lines: string[] = [];
  log = (message: unknown) => this.lines.push(String(message));
  error = (message: unknown) => this.lines.push(String(message));
  warn = (message: unknown) => this.lines.push(String(message));
  debug = (message: unknown) => this.lines.push(String(message));
  verbose = (message: unknown) => this.lines.push(String(message));
}

async function startInflux(): Promise<{ server: Server; url: string }> {
  const server = createServer((req, res) => {
    const ok = req.headers.authorization === `Token ${INFLUX_TOKEN}`;
    res.writeHead(ok ? 200 : 401, { 'Content-Type': 'text/csv' });
    res.end(ok ? INFLUX_CSV : '');
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    server,
    url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
  };
}

describe('Signals gateway e2e', () => {
  const gitlab = new StubGitLab(
    {
      [ALICE_TOKEN]: {
        id: 1,
        username: 'alice',
        email: 'alice@example.org',
        projects: [10],
      },
      [BOB_TOKEN]: {
        id: 2,
        username: 'bob',
        email: 'bob@example.org',
        projects: [],
      },
    },
    [{ id: 10, owner: 'alice', sha: 'c0ffee', twins: { pump: PUMP } }],
  );
  const broker = new FakeBroker();
  const logger = new CapturingLogger();
  let influx: { server: Server; url: string };
  let app: NestExpressApplication;
  let base = '';
  let tempDir = '';

  const post = (route: string, token: string | undefined, body: unknown) =>
    fetch(`${base}/signals/${route}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token === undefined ? {} : { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(body),
    });

  beforeAll(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'dtaas-signals-e2e-'));
    const tokensFile = path.join(tempDir, 'influx-tokens.json');
    await writeFile(tokensFile, JSON.stringify({ alice: INFLUX_TOKEN }));
    influx = await startInflux();
    process.env.SIGNALS_GITLAB_URL = await gitlab.start();
    process.env.SIGNALS_INFLUX_URL = influx.url;
    process.env.SIGNALS_INFLUX_TOKENS_FILE = tokensFile;
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(SIGNAL_BROKER)
      .useValue(broker)
      .compile();
    app = moduleRef.createNestApplication<NestExpressApplication>({
      bodyParser: false,
    });
    app.useLogger(logger);
    configureSignalsApp(app, moduleRef.get(Config));
    await app.listen(0, '127.0.0.1');
    base = await app.getUrl();
  });

  afterAll(async () => {
    await app.close();
    await gitlab.stop();
    await new Promise((resolve) => influx.server.close(resolve));
    ENV_KEYS.forEach((key) => delete process.env[key]);
    await rm(tempDir, { recursive: true, force: true });
  });

  it('answers health with no detail', async () => {
    const response = await fetch(`${base}/signals/health`);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'ok' });
    expect(response.headers.get('x-powered-by')).toBeNull();
  });

  it('refuses a request without a token or with an unknown one', async () => {
    expect((await post('stream', undefined, { paths: [FLOW] })).status).toBe(
      401,
    );
    expect(
      (await post('stream', 'not-a-token', { paths: [FLOW] })).status,
    ).toBe(401);
  });

  it('streams a sample to a member of the twin', async () => {
    const stream = await openStream(`${base}/signals/stream`, ALICE_TOKEN, [
      FLOW,
      'bob/secret',
    ]);
    expect(stream.status).toBe(200);
    const opening = await stream.readUntil('"state":"live"');
    expect(opening.startsWith('retry: 5000\n\n')).toBe(true);
    expect(opening).toContain('event: refused\ndata: {"paths":["bob/secret"]}');
    broker.publish('alice', 'alice.pump.flow', '{"value":3}');
    const text = await stream.readUntil('event: sample');
    expect(text).toContain('"path":"alice/pump/flow","channel":"measured"');
    expect(text).toContain('"payload":"{\\"value\\":3}"');
    stream.close();
    await waitFor(() => broker.bindings.length === 0);
  });

  it('refuses a non-member with 403 and binds nothing', async () => {
    const response = await post('stream', BOB_TOKEN, { paths: [FLOW] });
    expect(response.status).toBe(403);
    expect(broker.bindings).toHaveLength(0);
  });

  it('refuses wildcards with 400 and too many paths with 413', async () => {
    expect(
      (await post('stream', ALICE_TOKEN, { paths: ['alice/#'] })).status,
    ).toBe(400);
    const many = Array.from({ length: 201 }, (_, i) => `alice/${i}`);
    expect((await post('stream', ALICE_TOKEN, { paths: many })).status).toBe(
      413,
    );
  });

  it('serves the history of a member and refuses a non-member', async () => {
    const body = { paths: [FLOW], channel: 'measured', from: 0, to: 1000 };
    const response = await post('range', ALICE_TOKEN, body);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      samples: [
        {
          path: FLOW,
          channel: 'measured',
          ts: Date.parse('2026-10-01T00:00:00Z'),
          value: 4.5,
          quality: null,
        },
      ],
      truncated: false,
    });
    expect((await post('range', BOB_TOKEN, body)).status).toBe(403);
  });

  it('logs every decision and never a token', () => {
    const text = logger.lines.join('\n');
    expect(text).toContain(
      '"user":"alice","action":"stream","resource":"alice/pump/flow","decision":"allow"',
    );
    expect(text).toContain(
      '"user":"bob","action":"stream","resource":"alice/pump/flow","decision":"deny"',
    );
    [ALICE_TOKEN, BOB_TOKEN, INFLUX_TOKEN].forEach((token) =>
      expect(text).not.toContain(token),
    );
    expect(gitlab.requests.every((url) => !url.includes(ALICE_TOKEN))).toBe(
      true,
    );
  });
});
