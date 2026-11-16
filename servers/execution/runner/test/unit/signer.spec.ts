import { generateKeyPairSync, KeyObject } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { publicKeyObject } from 'src/auth/auth.config';
import { parseJws } from 'src/auth/jws';
import Signer from 'src/auth/signer';
import { verifiedPayload } from 'test/sign.util';

const notification = { kind: 'state', id: 'hospital-1', time: null, data: {} };

// The public key that the signer gives, as a receiver builds it
const keyOf = (signer: Signer): KeyObject =>
  publicKeyObject(String(signer.publicKey()));

describe('Signer', () => {
  const { privateKey } = generateKeyPairSync('ed25519');
  const signer = new Signer(privateKey, 'hospital-1');

  it('Should encode plain JSON without a key', () => {
    const plain = new Signer(undefined, 'hospital-1');

    expect([plain.encode(notification), plain.publicKey()]).toEqual([
      JSON.stringify(notification),
      null,
    ]);
    expect(plain.contentType()).toBe('application/json');
  });

  it('Should encode a JWS of the same JSON with a key', () => {
    const jws = signer.encode(notification);
    const [, payload] = jws.split('.');

    expect(parseJws(jws).header).toEqual({ alg: 'Ed25519', kid: 'hospital-1' });
    expect(Buffer.from(payload, 'base64url').toString()).toBe(
      JSON.stringify(notification),
    );
    expect(verifiedPayload(jws, keyOf(signer), 'hospital-1')).toEqual(
      notification,
    );
    expect(signer.contentType()).toBe('application/jose');
  });

  it('Should give a signature that a changed payload fails', () => {
    const [header, , signature] = signer.encode(notification).split('.');
    const changed = Buffer.from(
      JSON.stringify({ ...notification, id: 'hospital-2' }),
    ).toString('base64url');
    const forged = `${header}.${changed}.${signature}`;

    expect(() => verifiedPayload(forged, keyOf(signer))).toThrow(
      'invalid credential',
    );
  });

  it('Should give its public key as the x of its JWK', () => {
    const { x } = privateKey.export({ format: 'jwk' });

    expect(signer.publicKey()).toBe(x);
  });
});

describe('Signer.load', () => {
  let dir: string;

  const write = (name: string, key: KeyObject, type: 'pkcs8' | 'spki') => {
    writeFileSync(join(dir, name), key.export({ type, format: 'pem' }));
    return join(dir, name);
  };

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'runner-signer-'));
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('Should give a signer without a key without a file', () => {
    expect(Signer.load(undefined, 'dt-1').publicKey()).toBeNull();
  });

  it('Should read an Ed25519 private key', () => {
    const { privateKey } = generateKeyPairSync('ed25519');
    const file = write('dt.key', privateKey, 'pkcs8');

    expect(Signer.load(file, 'dt-1').publicKey()).toBe(
      privateKey.export({ format: 'jwk' }).x,
    );
  });

  it.each([
    ['a missing file', () => join(dir, 'missing.key')],
    [
      'an RSA key',
      () =>
        write(
          'rsa.key',
          generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey,
          'pkcs8',
        ),
    ],
    [
      'an X25519 key',
      () => write('x.key', generateKeyPairSync('x25519').privateKey, 'pkcs8'),
    ],
    [
      'a public key',
      () => write('dt.pub', generateKeyPairSync('ed25519').publicKey, 'spki'),
    ],
  ])('Should refuse %s, naming the file', (_, file) => {
    const path = file();

    expect(() => Signer.load(path, 'dt-1')).toThrow(path);
  });

  it('Should refuse an encrypted key without showing it', () => {
    const { privateKey } = generateKeyPairSync('ed25519');
    const pem = privateKey.export({
      type: 'pkcs8',
      format: 'pem',
      cipher: 'aes-256-cbc',
      passphrase: 'secret',
    });
    const file = join(dir, 'locked.key');
    writeFileSync(file, pem);
    const body = String(pem).split('\n')[1];

    expect(() => Signer.load(file, 'dt-1')).toThrow(file);
    expect(() => Signer.load(file, 'dt-1')).not.toThrow(body);
  });
});
