import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { HttpException } from '@nestjs/common';
import type { SignalTarget } from 'src/authz/policy';
import SseWriter from 'src/stream/sse-writer';
import StreamService from 'src/stream/stream.service';
import StreamSession from 'src/stream/stream-session';
import StreamSlots from 'src/stream/stream-slots';
import testConfig from 'test/helpers/config';
import FakeBroker from 'test/helpers/fake-broker';
import FakeResponse from 'test/helpers/fake-response';

const FLOW: SignalTarget = {
  path: 'alice/pump/flow',
  owner: 'alice',
  twin: 'pump',
  channel: 'measured',
  vhost: 'alice',
};
const OPTIONS = {
  retryMs: 5000,
  keepAliveMs: 15_000,
  lifetimeMs: 600_000,
  maxMessageBytes: 16,
};

function sessionWith(broker: FakeBroker, response = new FakeResponse()) {
  const session = new StreamSession(
    new SseWriter(response.asResponse()),
    broker,
    [FLOW],
    OPTIONS,
  );
  return { session, response };
}

describe('StreamSession', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('opens with retry and state, binds the routing key and goes live', async () => {
    const broker = new FakeBroker();
    const { session, response } = sessionWith(broker);
    await session.start(['bob/x']);
    expect(response.headers['Content-Type']).toContain('text/event-stream');
    expect(response.chunks[0]).toBe('retry: 5000\n\n');
    expect(response.chunks[1]).toBe(
      'event: state\ndata: {"state":"connecting"}\n\n',
    );
    expect(response.chunks[2]).toBe(
      'event: refused\ndata: {"paths":["bob/x"]}\n\n',
    );
    expect(response.chunks[3]).toBe('event: state\ndata: {"state":"live"}\n\n');
    expect(broker.bindings[0]).toMatchObject({
      vhost: 'alice',
      keys: ['alice.pump.flow'],
    });
    session.end();
  });

  it('forwards a message as a sample with the raw payload, and drops large ones', async () => {
    const broker = new FakeBroker();
    const { session, response } = sessionWith(broker);
    await session.start([]);
    broker.publish('alice', 'alice.pump.flow', '{"value":1}');
    broker.publish('alice', 'alice.pump.flow', 'x'.repeat(17));
    const samples = response.chunks.filter((chunk) =>
      chunk.startsWith('event: sample'),
    );
    expect(samples).toHaveLength(1);
    const data = JSON.parse(samples[0].split('data: ')[1]);
    expect(data).toMatchObject({
      path: 'alice/pump/flow',
      channel: 'measured',
      payload: '{"value":1}',
    });
    expect(typeof data.receivedAt).toBe('number');
    session.end();
  });

  it('reports down and ends when the broker drops or cannot bind', async () => {
    const broker = new FakeBroker();
    const { session, response } = sessionWith(broker);
    await session.start([]);
    broker.dropAll();
    await session.done;
    expect(response.text).toContain('{"state":"down"}');
    expect(response.writableEnded).toBe(true);
    const failing = new FakeBroker();
    failing.failNext = true;
    const second = sessionWith(failing);
    await second.session.start([]);
    expect(second.response.text).toContain('{"state":"down"}');
  });

  it('sends keep-alive comments and ends at its lifetime, unbinding', async () => {
    jest.useFakeTimers();
    const broker = new FakeBroker();
    const { session, response } = sessionWith(broker);
    await session.start([]);
    jest.advanceTimersByTime(15_000);
    expect(response.chunks).toContain(': keep-alive\n\n');
    jest.advanceTimersByTime(600_000);
    await session.done;
    expect(response.writableEnded).toBe(true);
    expect(broker.bindings).toHaveLength(0);
  });

  it('drops samples while the client is not reading', async () => {
    const broker = new FakeBroker();
    const { session, response } = sessionWith(broker);
    await session.start([]);
    response.writableLength = 2 * 1024 * 1024;
    broker.publish('alice', 'alice.pump.flow', '1');
    expect(response.text).not.toContain('event: sample');
    session.end();
  });
});

describe('StreamService', () => {
  it('closes the stream when the token expires before the maximum age', async () => {
    jest.useFakeTimers();
    const broker = new FakeBroker();
    const response = new FakeResponse();
    const service = new StreamService(testConfig(), broker);
    const identity = {
      id: 1,
      username: 'a',
      email: '',
      expiresAt: Date.now() + 1000,
    };
    const running = service.run(response.asResponse(), identity, {
      allowed: [FLOW],
      refused: [],
    });
    await jest.advanceTimersByTimeAsync(1000);
    await running;
    expect(response.writableEnded).toBe(true);
    jest.useRealTimers();
  });

  it('ends the session when the client goes away', async () => {
    const response = new FakeResponse();
    const service = new StreamService(testConfig(), new FakeBroker());
    const identity = { id: 1, username: 'a', email: '' };
    const running = service.run(response.asResponse(), identity, {
      allowed: [FLOW],
      refused: [],
    });
    await new Promise((resolve) => setImmediate(resolve));
    response.emit('close');
    await running;
    expect(response.writableEnded).toBe(true);
  });
});

describe('StreamSlots', () => {
  it('refuses a stream past the limit with 429 and frees a slot on release', () => {
    const slots = new StreamSlots(testConfig({ 'max-streams-per-user': 2 }));
    const first = slots.acquire(1);
    slots.acquire(1);
    expect(() => slots.acquire(1)).toThrow(HttpException);
    expect(slots.acquire(2)).toBeDefined();
    first();
    first();
    expect(slots.openFor(1)).toBe(1);
    expect(slots.acquire(1)).toBeDefined();
  });
});
