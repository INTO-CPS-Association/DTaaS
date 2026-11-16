// Unwraps what a runner sends: plain JSON, or a compact JWS that the
// runner signs with auth.key, verified with the public key of the DT in
// run/keys/<id>.pub, which keygen.mjs writes beside the key. Gives
// { mark, value } with mark verified or UNSIGNED, or { mark: 'INVALID',
// reason, unverified }: the reason it failed, and the payload decoded
// without a check when it can be. Standalone on purpose: it is the
// runnable form of the verifier of API.md, "Signatures".
import { createPublicKey, verify } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const keyFile = (id) =>
  fileURLToPath(new URL(`../run/keys/${id}.pub`, import.meta.url));

const decode = (part) => JSON.parse(Buffer.from(part, 'base64url'));

// Read on each call, as a recording may write the key after it starts;
// a file that is missing or half written is no key
function readKey(id) {
  const file = keyFile(id);
  if (!existsSync(file)) {
    return { reason: 'no key file' };
  }
  try {
    const x = readFileSync(file, 'utf8').trim();
    const jwk = { kty: 'OKP', crv: 'Ed25519', x };
    return { key: createPublicKey({ key: jwk, format: 'jwk' }) };
  } catch {
    return { reason: 'unreadable key file' };
  }
}

// The header of a JWS of three segments, or undefined
function header(segments) {
  try {
    return segments.length === 3 ? decode(segments[0]) : undefined;
  } catch {
    return undefined;
  }
}

// A signature of another length makes verify throw
function signedBy(segments, key) {
  const [head, payload, signature] = segments;
  const bytes = Buffer.from(signature, 'base64url');
  try {
    return verify(null, Buffer.from(`${head}.${payload}`), key, bytes);
  } catch {
    return false;
  }
}

// Why the JWS fails, the first check that does, or undefined when the
// key of the DT verifies it
function failure(segments, id) {
  const { alg, kid } = header(segments) ?? {};
  const { key, reason } = readKey(id);
  const checks = [
    [() => alg === undefined, 'malformed'],
    [() => key === undefined, reason],
    [() => alg !== 'Ed25519', `wrong alg ${alg}`],
    [() => kid !== id, `wrong kid ${kid}`],
    [() => !signedBy(segments, key), 'bad signature'],
  ];
  return checks.find(([fails]) => fails())?.[1];
}

// The payload decoded without a check, or undefined
function peek(segments) {
  try {
    return decode(segments[1]);
  } catch {
    return undefined;
  }
}

// Plain JSON, such as a notification or the array of a history reply,
// or undefined; a JWS never parses as JSON
function plain(text) {
  try {
    return { mark: 'UNSIGNED', value: JSON.parse(text) };
  } catch {
    return undefined;
  }
}

// A message of the DT of the given id, or without one of the DT that
// the payload names, such as a post to the webhook, which every DT sends
export default function unwrap(text, id) {
  const unsigned = plain(text);
  if (unsigned !== undefined) {
    return unsigned;
  }
  const segments = text.split('.');
  const reason = failure(segments, id ?? peek(segments)?.id);
  return reason === undefined
    ? { mark: 'verified', value: decode(segments[1]) }
    : { mark: 'INVALID', reason, unverified: peek(segments) };
}
