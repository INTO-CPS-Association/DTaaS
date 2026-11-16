import { describe, expect, it } from '@jest/globals';
import type { ConfigValues } from 'src/config/config.interface';
import { checkSeparation, type Host } from 'src/scripts/separation';
import {
  type FakeTree,
  fakeFs,
  goodTree,
  PATHS,
  RUNNER_UID,
} from './scripts.fake-fs';

const FILE = PATHS.config;

const PASSWD = [
  'root:x:0:0:root:/root:/bin/bash',
  'dt-runner:x:998:998::/var/lib/dt:/usr/sbin/nologin',
  'dt-script:x:999:986::/nonexistent:/usr/sbin/nologin',
].join('\n');

const GROUP = [
  'root:x:0:',
  'dt-script:x:986:',
  'sensors:x:1001:dt-script',
].join('\n');

const status = (caps: string) => `CapEff:\t${caps}\nCapAmb:\t${caps}\n`;

const TEXTS: Record<string, string> = {
  '/etc/passwd': PASSWD,
  '/etc/group': GROUP,
  '/proc/self/status': status('00000000000000e0'),
};

// A Linux host on which every check passes, with some members changed
const host = (changes: Partial<Host> = {}, tree: FakeTree = {}): Host => ({
  platform: 'linux',
  getuid: () => RUNNER_UID,
  readText: (path) => TEXTS[path],
  accessSync: () => undefined,
  fs: fakeFs({ ...goodTree(), ...tree }),
  ...changes,
});

const values = (scripts?: ConfigValues['scripts']): ConfigValues => ({
  id: 'hospital-1',
  attributes: {},
  port: 5000,
  location: PATHS.scripts,
  commands: ['open'],
  database: PATHS.database,
  stateMachine: PATHS.stateMachine,
  auth: { key: PATHS.key },
  peers: [],
  scripts,
});

const SCRIPTS = { user: 'dt-script', runDirectory: PATHS.run };

const check = (changes?: Partial<Host>, scripts: object = {}) =>
  checkSeparation(FILE, values({ ...SCRIPTS, ...scripts }), host(changes));

describe('Checks of scripts.user at startup', () => {
  it('Should check nothing without the section', () => {
    const untouched = host({
      readText: () => {
        throw new Error('read');
      },
    });

    expect(checkSeparation(FILE, values(), untouched)).toBeUndefined();
  });

  it('Should give the account and the run directory', () => {
    expect(check()).toEqual({
      account: {
        name: 'dt-script',
        uid: 999,
        gid: 986,
        home: '/nonexistent',
        groups: [986, 1001],
      },
      runDirectory: PATHS.run,
    });
  });

  it.each(['win32', 'darwin'] as const)(
    'Should refuse to start on %s',
    (platform) => {
      expect(() => check({ platform })).toThrow(
        `scripts.user in ${FILE} is supported on Linux only. See PRIVILEGE-SETUP.md.`,
      );
    },
  );

  it('Should refuse a runner that runs as root', () => {
    expect(() => check({ getuid: () => 0 })).toThrow(
      'scripts.user refuses a runner that runs as root.',
    );
  });

  it('Should refuse without /usr/bin/setpriv', () => {
    const accessSync = () => {
      throw new Error('ENOENT');
    };

    expect(() => check({ accessSync })).toThrow(
      'scripts.user needs /usr/bin/setpriv, which is missing.',
    );
  });

  it('Should name the missing capabilities', () => {
    const readText = (path: string) =>
      path === '/proc/self/status' ? status('0000000000000040') : TEXTS[path];

    expect(() => check({ readText })).toThrow(
      'scripts.user needs CAP_SETUID, CAP_SETGID and CAP_KILL as ambient ' +
        'capabilities of the runner; missing: CAP_SETUID, CAP_KILL. ' +
        'See PRIVILEGE-SETUP.md.',
    );
  });

  it('Should refuse an account that is not in /etc/passwd', () => {
    expect(() => check({}, { user: 'nobody' })).toThrow(
      'scripts.user nobody is not in /etc/passwd. See PRIVILEGE-SETUP.md.',
    );
  });

  it.each([
    ['root', { user: 'root' }],
    ["the runner's own account", { user: 998 }],
    ['the root group', { group: 0 }],
  ])('Should refuse %s', (_, scripts) => {
    expect(() => check({}, scripts)).toThrow(
      "must be neither root nor the runner's account, and its group not root.",
    );
  });

  it('Should name every offending path in one error', () => {
    const bad = host(
      {},
      {
        '/etc/dt/runner.yaml': { mode: 0o644, uid: RUNNER_UID },
        '/var/lib/dt/run': { mode: 0o755, uid: RUNNER_UID, dir: true },
      },
    );

    expect(() => checkSeparation(FILE, values(SCRIPTS), bad)).toThrow(
      [
        `Cannot run the scripts as dt-script (scripts.user in ${FILE}):`,
        '✖ /etc/dt/runner.yaml is readable by dt-script: mode 644, owner 998, group 0',
        '✖ /var/lib/dt/run is not writable by dt-script: mode 755, owner 998, group 0',
        'See PRIVILEGE-SETUP.md.',
      ].join('\n'),
    );
  });

  it('Should check the capabilities before the layout', () => {
    const readText = (path: string) =>
      path === '/proc/self/status' ? '' : TEXTS[path];
    const bad = host({ readText }, { '/etc/dt/runner.yaml': { mode: 0o644 } });

    expect(() => checkSeparation(FILE, values(SCRIPTS), bad)).toThrow(
      'missing: CAP_SETUID, CAP_SETGID, CAP_KILL.',
    );
  });
});
