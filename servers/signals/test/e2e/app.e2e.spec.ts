import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import type { LoggerService } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import AppModule from 'src/app.module';
import Config from 'src/config/config.service';
import { configureSignalsApp } from 'src/main';
import StubGitLab, { STUB_APPLICATION } from 'test/helpers/stub-gitlab';
import { PUMP, visualisationOf } from 'test/helpers/twins';

const ALICE_TOKEN = 'alice-oauth-token-0123456789';
const BOB_TOKEN = 'bob-oauth-token-9876543210';
const EXPIRED_TOKEN = 'alice-expired-token-0000000000';
const OTHER_APP_TOKEN = 'alice-other-app-token-1111111111';
const READ_USER_TOKEN = 'alice-read-user-token-2222222222';
const CAROL_TOKEN = 'carol-oauth-token-3333333333';
const FLOW = 'alice/pump/flow';
const SPEED = 'carol/fan/speed';
const RANGE = { paths: [FLOW], channel: 'measured', from: 0, to: 1000 };
const ENV_KEYS = [
  'SIGNALS_GITLAB_URL',
  'SIGNALS_GITLAB_CLIENT_ID',
  'SIGNALS_OWNERS_FILE',
];

class CapturingLogger implements LoggerService {
  readonly lines: string[] = [];
  log = (message: unknown) => this.lines.push(String(message));
  error = (message: unknown) => this.lines.push(String(message));
  warn = (message: unknown) => this.lines.push(String(message));
  debug = (message: unknown) => this.lines.push(String(message));
  verbose = (message: unknown) => this.lines.push(String(message));
}

const ALICE = { id: 1, username: 'alice', email: 'alice@example.org' };

describe('Signals gateway e2e', () => {
  const gitlab = new StubGitLab(
    {
      [ALICE_TOKEN]: { ...ALICE, projects: [10] },
      [BOB_TOKEN]: {
        id: 2,
        username: 'bob',
        email: 'bob@example.org',
        projects: [],
      },
      [EXPIRED_TOKEN]: { ...ALICE, projects: [10], expiresIn: 0 },
      [OTHER_APP_TOKEN]: { ...ALICE, projects: [10], application: 'other' },
      [READ_USER_TOKEN]: { ...ALICE, projects: [10], scope: ['read_user'] },
      [CAROL_TOKEN]: {
        id: 3,
        username: 'carol',
        email: 'carol@example.org',
        projects: [11],
      },
    },
    [
      { id: 10, owner: 'alice', sha: 'c0ffee', twins: { pump: PUMP } },
      {
        id: 11,
        owner: 'carol',
        sha: 'beef00',
        // The second twin declares a topic of alice's group, which the
        // owners file does not give to carol.
        twins: {
          fan: visualisationOf([SPEED]),
          copy: visualisationOf([FLOW]),
        },
      },
    ],
  );
  const logger = new CapturingLogger();
  let app: NestExpressApplication;
  let base = '';
  let dir = '';

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
    process.env.SIGNALS_GITLAB_URL = await gitlab.start();
    process.env.SIGNALS_GITLAB_CLIENT_ID = STUB_APPLICATION;
    dir = await mkdtemp(path.join(os.tmpdir(), 'signals-e2e-'));
    const owners = path.join(dir, 'owners.json');
    await writeFile(
      owners,
      JSON.stringify({
        alice: { group: 'alice', topics: ['alice/'] },
        carol: { group: 'carol', topics: ['carol/'] },
      }),
    );
    process.env.SIGNALS_OWNERS_FILE = owners;
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
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
    ENV_KEYS.forEach((key) => delete process.env[key]);
    await rm(dir, { recursive: true, force: true });
  });

  it('answers health with no detail and no token', async () => {
    const response = await fetch(`${base}/signals/health`);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'ok' });
    expect(response.headers.get('x-powered-by')).toBeNull();
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it.each(['stream', 'range'])(
    'refuses %s without a token or with an unknown one',
    async (route) => {
      const body = route === 'range' ? RANGE : { paths: [FLOW] };
      expect((await post(route, undefined, body)).status).toBe(401);
      expect((await post(route, 'not-a-token', body)).status).toBe(401);
    },
  );

  it.each([EXPIRED_TOKEN, OTHER_APP_TOKEN, READ_USER_TOKEN])(
    'refuses with 401 an expired token, one of another application or one without an API scope',
    async (token) => {
      expect((await post('stream', token, { paths: [FLOW] })).status).toBe(401);
      expect((await post('range', token, RANGE)).status).toBe(401);
    },
  );

  it('accepts a declared path of a readable project, then answers 501', async () => {
    const stream = await post('stream', ALICE_TOKEN, { paths: [FLOW] });
    expect(stream.status).toBe(501);
    await expect(stream.json()).resolves.toEqual({
      status: 'not-implemented',
      route: 'stream',
    });
    expect((await post('range', ALICE_TOKEN, RANGE)).status).toBe(501);
  });

  it('refuses with 403 an undeclared path and a reader without the project', async () => {
    const undeclared = { paths: ['alice/pump/secret'] };
    expect((await post('stream', ALICE_TOKEN, undeclared)).status).toBe(403);
    expect((await post('stream', BOB_TOKEN, { paths: [FLOW] })).status).toBe(
      403,
    );
    expect((await post('range', BOB_TOKEN, RANGE)).status).toBe(403);
  });

  // Two groups on every route: each reads its own paths and is refused the
  // other's, also through a twin that declares a topic of the other group.
  it.each([
    [ALICE_TOKEN, FLOW, SPEED],
    [CAROL_TOKEN, SPEED, FLOW],
  ])(
    'serves each group its own paths and refuses the other group (%#)',
    async (token, own, other) => {
      const range = (p: string) => ({ ...RANGE, paths: [p] });
      expect((await post('stream', token, { paths: [own] })).status).toBe(501);
      expect((await post('range', token, range(own))).status).toBe(501);
      expect((await post('stream', token, { paths: [other] })).status).toBe(
        403,
      );
      expect((await post('range', token, range(other))).status).toBe(403);
    },
  );

  it('refuses wildcards with 400 and too many paths with 413', async () => {
    expect(
      (await post('stream', ALICE_TOKEN, { paths: ['alice/#'] })).status,
    ).toBe(400);
    const many = Array.from({ length: 201 }, (_, i) => `alice/${i}`);
    expect((await post('stream', ALICE_TOKEN, { paths: many })).status).toBe(
      413,
    );
  });

  it('refuses a body above the payload limit', async () => {
    const response = await post('stream', ALICE_TOKEN, {
      padding: 'x'.repeat(70 * 1024),
    });
    expect(response.status).toBe(413);
  });

  it('logs every decision and never a token', () => {
    const text = logger.lines.join('\n');
    expect(text).toContain(
      '"user":"alice","action":"stream","resource":"alice/pump/flow","decision":"allow"',
    );
    expect(text).toContain(
      '"user":"bob","action":"stream","resource":"alice/pump/flow","decision":"deny"',
    );
    [ALICE_TOKEN, BOB_TOKEN, EXPIRED_TOKEN, OTHER_APP_TOKEN].forEach((token) =>
      expect(text).not.toContain(token),
    );
    expect(gitlab.requests.every((url) => !url.includes(ALICE_TOKEN))).toBe(
      true,
    );
  });
});
