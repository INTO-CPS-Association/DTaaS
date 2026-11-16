import { describe, expect, it } from '@jest/globals';
import {
  launchArgs,
  refusedName,
  SCRIPT_PATH,
  scriptBase,
} from 'src/scripts/launch';
import { ACCOUNT } from './scripts.fake-fs';

const user = { account: ACCOUNT, runDirectory: '/var/lib/dt/run' };

const inherited = {
  HOME: '/home/runner',
  USER: 'dt-runner',
  PATH: '/opt/node/bin:/usr/bin',
  TMPDIR: '/var/tmp',
  LANG: 'C.UTF-8',
  RUNNER_SECRET: 'hunter2',
  NODE_OPTIONS: '--inspect',
};

describe('Launch of a script as the script account', () => {
  it('Should give the arguments of setpriv with the numbers', () => {
    expect(launchArgs(ACCOUNT, '/srv/dt/scripts/open')).toEqual([
      '--reuid=999',
      '--regid=986',
      '--init-groups',
      '--inh-caps=-all',
      '--ambient-caps=-all',
      '--no-new-privs',
      '--',
      '/srv/dt/scripts/open',
    ]);
  });

  it('Should leave out --reset-env and --bounding-set', () => {
    const args = launchArgs(ACCOUNT, 'open').join(' ');

    expect(args).not.toContain('--reset-env');
    expect(args).not.toContain('--bounding-set');
  });

  it("Should start from the runner's environment without a user", () => {
    expect(scriptBase(undefined, inherited)).toBe(inherited);
  });

  it('Should start from the allow-list with a user', () => {
    expect(scriptBase(user, inherited)).toEqual({
      HOME: '/nonexistent',
      USER: 'dt-script',
      LOGNAME: 'dt-script',
      PATH: SCRIPT_PATH,
      TMPDIR: '/var/tmp',
      LANG: 'C.UTF-8',
    });
  });

  it('Should leave TMPDIR and LANG unset when the runner has none', () => {
    const base = scriptBase(user, { HOME: '/root' });

    expect(base.TMPDIR).toBeUndefined();
    expect(base.LANG).toBeUndefined();
  });

  it.each([
    'LD_PRELOAD',
    'LD_LIBRARY_PATH',
    'MALLOC_CHECK_',
    'GCONV_PATH',
    'GLIBC_TUNABLES',
    'TMPDIR',
    'LANG',
    'LANGUAGE',
    'LC_ALL',
    'LC_CTYPE',
  ])('Should refuse the name %s', (name) => {
    expect(refusedName(name)).toBe(true);
  });

  it.each(['PATH', 'POLL_MS', 'HOME', 'LDAP_URL', 'XLC_ALL'])(
    'Should take the name %s',
    (name) => {
      expect(refusedName(name)).toBe(false);
    },
  );
});
