import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import Keyv from 'keyv';
import Access from 'src/auth/access';
import Config from 'src/config/configuration.service';
import { httpAuthorization, newCaller } from 'test/sign.util';

const alice = newCaller('alice');

const BASE = 'id: dt-1\nport: 5000\nlocation: .\ncommands: [create]\n';

const AUTH = `auth:
  principals:
    - name: alice
      role: client
      publicKey: '${alice.publicKey}'
`;

describe('Configuration of access control', () => {
  let dir: string;
  let config: Config;

  const load = async (text: string) => {
    writeFileSync(join(dir, 'runner.yaml'), text);
    const options = new Keyv();
    await options.set('configFile', join(dir, 'runner.yaml'));
    await config.loadConfig(options);
  };

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'runner-auth-'));
    config = new Config();
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('Should have no access control by default', async () => {
    expect(config.access()).toBeUndefined();
    await load(BASE);
    expect(config.access()).toBeUndefined();
  });

  it('Should verify the principals of the auth section for its id', async () => {
    await load(`${BASE}${AUTH}`);
    const call = { method: 'GET', path: '/state' };
    const header = httpAuthorization(alice, 'dt-1', call);

    expect(config.access()).toBeInstanceOf(Access);
    expect(config.access()?.http(header, call)).toEqual({
      name: 'alice',
      role: 'client',
    });
  });

  it('Should refuse an auth section without principals', async () => {
    await expect(load(`${BASE}auth: {principals: []}\n`)).rejects.toThrow(
      /Invalid configuration in .*runner.yaml:[\s\S]*at least one principal/,
    );
    await expect(load(`${BASE}auth:\n`)).rejects.toThrow(/at auth/);
  });
});
