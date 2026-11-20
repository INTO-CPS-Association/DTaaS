import { KeyObject, verify } from 'node:crypto';
import { refuse } from './refusal.js';

// The fully specified name of RFC 9864, which deprecates EdDSA
export const ALG = 'Ed25519';

// A compact JWS (RFC 7515), decoded but not yet verified
export type Jws = {
  header: Record<string, unknown>;
  payload: unknown;
  signingInput: Buffer;
  signature: Buffer;
};

const SEGMENT = /^[A-Za-z0-9_-]+$/;

export const encodeSegment = (value: unknown): string =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

function decodeSegment(segment: string): unknown {
  try {
    return JSON.parse(Buffer.from(segment, 'base64url').toString());
  } catch {
    throw refuse('malformed');
  }
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// Three base64url segments, of which the first two are JSON and the
// first an object; anything else is malformed
export function parseJws(token: string): Jws {
  const segments = token.split('.');
  if (segments.length !== 3 || !segments.every((s) => SEGMENT.test(s))) {
    throw refuse('malformed');
  }
  const [header, payload, signature] = segments;
  const decoded = decodeSegment(header);
  if (!isObject(decoded)) {
    throw refuse('malformed');
  }
  return {
    header: decoded,
    payload: decodeSegment(payload),
    signingInput: Buffer.from(`${header}.${payload}`),
    signature: Buffer.from(signature, 'base64url'),
  };
}

function signedBy(jws: Jws, key: KeyObject | undefined): boolean {
  try {
    return (
      key !== undefined && verify(null, jws.signingInput, key, jws.signature)
    );
  } catch {
    return false;
  }
}

// The kid of a JWS that the key of its kid signed with Ed25519; any
// other algorithm, an unknown kid and a bad signature are alike
export function verifyJws(
  jws: Jws,
  keyOf: (kid: string) => KeyObject | undefined,
): string {
  const { alg, kid } = jws.header;
  if (alg !== ALG || typeof kid !== 'string' || !signedBy(jws, keyOf(kid))) {
    throw refuse('invalid');
  }
  return kid;
}
