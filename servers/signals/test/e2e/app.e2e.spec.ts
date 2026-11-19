import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import E2eGateway, {
  ALICE_TOKEN,
  BOB_TOKEN,
  CAROL_TOKEN,
  EXPIRED_TOKEN,
  FLOW,
  OTHER_APP_TOKEN,
  RANGE,
  READ_USER_TOKEN,
  ROOM,
  SPEED,
} from 'test/helpers/e2e-gateway';
import { reading } from 'test/helpers/fake-broker';
import { openStream, waitFor } from 'test/helpers/sse-client';

describe('Signals gateway e2e', () => {
  const gateway = new E2eGateway();
  const { gitlab, broker, postgres, logger } = gateway;
  let base = '';
  const post = (route: string, token: string | undefined, body: unknown) =>
    gateway.post(route, token, body);

  beforeAll(async () => {
    await gateway.start();
    base = gateway.base;
  });

  afterAll(() => gateway.stop());

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
    broker.deliver(FLOW, reading(3));
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
      broker.deliver(other, reading(4));
      broker.deliver(own, reading(5));
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
      expect(postgres.queries).toHaveLength(before + 1);
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
