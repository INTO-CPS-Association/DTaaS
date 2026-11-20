import { generateKeyPairSync } from 'node:crypto';
import { describe, expect, it } from '@jest/globals';
import { UnauthorizedException } from '@nestjs/common';
import { publicKeyObject } from 'src/auth/auth.config';
import { encodeSegment, parseJws, verifyJws } from 'src/auth/jws';
import { newCaller, signToken } from 'test/sign.util';

const alice = newCaller('alice');
const mallory = newCaller('mallory');
const keys = new Map([['alice', publicKeyObject(alice.publicKey)]]);
const keyOf = (kid: string) => keys.get(kid);

const claims = { aud: 'hospital-1', jti: 'abc' };
const header = { alg: 'Ed25519', kid: 'alice' };
const token = signToken(alice.privateKey, header, claims);

// The message of the 401 that the call throws
function refusal(call: () => unknown): string {
  try {
    call();
  } catch (error) {
    expect(error).toBeInstanceOf(UnauthorizedException);
    return (error as UnauthorizedException).message;
  }
  return 'accepted';
}

const verified = (jws: string) => verifyJws(parseJws(jws), keyOf);

describe('JWS', () => {
  it('Should verify a token of a listed principal', () => {
    const jws = parseJws(token);

    expect(verifyJws(jws, keyOf)).toBe('alice');
    expect(jws.payload).toEqual(claims);
  });

  it('Should encode a segment as base64url JSON', () => {
    expect(token.split('.')[1]).toBe(encodeSegment(claims));
  });

  it.each([
    ['alg none', { alg: 'none', kid: 'alice' }],
    ['alg EdDSA', { alg: 'EdDSA', kid: 'alice' }],
    ['alg HS256', { alg: 'HS256', kid: 'alice' }],
    ['no kid', { alg: 'Ed25519' }],
    ['a kid that is not a string', { alg: 'Ed25519', kid: 1 }],
    ['an unknown kid', { alg: 'Ed25519', kid: 'bob' }],
  ])('Should refuse a token with %s', (_, otherHeader) => {
    const jws = signToken(alice.privateKey, otherHeader, claims);

    expect(refusal(() => verified(jws))).toBe('invalid credential');
  });

  it('Should refuse a token signed with another key', () => {
    const jws = signToken(mallory.privateKey, header, claims);

    expect(refusal(() => verified(jws))).toBe('invalid credential');
  });

  it('Should refuse a token whose claims were changed', () => {
    const [head, , signature] = token.split('.');
    const changed = encodeSegment({ ...claims, aud: 'hospital-2' });

    expect(refusal(() => verified(`${head}.${changed}.${signature}`))).toBe(
      'invalid credential',
    );
  });

  it('Should refuse a token whose key can not verify Ed25519', () => {
    const { publicKey } = generateKeyPairSync('x25519');

    expect(refusal(() => verifyJws(parseJws(token), () => publicKey))).toBe(
      'invalid credential',
    );
  });

  it('Should refuse a signature of the wrong length', () => {
    const [head, body] = token.split('.');

    expect(refusal(() => verified(`${head}.${body}.AAAA`))).toBe(
      'invalid credential',
    );
  });

  it.each([
    ['two parts', token.split('.').slice(0, 2).join('.')],
    ['four parts', `${token}.x`],
    ['an empty part', `${token.split('.')[0]}..x`],
    ['a part outside base64url', token.replace('.', '.+')],
    [
      'a header that is not JSON',
      `bm90IGpzb24.${token.slice(token.indexOf('.') + 1)}`,
    ],
    ['a header that is not an object', `${encodeSegment([1])}.e30.x`],
    ['claims that are not JSON', `${encodeSegment(header)}.bm90IGpzb24.x`],
  ])('Should refuse %s as malformed', (_, jws) => {
    expect(refusal(() => parseJws(jws))).toBe('malformed credential');
  });
});
