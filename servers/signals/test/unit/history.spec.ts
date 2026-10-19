import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { SignalTarget } from 'src/authz/policy';
import { buildRangeQuery } from 'src/history/flux';
import { parseAnnotatedCsv, splitCsvLine } from 'src/history/annotated-csv';
import HistoryService from 'src/history/history.service';
import type InfluxClient from 'src/history/influx.client';
import type { FluxQuery } from 'src/history/flux';
import type { CsvRow } from 'src/history/annotated-csv';
import testConfig from 'test/helpers/config';

const SOURCE = { org: 'alice', bucket: 'alice', measurement: 'pump' };

describe('buildRangeQuery', () => {
  it('passes every value as a parameter, never in the query text', () => {
    const hostile = 'a") |> drop(columns: ["x"]) //';
    const { query, params } = buildRangeQuery(SOURCE, {
      topic: hostile,
      from: 0,
      to: 1000,
      limit: 5,
    });
    expect(query).not.toContain(hostile);
    expect(query).toContain('r.topic == params.topic');
    expect(query).toContain('r._measurement == params.measurement');
    expect(params).toEqual({
      bucket: 'alice',
      measurement: 'pump',
      topic: hostile,
      start: '1970-01-01T00:00:00.000Z',
      stop: '1970-01-01T00:00:01.000Z',
      limit: 5,
    });
  });

  it('downsamples with aggregateWindow when asked, and skips a missing measurement', () => {
    const { query, params } = buildRangeQuery(
      { org: 'alice', bucket: 'alice' },
      { topic: 't', from: 0, to: 1000, limit: 5, everyMs: 200.4 },
    );
    expect(query).toContain('aggregateWindow(every: duration(v: params.every)');
    expect(query).not.toContain('_measurement');
    expect(params.every).toBe('201ms');
  });
});

const CSV = [
  '#datatype,string,long,dateTime:RFC3339,double,string',
  '#group,false,false,false,false,true',
  '#default,_result,,,,',
  ',result,table,_time,_value,quality',
  ',,0,2026-10-01T00:00:00Z,1.5,good',
  ',,0,2026-10-01T00:00:01Z,,',
  '',
  '#datatype,string,long,dateTime:RFC3339,string',
  '#group,false,false,false,false',
  '#default,_result,,,',
  ',result,table,_time,_value',
  ',,1,2026-10-01T00:00:02Z,"on, then ""off"""',
  '',
].join('\r\n');

describe('parseAnnotatedCsv', () => {
  it('reads each table with the types its annotation names', () => {
    const rows = parseAnnotatedCsv(CSV);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      _time: '2026-10-01T00:00:00Z',
      _value: 1.5,
      quality: 'good',
      table: 0,
    });
    expect(rows[1]._value).toBeNull();
    expect(rows[2]._value).toBe('on, then "off"');
  });

  it('reads booleans and refuses an error table', () => {
    const booleans = '#datatype,boolean\n,_value\n,true\n,false\n';
    expect(parseAnnotatedCsv(booleans).map((row) => row._value)).toEqual([
      true,
      false,
    ]);
    const failed =
      '#datatype,string,string\n,error,reference\n,bad query,897\n';
    expect(() => parseAnnotatedCsv(failed)).toThrow(/error/);
  });

  it('splits quoted cells', () => {
    expect(splitCsvLine('a,"b,c",d')).toEqual(['a', 'b,c', 'd']);
  });
});

describe('HistoryService', () => {
  let tempDir = '';
  let tokensFile = '';
  const target: SignalTarget = {
    path: 'alice/pump/flow',
    owner: 'alice',
    twin: 'pump',
    channel: 'measured',
    vhost: 'alice',
    influx: SOURCE,
  };

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'dtaas-signals-history-'));
    tokensFile = path.join(tempDir, 'tokens.json');
    await writeFile(tokensFile, '{"alice":"read-token"}');
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  function rows(count: number): CsvRow[] {
    return Array.from({ length: count }, (_, i) => ({
      _time: new Date(i).toISOString(),
      _value: i,
    }));
  }

  function serviceAnswering(answers: CsvRow[][], queries: FluxQuery[]) {
    const influx = {
      query: async (org: string, token: string, flux: FluxQuery) => {
        expect([org, token]).toEqual(['alice', 'read-token']);
        queries.push(flux);
        return answers.shift() ?? [];
      },
    } as unknown as InfluxClient;
    const config = testConfig({
      'influx-tokens-file': tokensFile,
      'range-max-points': 4,
    });
    return new HistoryService(config, influx);
  }

  it('returns the samples of a range within the budget', async () => {
    const queries: FluxQuery[] = [];
    const answer = await serviceAnswering([rows(3)], queries).range([target], {
      channel: 'measured',
      from: 0,
      to: 100,
    });
    expect(answer.truncated).toBe(false);
    expect(answer.samples[0]).toEqual({
      path: 'alice/pump/flow',
      channel: 'measured',
      ts: 0,
      value: 0,
      quality: null,
    });
    expect(queries[0].params.limit).toBe(5);
  });

  it('downsamples a range with more points than the budget', async () => {
    const queries: FluxQuery[] = [];
    const service = serviceAnswering([rows(5), rows(4)], queries);
    const answer = await service.range([target], {
      channel: 'measured',
      from: 0,
      to: 100,
    });
    expect(answer.truncated).toBe(true);
    expect(answer.samples).toHaveLength(4);
    expect(queries[1].params).toMatchObject({ limit: 4, every: '25ms' });
  });

  it('reads nothing for signals without history or without a token', async () => {
    const queries: FluxQuery[] = [];
    const service = serviceAnswering([], queries);
    const noHistory = { ...target, influx: undefined };
    await expect(
      service.range([noHistory], { channel: 'measured', from: 0, to: 1 }),
    ).resolves.toEqual({ samples: [], truncated: false });
    const otherOrg = { ...target, influx: { org: 'carol', bucket: 'carol' } };
    await expect(
      service.range([otherOrg], { channel: 'measured', from: 0, to: 1 }),
    ).resolves.toEqual({ samples: [], truncated: false });
    expect(queries).toHaveLength(0);
  });
});
