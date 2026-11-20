// Signs a request to a runner with access control, as a principal whose
// key keygen.mjs wrote. Without the key file the request goes unsigned,
// as a runner without access control expects.
//
//   node tools/sign.mjs http METHOD PATH [BODY]  prints "Bearer <jws>"
//   node tools/sign.mjs mqtt ROUTE [JSON]        prints the MQTT payload
//
// DT_ID is the id of the runner in its runner.yaml, and is required.
// DT_AS names the principal: alice for HTTP and manager-1 for MQTT
// unless given. DT_KEYS is the directory of the keys, ./keys unless
// given, and DT_BASE the MQTT base topic, dtaas/<DT_ID> unless given.
import { createHash, createPrivateKey, randomBytes, sign } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ID = process.env.DT_ID;
const BASE = process.env.DT_BASE ?? `dtaas/${ID}`;
const KEYS = process.env.DT_KEYS ?? 'keys';

const segment = (value) =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

// A compact JWS of the claims, bound to the DT for 30 s, or undefined
// without the key of the principal
function token(name, claims, aud) {
  const file = join(KEYS, `${name}.key`);
  if (!existsSync(file)) {
    return undefined;
  }
  const key = createPrivateKey(readFileSync(file));
  const iat = Math.floor(Date.now() / 1000);
  const jti = randomBytes(16).toString('base64url');
  const payload = { aud, iat, exp: iat + 30, jti, ...claims };
  const input = `${segment({ alg: 'Ed25519', kid: name })}.${segment(payload)}`;
  const signature = sign(null, Buffer.from(input), key);
  return `${input}.${signature.toString('base64url')}`;
}

// The Authorization header of an HTTP request to the DT, or undefined;
// the runner compares the path without its query
export function authorization(method, path, body = '', aud = ID) {
  const bh = createHash('sha256').update(body).digest('base64url');
  const htu = path.split('?')[0];
  const claims = { htm: method, htu, bh };
  const jws = token(process.env.DT_AS ?? 'alice', claims, aud);
  return jws && `Bearer ${jws}`;
}

// The payload of an MQTT request: the JWS envelope of the plain JSON,
// or the plain JSON itself without a key
export function envelope(route, json = '') {
  const body = json === '' ? undefined : JSON.parse(json);
  const topic = `${BASE}/${route}`;
  const name = process.env.DT_AS ?? 'manager-1';
  return token(name, { topic, body }, ID) ?? json;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [kind, ...rest] = process.argv.slice(2);
  if (ID === undefined || !['http', 'mqtt'].includes(kind)) {
    console.error(
      'usage: DT_ID=<id> node tools/sign.mjs http METHOD PATH [BODY]\n' +
        '       DT_ID=<id> node tools/sign.mjs mqtt ROUTE [JSON]',
    );
    process.exit(2);
  }
  const signed = kind === 'mqtt' ? envelope(...rest) : authorization(...rest);
  process.stdout.write(signed ?? '');
}
