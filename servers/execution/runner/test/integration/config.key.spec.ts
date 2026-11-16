import { generateKeyPairSync } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import Keyv from 'keyv';
import Access from 'src/auth/access';
import { publicKeyObject } from 'src/auth/auth.config';
import Config from 'src/config/configuration.service';
import { newCaller, verifiedPayload } from 'test/sign.util';

const BASE = 'id: dt-1\nport: 5000\nlocation: .\ncommands: [create]\n';

describe('Configuration of the signing key', () => {
  let dir: string;
  let config: Config;

  const load = async (text: string) => {
    writeFileSync(join(dir, 'runner.yaml'), text);
    const options = new Keyv();
    await options.set('configFile', join(dir, 'runner.yaml'));
    await config.loadConfig(options);
  };

  // An Ed25519 key in dir/keys/dt-1.key, and its public key
  const keyFile = (): string => {
    const { privateKey, publicKey } = generateKeyPairSync('ed25519');
    mkdirSync(join(dir, 'keys'));
    const pem = privateKey.export({ type: 'pkcs8', format: 'pem' });
    writeFileSync(join(dir, 'keys', 'dt-1.key'), pem);
    return String(publicKey.export({ format: 'jwk' }).x);
  };

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'runner-key-'));
    config = new Config();
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('Should not sign by default', async () => {
    expect(config.getSigner().publicKey()).toBeNull();
    await load(BASE);
    expect(config.getSigner().publicKey()).toBeNull();
  });

  it('Should sign with the key relative to runner.yaml, open to all', async () => {
    const publicKey = keyFile();
    await load(`${BASE}auth:\n  key: keys/dt-1.key\n`);

    expect(config.getSigner().publicKey()).toBe(publicKey);
    const jws = config.getSigner().encode({ id: 'dt-1' });
    const key = publicKeyObject(publicKey);
    expect(verifiedPayload(jws, key, 'dt-1')).toEqual({ id: 'dt-1' });
    expect(config.access()).toBeUndefined();
  });

  it('Should take an absolute key path as it is', async () => {
    const publicKey = keyFile();
    await load(`${BASE}auth:\n  key: '${join(dir, 'keys', 'dt-1.key')}'\n`);

    expect(config.getSigner().publicKey()).toBe(publicKey);
  });

  it('Should verify the callers and sign with principals and a key', async () => {
    const publicKey = keyFile();
    const alice = newCaller('alice');
    await load(
      `${BASE}auth:\n  key: keys/dt-1.key\n  principals:\n` +
        `    - {name: alice, role: client, publicKey: '${alice.publicKey}'}\n`,
    );

    expect(config.access()).toBeInstanceOf(Access);
    expect(config.getSigner().publicKey()).toBe(publicKey);
  });

  it('Should refuse a key that cannot be read, naming it', async () => {
    await expect(load(`${BASE}auth:\n  key: keys/none.key\n`)).rejects.toThrow(
      join(dir, 'keys', 'none.key'),
    );
  });
});
