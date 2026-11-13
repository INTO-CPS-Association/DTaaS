import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import type { LoggerService } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import AppModule from 'src/app.module';
import { SIGNAL_BROKER } from 'src/broker/broker';
import Config from 'src/config/config.service';
import PostgresClient from 'src/history/postgres.client';
import { configureSignalsApp } from 'src/main';
import FakeBroker, { reading } from 'test/helpers/fake-broker';
import FakePostgres, { rowsFrom } from 'test/helpers/fake-postgres';
import { openStream, waitFor } from 'test/helpers/sse-client';
import StubGitLab, { STUB_APPLICATION } from 'test/helpers/stub-gitlab';
import { PUMP, visualisationOf } from 'test/helpers/twins';

const ALICE_TOKEN = 'alice-oauth-token-0123456789';
const BOB_TOKEN = 'bob-oauth-token-9876543210';
const EXPIRED_TOKEN = 'alice-expired-token-0000000000';
const OTHER_APP_TOKEN = 'alice-other-app-token-1111111111';
const READ_USER_TOKEN = 'alice-read-user-token-2222222222';
const CAROL_TOKEN = 'carol-oauth-token-3333333333';
const FLOW = 'alice/pump/flow';
const ROOM = 'alice/CTO/room/0224/seat48A/S/S-0001/temperature';
// History is kept per device, so the cross-group paths are device topics.
const SPEED = 'carol/CTO/room/0101/seat1/S/S-0002/temperature';
const RANGE = { paths: [ROOM], channel: 'measured', from: 0, to: 1000 };
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
      {
        id: 10,
        owner: 'alice',
        sha: 'c0ffee',
        twins: { pump: PUMP, room: visualisationOf([ROOM]) },
      },
      {
        id: 11,
        owner: 'carol',
        sha: 'beef00',
        // The second twin declares a topic of alice's group, which the
        // owners file does not give to carol.
        twins: {
          fan: visualisationOf([SPEED]),
          copy: visualisationOf([ROOM]),
        },
      },
    ],
  );
  const broker = new FakeBroker();
  const postgres = new FakePostgres(() => rowsFrom(0, 2));
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
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(SIGNAL_BROKER)
      .useValue(broker)
      .overrideProvider(PostgresClient)
      .useValue(postgres.asClient())
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

  it('streams a sample to a reader of the twin and says which paths it refused', async () => {
    const stream = await openStream(`${base}/signals/stream`, ALICE_TOKEN, [
      FLOW,
      'bob/secret',
    ]);
    expect(stream.status).toBe(200);
    const opening = await stream.readUntil('"state":"live"');
    expect(opening.startsWith('retry: 5000\n\n')).toBe(true);
    expect(opening).toContain('event: refused\ndata: {"paths":["bob/secret"]}');
    broker.publish(FLOW, reading(3));
    const text = await stream.readUntil('event: sample');
    expect(text).toContain(
      '"path":"alice/pump/flow","twin":"pump","channel":"measured"',
    );
    stream.close();
    await waitFor(() => broker.bindings.length === 0);
  });

  it("serves the user's delivery counts only with a token", async () => {
    await waitFor(() =>
      logger.lines.some((line) => line.includes('"stream-end"')),
    );
    const stats = (token?: string) =>
      fetch(`${base}/signals/stats`, {
        headers:
          token === undefined ? {} : { Authorization: `Bearer ${token}` },
      });
    expect((await stats()).status).toBe(401);
    const response = await stats(ALICE_TOKEN);
    await expect(response.json()).resolves.toEqual({
      forwarded: 1,
      backfilled: 0,
      dropped: { tooLarge: 0, invalid: 0, congested: 0 },
    });
  });

  it("serves the history of a readable twin from its group's database", async () => {
    const response = await post('range', ALICE_TOKEN, RANGE);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      samples: [
        { path: ROOM, channel: 'measured', ts: 0, value: 0, quality: null },
        { path: ROOM, channel: 'measured', ts: 1, value: 1, quality: null },
      ],
      truncated: false,
    });
    expect(postgres.queries[0].database).toBe('alice');
  });

  it('refuses with 403 an undeclared path and a reader without the project', async () => {
    const undeclared = { paths: ['alice/pump/secret'] };
    expect((await post('stream', ALICE_TOKEN, undeclared)).status).toBe(403);
    expect((await post('stream', BOB_TOKEN, { paths: [FLOW] })).status).toBe(
      403,
    );
    expect(broker.bindings).toHaveLength(0);
    expect((await post('range', BOB_TOKEN, RANGE)).status).toBe(403);
  });

  // Two groups on every route: each reads its own paths and is refused the
  // other's, also through a twin that declares a topic of the other group.
  it.each([
    [ALICE_TOKEN, ROOM, SPEED, 'alice'],
    [CAROL_TOKEN, SPEED, ROOM, 'carol'],
  ])(
    'serves each group its own paths and refuses the other group (%#)',
    async (token, own, other, group) => {
      const range = (p: string) => ({ ...RANGE, paths: [p] });
      const stream = await openStream(`${base}/signals/stream`, token, [own]);
      expect(stream.status).toBe(200);
      await stream.readUntil('"state":"live"');
      broker.publish(other, reading(4));
      broker.publish(own, reading(5));
      const text = await stream.readUntil('event: sample');
      expect(text).toContain(`"path":"${own}"`);
      expect(text).not.toContain(`"path":"${other}"`);
      stream.close();
      await waitFor(() => broker.bindings.length === 0);
      const before = postgres.queries.length;
      expect((await post('range', token, range(own))).status).toBe(200);
      expect(
        postgres.queries.slice(before).map((query) => query.database),
      ).toEqual([group]);
      expect((await post('stream', token, { paths: [other] })).status).toBe(
        403,
      );
      expect((await post('range', token, range(other))).status).toBe(403);
      expect(postgres.queries.length).toBe(before + 1);
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

  it('fills the gap since Last-Event-ID from the history, then goes live', async () => {
    const lastId = Date.now() - 2000;
    const before = postgres.queries.length;
    const stream = await openStream(
      `${base}/signals/stream`,
      ALICE_TOKEN,
      [ROOM],
      { 'Last-Event-ID': String(lastId) },
    );
    const text = await stream.readUntil('"backfill":true');
    expect(text.indexOf('"state":"live"')).toBeLessThan(
      text.indexOf('"backfill":true'),
    );
    expect(text).not.toContain('event: gap');
    const [query] = postgres.queries.slice(before);
    expect(query.values[2]).toEqual(new Date(lastId - 5000));
    stream.close();
    await waitFor(() => broker.bindings.length === 0);
  });

  it('reports a gap longer than resume-max-gap and ignores a malformed id', async () => {
    const old = await openStream(
      `${base}/signals/stream`,
      ALICE_TOKEN,
      [ROOM],
      {
        'Last-Event-ID': '1',
      },
    );
    expect(await old.readUntil('event: gap')).toContain('"backfill":true');
    old.close();
    const before = postgres.queries.length;
    const odd = await openStream(
      `${base}/signals/stream`,
      ALICE_TOKEN,
      [ROOM],
      {
        'Last-Event-ID': 'yesterday',
      },
    );
    await odd.readUntil('"state":"live"');
    odd.close();
    await waitFor(() => broker.bindings.length === 0);
    expect(postgres.queries.length).toBe(before);
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
