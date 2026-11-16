import { describe, expect, it } from '@jest/globals';
import { HttpException } from '@nestjs/common';
import Access from 'src/auth/access';
import {
  bodyHash,
  httpAuthorization,
  mqttPayload,
  newCaller,
  signToken,
  timeClaims,
} from 'test/sign.util';

const alice = newCaller('alice');
const manager = newCaller('manager-1');

const access = () =>
  new Access(
    [
      { name: 'alice', role: 'client', publicKey: alice.publicKey },
      { name: 'manager-1', role: 'manager', publicKey: manager.publicKey },
    ],
    'hospital-1',
  );

const body = '{"event":"close"}';
const call = { method: 'POST', path: '/fsm/event', body };
const request = { ...call, body: Buffer.from(body) };
const TOPIC = 'dtaas/hospital-1/execute';

function refusal(attempt: () => unknown): string {
  try {
    attempt();
  } catch (error) {
    expect(error).toBeInstanceOf(HttpException);
    return (error as HttpException).message;
  }
  return 'accepted';
}

describe('Access over HTTP', () => {
  it('Should accept a token of a listed principal, in its role', () => {
    const header = httpAuthorization(manager, 'hospital-1', call);

    expect(access().http(header, request)).toEqual({
      name: 'manager-1',
      role: 'manager',
    });
  });

  it('Should accept a token once only', () => {
    const control = access();
    const header = httpAuthorization(alice, 'hospital-1', call);
    control.http(header, request);

    expect(refusal(() => control.http(header, request))).toBe(
      'replayed credential',
    );
  });

  it('Should not remember a token that does not match the request', () => {
    const control = access();
    const header = httpAuthorization(alice, 'hospital-1', call);
    const other = { ...request, path: '/fsm/transition' };

    expect(refusal(() => control.http(header, other))).toBe(
      'credential does not match the request',
    );
    expect(control.http(header, request).name).toBe('alice');
  });

  it.each([
    ['no header', undefined, 'missing credential'],
    ['an empty header', '', 'missing credential'],
    ['a Digest header', 'Digest username=alice', 'malformed credential'],
    ['a bearer of two parts', 'Bearer a.b', 'malformed credential'],
    ['another script token', `Bearer ${'A'.repeat(43)}`, 'invalid credential'],
    ['a short script token', 'Bearer abc', 'invalid credential'],
  ])('Should refuse %s', (_, header, message) => {
    expect(refusal(() => access().http(header, request))).toBe(message);
  });

  it('Should refuse the token of another DT', () => {
    const header = httpAuthorization(alice, 'hospital-2', call);

    expect(refusal(() => access().http(header, request))).toBe(
      'invalid claims',
    );
  });

  it('Should refuse an expired token', () => {
    const claims = { ...timeClaims('hospital-1', Date.now() - 120000) };
    const bound = {
      ...claims,
      htm: 'POST',
      htu: '/fsm/event',
      bh: bodyHash(body),
    };
    const token = signToken(
      alice.privateKey,
      { alg: 'Ed25519', kid: 'alice' },
      bound,
    );

    expect(refusal(() => access().http(`Bearer ${token}`, request))).toBe(
      'expired credential',
    );
  });

  it('Should take the script token in the role script', () => {
    const control = access();

    expect(control.scriptToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(control.http(`Bearer ${control.scriptToken}`, request)).toEqual({
      name: 'script',
      role: 'script',
    });
  });

  it('Should draw a new script token for each start', () => {
    expect(access().scriptToken).not.toBe(access().scriptToken);
  });
});

describe('Access over MQTT', () => {
  it('Should open the envelope of a listed principal', () => {
    const payload = mqttPayload(manager, 'hospital-1', TOPIC, {
      name: 'admit',
    });

    expect(access().mqtt(TOPIC, payload)).toEqual({
      principal: { name: 'manager-1', role: 'manager' },
      body: { name: 'admit' },
    });
  });

  it('Should give no body for an envelope without one', () => {
    const payload = mqttPayload(alice, 'hospital-1', TOPIC);

    expect(access().mqtt(TOPIC, payload).body).toBeUndefined();
  });

  it('Should refuse an envelope for another topic', () => {
    const payload = mqttPayload(alice, 'hospital-1', `${TOPIC}x`);

    expect(refusal(() => access().mqtt(TOPIC, payload))).toBe(
      'credential does not match the request',
    );
  });

  it('Should refuse a repeated envelope', () => {
    const control = access();
    const payload = mqttPayload(alice, 'hospital-1', TOPIC);
    control.mqtt(TOPIC, payload);

    expect(refusal(() => control.mqtt(TOPIC, payload))).toBe(
      'replayed credential',
    );
  });

  it.each([
    ['an empty payload', '', 'missing credential'],
    ['a plain request', '{"name":"admit"}', 'missing credential'],
    ['a payload of two parts', 'a.b', 'malformed credential'],
  ])('Should refuse %s', (_, payload, message) => {
    expect(refusal(() => access().mqtt(TOPIC, Buffer.from(payload)))).toBe(
      message,
    );
  });

  it('Should refuse the script token, which is for HTTP only', () => {
    const control = access();
    const payload = Buffer.from(control.scriptToken);

    expect(refusal(() => control.mqtt(TOPIC, payload))).toBe(
      'malformed credential',
    );
  });
});
