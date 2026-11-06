import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { HttpException, Logger } from '@nestjs/common';
import type { SignalTarget } from 'src/authz/policy';
import DeliveryStats from 'src/stream/delivery-stats';
import SseWriter from 'src/stream/sse-writer';
import StreamService from 'src/stream/stream.service';
import StreamSession, { type Recheck } from 'src/stream/stream-session';
import StreamSlots from 'src/stream/stream-slots';
import testConfig from 'test/helpers/config';
import FakeBroker, { reading } from 'test/helpers/fake-broker';
import FakeResponse from 'test/helpers/fake-response';

const FLOW: SignalTarget = {
  path: 'alice/pump/flow',
  owner: 'alice',
  twin: 'pump',
  channel: 'measured',
};
const OPTIONS = {
  retryMs: 5000,
  keepAliveMs: 15_000,
  lifetimeMs: 600_000,
  maxMessageBytes: 128,
  recheckMs: 60_000,
};
const MAX_BACKLOG = 1024 * 1024;

function sessionWith(
  broker: FakeBroker,
  response = new FakeResponse(),
  recheck?: Recheck,
) {
  const session = new StreamSession(
    new SseWriter(response.asResponse(), MAX_BACKLOG),
    broker,
    [FLOW],
    OPTIONS,
    recheck,
  );
  return { session, response };
}

function serviceWith(broker = new FakeBroker(), stats = new DeliveryStats()) {
  return new StreamService(testConfig(), broker, stats);
}

describe('StreamSession', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('opens with retry and state, subscribes to the topic and goes live', async () => {
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
    expect(broker.bindings[0]).toMatchObject({ topics: ['alice/pump/flow'] });
    session.end();
  });

  it('forwards a message as a sample with the raw payload, and drops large ones', async () => {
    const broker = new FakeBroker();
    const { session, response } = sessionWith(broker);
    await session.start([]);
    broker.deliver('alice/pump/flow', reading(1));
    broker.deliver('alice/pump/flow', 'x'.repeat(129));
    const samples = response.chunks.filter((chunk) =>
      chunk.startsWith('event: sample'),
    );
    expect(samples).toHaveLength(1);
    const data = JSON.parse(samples[0].split('data: ')[1]);
    expect(data).toMatchObject({
      path: 'alice/pump/flow',
      channel: 'measured',
      payload: reading(1),
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
    broker.deliver('alice/pump/flow', reading(1));
    expect(response.text).not.toContain('event: sample');
    session.end();
  });

  it('counts forwarded samples and each reason a sample is dropped', async () => {
    const broker = new FakeBroker();
    const { session, response } = sessionWith(broker);
    await session.start([]);
    broker.deliver('alice/pump/flow', reading(1));
    broker.deliver('alice/pump/flow', reading(2));
    broker.deliver('alice/pump/flow', 'x'.repeat(129));
    response.writableLength = MAX_BACKLOG + 1;
    broker.deliver('alice/pump/flow', reading(3));
    broker.deliver('alice/pump/flow', '{"value":"high"}');
    expect(session.counts).toEqual({
      forwarded: 2,
      dropped: { tooLarge: 1, invalid: 1, congested: 1 },
    });
    session.end();
  });

  it('ends the stream when access is revoked while it runs', async () => {
    jest.useFakeTimers();
    const broker = new FakeBroker();
    let revoked: string[] = [];
    const { session, response } = sessionWith(
      broker,
      new FakeResponse(),
      async () => revoked,
    );
    await session.start([]);
    await jest.advanceTimersByTimeAsync(60_000);
    expect(response.writableEnded).toBe(false);
    revoked = ['alice/pump/flow'];
    await jest.advanceTimersByTimeAsync(60_000);
    await session.done;
    expect(response.text).toContain(
      'event: refused\ndata: {"paths":["alice/pump/flow"]}',
    );
    expect(response.text).toContain('{"state":"down"}');
    expect(broker.bindings).toHaveLength(0);
    broker.deliver('alice/pump/flow', reading(1));
    expect(response.text).not.toContain('event: sample');
  });
});

describe('SseWriter', () => {
  it('is congested only past the configured backlog', () => {
    const response = new FakeResponse();
    const writer = new SseWriter(response.asResponse(), 10);
    response.writableLength = 10;
    expect(writer.isCongested()).toBe(false);
    response.writableLength = 11;
    expect(writer.isCongested()).toBe(true);
  });
});

describe('StreamService', () => {
  it('opens no session for a client that left while access was decided', async () => {
    const broker = new FakeBroker();
    const response = new FakeResponse();
    response.destroyed = true;
    await serviceWith(broker).run(
      response.asResponse(),
      { id: '1', username: 'a', email: '' },
      {
        allowed: [FLOW],
        refused: [],
      },
    );
    expect(broker.bindings).toHaveLength(0);
    expect(response.chunks).toEqual([]);
  });

  it('closes the stream when the token expires before the maximum age', async () => {
    jest.useFakeTimers();
    const broker = new FakeBroker();
    const response = new FakeResponse();
    const service = serviceWith(broker);
    const identity = {
      id: '1',
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
    const service = serviceWith();
    const identity = { id: '1', username: 'a', email: '' };
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

describe('Delivery stats', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('logs one line per ended stream and adds it to the user totals', async () => {
    const lines: string[] = [];
    jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation((message: unknown) => {
        lines.push(String(message));
      });
    const broker = new FakeBroker();
    const stats = new DeliveryStats();
    const response = new FakeResponse();
    const identity = { id: '3', username: 'alice', email: '' };
    const running = serviceWith(broker, stats).run(
      response.asResponse(),
      identity,
      { allowed: [FLOW], refused: [] },
    );
    await new Promise((resolve) => setImmediate(resolve));
    broker.deliver('alice/pump/flow', reading(1));
    response.emit('close');
    await running;
    expect(JSON.parse(lines[0])).toMatchObject({
      user: 'alice',
      action: 'stream-end',
      paths: 1,
      forwarded: 1,
      dropped: { tooLarge: 0, invalid: 0, congested: 0 },
    });
    expect(stats.of('3').forwarded).toBe(1);
    expect(stats.of('4')).toEqual({
      forwarded: 0,
      dropped: { tooLarge: 0, invalid: 0, congested: 0 },
    });
  });
});

describe('StreamSlots', () => {
  it('refuses a stream past the limit with 429 and frees a slot on release', () => {
    const slots = new StreamSlots(testConfig({ 'max-streams-per-user': 2 }));
    const first = slots.acquire('1');
    slots.acquire('1');
    expect(() => slots.acquire('1')).toThrow(HttpException);
    expect(slots.acquire('2')).toBeDefined();
    first();
    first();
    expect(slots.acquire('1')).toBeDefined();
    expect(() => slots.acquire('1')).toThrow(HttpException);
  });
});
