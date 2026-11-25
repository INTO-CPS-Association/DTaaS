import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { HttpException, Logger } from '@nestjs/common';
import DeliveryStats from 'src/stream/delivery-stats';
import SseWriter from 'src/stream/sse-writer';
import StreamService from 'src/stream/stream.service';
import StreamSlots from 'src/stream/stream-slots';
import testConfig from 'test/helpers/config';
import FakeBroker, { reading } from 'test/helpers/fake-broker';
import FakeResponse from 'test/helpers/fake-response';
import { FLOW } from 'test/helpers/twins';

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
    const running = new StreamService(testConfig(), broker, stats).run(
      response.asResponse(),
      { identity, decision: { allowed: [FLOW], refused: [] } },
    );
    await new Promise((resolve) => setImmediate(resolve));
    broker.publish('alice/pump/flow', reading(1));
    response.emit('close');
    await running;
    expect(JSON.parse(lines[0])).toMatchObject({
      user: 'alice',
      action: 'stream-end',
      paths: 1,
      forwarded: 1,
      backfilled: 0,
      dropped: { tooLarge: 0, invalid: 0, congested: 0 },
    });
    expect(stats.of('3').forwarded).toBe(1);
    expect(stats.of('4')).toEqual({
      forwarded: 0,
      backfilled: 0,
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
