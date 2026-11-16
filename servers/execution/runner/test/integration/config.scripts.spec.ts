import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import Keyv from 'keyv';
import Config from 'src/config/configuration.service';
import { HOST } from 'src/scripts/separation';

const BASE = 'id: dt-1\nport: 5000\nlocation: .\ncommands: [create]\n';

const TEXTS: Record<string, string> = {
  '/etc/passwd': 'dt-script:x:999:986::/nonexistent:/usr/sbin/nologin\n',
  '/etc/group': 'dt-script:x:986:\n',
  '/proc/self/status': 'CapEff:\t00000000000000e0\nCapAmb:\t00000000000000e0\n',
};

// A Linux host with the capabilities, on which the account may search
// every directory and write only the run directory
function fakeLinux(run: string) {
  jest.replaceProperty(HOST, 'platform', 'linux');
  jest.spyOn(HOST, 'getuid').mockReturnValue(1000);
  jest.spyOn(HOST, 'readText').mockImplementation((path) => TEXTS[path]);
  jest.spyOn(HOST, 'accessSync').mockReturnValue(undefined);
  jest.replaceProperty(HOST, 'fs', {
    statSync: (path: string) => ({
      mode: path === run ? 0o777 : 0o711,
      uid: 1000,
      gid: 1000,
      isDirectory: () => true,
    }),
    realpathSync: (path: string) => path,
    readdirSync: () => [],
  });
}

describe('Configuration of the script account', () => {
  let dir: string;
  let config: Config;

  const load = async (text: string) => {
    writeFileSync(join(dir, 'runner.yaml'), text);
    const options = new Keyv();
    await options.set('configFile', join(dir, 'runner.yaml'));
    await config.loadConfig(options);
  };

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'runner-scripts-'));
    config = new Config();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    rmSync(dir, { recursive: true, force: true });
  });

  it('Should run the scripts as the runner without the section', async () => {
    await load(BASE);

    expect(config.getScriptUser()).toBeUndefined();
  });

  it('Should resolve the run directory against runner.yaml', async () => {
    fakeLinux(resolve(dir, 'run'));
    await load(`${BASE}scripts:\n  user: dt-script\n  runDirectory: run\n`);

    expect(config.getScriptUser()).toEqual({
      account: expect.objectContaining({ name: 'dt-script', uid: 999 }),
      runDirectory: resolve(dir, 'run'),
    });
  });

  it('Should take an absolute run directory as it is', async () => {
    const run = join(tmpdir(), 'runner-scripts-run');
    fakeLinux(run);
    await load(`${BASE}scripts:\n  user: 999\n  runDirectory: '${run}'\n`);

    expect(config.getScriptUser()?.runDirectory).toBe(run);
  });

  it('Should refuse the section on this host without the rights', async () => {
    const text = `${BASE}scripts:\n  user: dt-script\n  runDirectory: run\n`;

    await expect(load(text)).rejects.toThrow('See PRIVILEGE-SETUP.md.');
  });

  it('Should refuse an empty section, naming the file', async () => {
    await expect(load(`${BASE}scripts:\n`)).rejects.toThrow(
      `Invalid configuration in ${join(dir, 'runner.yaml')}`,
    );
  });
});
