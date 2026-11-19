import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import E2eGateway, { ALICE_TOKEN, RANGE, ROOM } from 'test/helpers/e2e-gateway';
import { openStream, waitFor } from 'test/helpers/sse-client';

describe('Signals gateway history e2e', () => {
  const gateway = new E2eGateway();
  const { broker, postgres } = gateway;
  let base = '';
  const post = (route: string, token: string | undefined, body: unknown) =>
    gateway.post(route, token, body);

  beforeAll(async () => {
    await gateway.start();
    base = gateway.base;
  });

  afterAll(() => gateway.stop());

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
});
