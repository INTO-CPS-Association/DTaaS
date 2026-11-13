import { describe, expect, it } from '@jest/globals';
import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import {
  parseRangeRequest,
  parseStreamRequest,
  twinOf,
} from 'src/dto/requests';

const LIMITS = { maxPaths: 3, maxPathLength: 20 };
const RANGE_LIMITS = { ...LIMITS, maxSpan: 1000 };

describe('parseStreamRequest', () => {
  it('returns the distinct paths', () => {
    expect(parseStreamRequest({ paths: ['a/b', 'a/b', 'c'] }, LIMITS)).toEqual([
      'a/b',
      'c',
    ]);
  });

  it.each([
    ['a missing list', {}],
    ['an empty list', { paths: [] }],
    ['an MQTT wildcard', { paths: ['a/+/c'] }],
    ['a multi-level wildcard', { paths: ['a/#'] }],
    ['an AMQP wildcard', { paths: ['a/*'] }],
    ['an empty path', { paths: [''] }],
    ['an over-long path', { paths: ['x'.repeat(21)] }],
    ['a path that is not text', { paths: [42] }],
    ['an unknown field', { paths: ['a'], extra: 1 }],
    ['a twin without a name', { paths: ['a'], twin: { owner: 'alice' } }],
    [
      'a twin name with a slash',
      { paths: ['a'], twin: { owner: 'a', name: 'b/c' } },
    ],
    [
      'a twin with an unknown field',
      { paths: ['a'], twin: { owner: 'a', name: 'b', x: 1 } },
    ],
  ])('refuses %s with 400', (_label, body) => {
    expect(() => parseStreamRequest(body, LIMITS)).toThrow(BadRequestException);
  });

  it('refuses more paths than allowed with 413', () => {
    expect(() =>
      parseStreamRequest({ paths: ['a', 'b', 'c', 'd'] }, LIMITS),
    ).toThrow(PayloadTooLargeException);
  });
});

describe('parseRangeRequest', () => {
  const valid = { paths: ['a/b'], channel: 'measured', from: 0, to: 1000 };

  it('accepts a range within the span', () => {
    expect(parseRangeRequest(valid, RANGE_LIMITS)).toEqual(valid);
  });

  it.each([
    ['an empty range', { ...valid, to: 0 }],
    ['a range longer than the span', { ...valid, to: 1001 }],
    ['an unknown channel', { ...valid, channel: 'guessed' }],
    ['a time that is not an integer', { ...valid, from: 0.5 }],
    ['a wildcard', { ...valid, paths: ['#'] }],
  ])('refuses %s', (_label, body) => {
    expect(() => parseRangeRequest(body, RANGE_LIMITS)).toThrow(
      BadRequestException,
    );
  });
});

describe('twinOf', () => {
  it('reads the twin a request names', () => {
    const twin = { owner: 'alice', name: 'pump_twin' };
    expect(parseStreamRequest({ paths: ['a'], twin }, LIMITS)).toEqual(['a']);
    expect(twinOf({ paths: ['a'], twin })).toEqual(twin);
  });

  it('answers undefined for a request without a twin', () => {
    expect(twinOf({ paths: ['a'] })).toBeUndefined();
  });

  it('is accepted on a range request too', () => {
    const body = {
      paths: ['a/b'],
      channel: 'measured',
      from: 0,
      to: 10,
      twin: { owner: 'alice', name: 'pump' },
    };
    expect(parseRangeRequest(body, RANGE_LIMITS).paths).toEqual(['a/b']);
  });
});
