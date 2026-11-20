import {
  createHash,
  generateKeyPairSync,
  KeyObject,
  randomBytes,
  sign,
} from 'node:crypto';
import { parseJws, verifyJws } from 'src/auth/jws';

// A caller of the runner: its name and private key, and its public key
// in the encoding of runner.yaml
export type Caller = { name: string; privateKey: KeyObject; publicKey: string };

export function newCaller(name: string): Caller {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const { x } = publicKey.export({ format: 'jwk' });
  return { name, privateKey, publicKey: String(x) };
}

const segment = (value: unknown): string =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

// A compact JWS of the claims, with any header
export function signToken(
  privateKey: KeyObject,
  header: object,
  claims: object,
): string {
  const input = `${segment(header)}.${segment(claims)}`;
  const signature = sign(null, Buffer.from(input), privateKey);
  return `${input}.${signature.toString('base64url')}`;
}

export const bodyHash = (body = ''): string =>
  createHash('sha256').update(body).digest('base64url');

// The claims every token has, issued now for 30 s
export function timeClaims(aud: string, now = Date.now()) {
  const iat = Math.floor(now / 1000);
  const jti = randomBytes(16).toString('base64url');
  return { aud, iat, exp: iat + 30, jti };
}

export type HttpCall = { method: string; path: string; body?: string };

// The Authorization header of an HTTP request of the caller
export function httpAuthorization(
  caller: Caller,
  aud: string,
  { method, path, body }: HttpCall,
): string {
  const claims = {
    ...timeClaims(aud),
    htm: method,
    htu: path,
    bh: bodyHash(body),
  };
  const header = { alg: 'Ed25519', kid: caller.name };
  return `Bearer ${signToken(caller.privateKey, header, claims)}`;
}

// The payload of an MQTT request of the caller: a JWS of the envelope
export function mqttPayload(
  caller: Caller,
  aud: string,
  topic: string,
  body?: unknown,
): Buffer {
  const claims = { ...timeClaims(aud), topic, body };
  const header = { alg: 'Ed25519', kid: caller.name };
  return Buffer.from(signToken(caller.privateKey, header, claims));
}

// The payload of a compact JWS that the key signed, with the kid if
// given, checked by the runner's own parseJws and verifyJws, which
// throw a 401 for anything else
export function verifiedPayload(
  text: string,
  key: KeyObject,
  kid?: string,
): unknown {
  const jws = parseJws(text);
  verifyJws(jws, (found) =>
    kid === undefined || found === kid ? key : undefined,
  );
  return jws.payload;
}
