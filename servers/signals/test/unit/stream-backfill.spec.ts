import { describe, expect, it } from '@jest/globals';
import type { Backfill } from 'src/stream/stream-session';
import FakeBroker from 'test/helpers/fake-broker';
import sessionWith from 'test/helpers/stream-session';
import { FLOW } from 'test/helpers/twins';

describe('StreamSession backfill', () => {
  it('sends past samples without an id after going live, and a gap the history could not fill', async () => {
    const past = {
      path: FLOW.path,
      twin: 'pump',
      channel: 'measured',
      ts: 1000,
      value: 2,
    };
    const backfill: Backfill = async () => ({
      samples: [past],
      complete: false,
      from: 500,
      to: 2000,
    });
    const { session, response } = sessionWith(
      new FakeBroker(),
      undefined,
      undefined,
      backfill,
    );
    await session.start([]);
    const sample = response.chunks.find((chunk) =>
      chunk.includes('"backfill":true'),
    );
    expect(sample?.startsWith('event: sample\n')).toBe(true);
    expect(JSON.parse(sample?.split('data: ')[1] ?? '{}')).toMatchObject({
      path: FLOW.path,
      receivedAt: 1000,
      payload: '{"value":2,"ts":"1970-01-01T00:00:01.000Z"}',
    });
    expect(response.text).toContain('event: gap\ndata: {"from":500,"to":2000}');
    expect(session.counts.backfilled).toBe(1);
    session.end();
  });

  it('reports an unknown gap when the history fails', async () => {
    const backfill: Backfill = async () => {
      throw new Error('database down');
    };
    const { session, response } = sessionWith(
      new FakeBroker(),
      undefined,
      undefined,
      backfill,
    );
    await session.start([]);
    expect(response.text).toContain(
      'event: gap\ndata: {"from":null,"to":null}',
    );
    expect(response.text).toContain('"state":"live"');
    session.end();
  });
});
