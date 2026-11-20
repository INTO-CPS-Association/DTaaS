import { describe, expect, it } from '@jest/globals';
import { UnauthorizedException } from '@nestjs/common';
import {
  httpBinding,
  httpClaimsSchema,
  HttpRequest,
  mqttClaimsSchema,
  readClaims,
  topicBinding,
} from 'src/auth/claims';
import { bodyHash } from 'test/sign.util';

const NOW = 1793005516;

const expected = { aud: 'hospital-1', now: NOW };

const timeClaims = {
  aud: 'hospital-1',
  iat: NOW,
  exp: NOW + 30,
  jti: '4Yprdk_SIrCcAYAPD-gPtQ',
};

const body = '{"event":"close"}';

const httpClaims = {
  ...timeClaims,
  htm: 'POST',
  htu: '/fsm/event',
  bh: bodyHash(body),
};

const request = { method: 'POST', path: '/fsm/event', body: Buffer.from(body) };

function refusal(call: () => unknown): string {
  try {
    call();
  } catch (error) {
    expect(error).toBeInstanceOf(UnauthorizedException);
    return (error as UnauthorizedException).message;
  }
  return 'accepted';
}

const read = (claims: unknown, now = NOW) =>
  refusal(() => readClaims(httpClaimsSchema, claims, { ...expected, now }));

describe('Token claims', () => {
  it('Should read the claims of the example', () => {
    expect(readClaims(httpClaimsSchema, httpClaims, expected)).toEqual(
      httpClaims,
    );
  });

  it.each([
    ['another aud', { aud: 'hospital-2' }],
    ['an aud that is a list', { aud: ['hospital-1'] }],
    ['no jti', { jti: undefined }],
    ['a jti of 15 characters', { jti: 'x'.repeat(15) }],
    ['a jti of 65 characters', { jti: 'x'.repeat(65) }],
    ['an iat that is a string', { iat: String(NOW) }],
    ['no exp', { exp: undefined }],
    ['no htm', { htm: undefined }],
    ['a bh that is a number', { bh: 1 }],
  ])('Should refuse %s as invalid claims', (_, change) => {
    expect(read({ ...httpClaims, ...change })).toBe('invalid claims');
  });

  it('Should refuse claims that are not an object', () => {
    expect(read('claims')).toBe('invalid claims');
  });

  it.each([
    ['30 s after exp', NOW + 60, 'accepted'],
    ['31 s after exp', NOW + 61, 'expired credential'],
    ['30 s before iat', NOW - 30, 'accepted'],
    ['31 s before iat', NOW - 31, 'expired credential'],
  ])('Should allow 30 s of skew: %s', (_, now, result) => {
    expect(read(httpClaims, now)).toBe(result);
  });

  it.each([
    ['of 60 s', 60, 'accepted'],
    ['of 61 s', 61, 'expired credential'],
    ['of 0 s', 0, 'expired credential'],
    ['that ends before it starts', -1, 'expired credential'],
  ])('Should judge a lifetime %s', (_, lifetime, result) => {
    expect(read({ ...httpClaims, exp: NOW + lifetime })).toBe(result);
  });

  it('Should read the claims of an MQTT request', () => {
    const claims = { ...timeClaims, topic: 'dtaas/hospital-1/execute' };

    expect(readClaims(mqttClaimsSchema, claims, expected)).toEqual(claims);
  });
});

describe('Request binding', () => {
  const bind = (claims: object, call: HttpRequest = request) =>
    refusal(() => httpBinding({ ...httpClaims, ...claims }, call));

  it.each([
    ['the path', {}],
    ['a prefix that a gateway strips', { htu: '/user1/runner/fsm/event' }],
  ])('Should accept %s', (_, claims) => {
    expect(bind(claims)).toBe('accepted');
  });

  it.each([
    ['another method', { htm: 'PUT' }],
    ['another path', { htu: '/fsm/transition' }],
    ['a relative prefix', { htu: 'x/fsm/event' }],
    ['a longer last segment', { htu: '/fsm/events' }],
    ['a path with a query', { htu: '/fsm/event?x=1' }],
    ['a host', { htu: 'http://localhost:5000/fsm/event' }],
    ['the hash of another body', { bh: bodyHash('{"event":"full"}') }],
    ['the hash of no body', { bh: bodyHash() }],
  ])('Should refuse %s', (_, claims) => {
    expect(bind(claims)).toBe('credential does not match the request');
  });

  it('Should hash a request without a body as the empty string', () => {
    const get = { method: 'GET', path: '/state' };
    const claims = { htm: 'GET', htu: '/state', bh: bodyHash() };

    expect(bind(claims, get)).toBe('accepted');
  });

  it('Should bind an MQTT request to its topic', () => {
    const claims = { ...timeClaims, topic: 'dtaas/hospital-1/execute' };

    expect(refusal(() => topicBinding(claims, claims.topic))).toBe('accepted');
    expect(refusal(() => topicBinding(claims, 'dtaas/hospital-1/stop'))).toBe(
      'credential does not match the request',
    );
  });
});
