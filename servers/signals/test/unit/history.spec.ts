import { describe, expect, it } from '@jest/globals';
import type { SignalTarget } from 'src/authz/policy';
import HistoryService from 'src/history/history.service';
import readingKeyOf from 'src/history/reading-key';
import testConfig from 'test/helpers/config';
import FakePostgres, { rowsFrom } from 'test/helpers/fake-postgres';

const TOPIC = 'SWiM/CTO/room/0224/seat48A/S/S-0001/temperature';
const TARGET: SignalTarget = {
  path: TOPIC,
  owner: 'swim',
  twin: 'room0224',
  channel: 'measured',
  group: 'swim',
};
const SPAN = { channel: 'measured' as const, from: 0, to: 1000 };

function serviceWith(postgres: FakePostgres, maxPoints = 10) {
  const config = testConfig({
    'range-max-points': maxPoints,
    'postgres-database-template': 'dtaas_{group}',
  });
  return new HistoryService(config, postgres.asClient());
}

describe('readingKeyOf', () => {
  it('reads the device and quantity of a topic with eight levels', () => {
    expect(readingKeyOf(TOPIC)).toEqual({
      deviceId: 'S-0001',
      quantity: 'temperature',
    });
  });

  it.each(['alice/pump/flow', 'a/b/c/d/e/f/g/h/i', 'a/b/c/d/e/f//h'])(
    'has no key for %j',
    (topic) => {
      expect(readingKeyOf(topic)).toBeUndefined();
    },
  );
});

describe('HistoryService', () => {
  it("reads the group's database with every value as a parameter", async () => {
    const postgres = new FakePostgres(() => rowsFrom(0, 3));
    const answer = await serviceWith(postgres).range([TARGET], SPAN);
    expect(answer.truncated).toBe(false);
    expect(answer.samples).toHaveLength(3);
    expect(answer.samples[0]).toEqual({
      path: TOPIC,
      channel: 'measured',
      ts: 0,
      value: 0,
      quality: null,
    });
    const [query] = postgres.queries;
    expect(query.database).toBe('dtaas_swim');
    expect(query.text).not.toContain('S-0001');
    expect(query.values).toEqual([
      'S-0001',
      'temperature',
      new Date(0),
      new Date(1000),
      11,
    ]);
  });

  it('asks again in date_bin bins when the range holds more points than the budget', async () => {
    const postgres = new FakePostgres((query) =>
      query.text.includes('date_bin') ? rowsFrom(0, 10) : rowsFrom(0, 11),
    );
    const answer = await serviceWith(postgres).range([TARGET], SPAN);
    expect(answer.truncated).toBe(true);
    expect(answer.samples).toHaveLength(10);
    expect(postgres.queries[1].values.slice(4)).toEqual([
      '100 milliseconds',
      10,
    ]);
  });

  it('serves only the requested channel and topics of the convention', async () => {
    const postgres = new FakePostgres(() => rowsFrom(0, 1));
    const service = serviceWith(postgres);
    const simulated = { ...TARGET, channel: 'simulated' as const };
    const other = { ...TARGET, path: 'alice/pump/flow' };
    const answer = await service.range([simulated, other], SPAN);
    expect(answer).toEqual({ samples: [], truncated: false });
    expect(postgres.queries).toHaveLength(0);
  });

  it('shares the point budget between signals and skips rows without a value', async () => {
    const postgres = new FakePostgres(() => [
      { time: new Date(5), value: 1.5 },
      { time: new Date(6), value: null },
      { time: 'not a date', value: 2 },
    ]);
    const second = { ...TARGET, path: TOPIC.replace('temperature', 'co2') };
    const answer = await serviceWith(postgres).range([TARGET, second], SPAN);
    expect(answer.samples.map((s) => s.ts)).toEqual([5, 5]);
    expect(postgres.queries.map((q) => q.values[4])).toEqual([6, 6]);
  });

  it('reads the database of the group, not of the owner, and nothing without a group', async () => {
    const postgres = new FakePostgres(() => rowsFrom(0, 1));
    const service = serviceWith(postgres);
    await service.range([{ ...TARGET, owner: 'jady' }], SPAN);
    expect(postgres.queries[0].database).toBe('dtaas_swim');
    const answer = await service.range([{ ...TARGET, group: undefined }], SPAN);
    expect(answer.samples).toEqual([]);
  });

  it('leaves out the signals past the point limit and says the answer was cut', async () => {
    const postgres = new FakePostgres(() => rowsFrom(0, 1));
    const targets = ['a', 'b', 'c'].map((q) => ({
      ...TARGET,
      path: TOPIC.replace('temperature', q),
    }));
    const answer = await serviceWith(postgres, 2).range(targets, SPAN);
    expect(postgres.queries).toHaveLength(2);
    expect(answer.truncated).toBe(true);
  });

  it('passes a database error on to the caller', async () => {
    const postgres = new FakePostgres(() => new Error('connection refused'));
    await expect(serviceWith(postgres).range([TARGET], SPAN)).rejects.toThrow(
      'connection refused',
    );
  });
});
