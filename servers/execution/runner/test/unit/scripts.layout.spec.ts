import { describe, expect, it } from '@jest/globals';
import { access } from 'src/scripts/layout.access';
import { layoutProblems } from 'src/scripts/layout';
import {
  ACCOUNT,
  type FakeTree,
  fakeFs,
  goodTree,
  PATHS,
  RUNNER_UID,
} from './scripts.fake-fs';

// The problems of the good tree with some of its nodes changed
const problems = (changes: FakeTree, paths = PATHS) =>
  layoutProblems(paths, ACCOUNT, fakeFs({ ...goodTree(), ...changes }));

const stat = (mode: number, uid: number, gid: number) => ({
  mode,
  uid,
  gid,
  isDirectory: () => false,
});

describe('Access of the script account to a path', () => {
  it.each([
    [
      'the owner bits to the owner',
      0o640,
      999,
      0,
      { r: true, w: true, x: false },
    ],
    [
      'the group bits to a group',
      0o640,
      0,
      1001,
      { r: true, w: false, x: false },
    ],
    [
      'the other bits to the rest',
      0o644,
      0,
      0,
      { r: true, w: false, x: false },
    ],
    ['the owner bits alone', 0o077, 999, 986, { r: false, w: false, x: false }],
    ['the group bits alone', 0o705, 0, 986, { r: false, w: false, x: false }],
  ])('Should apply %s', (_, mode, uid, gid, rights) => {
    expect(access(stat(mode, uid, gid), ACCOUNT)).toEqual(rights);
  });
});

describe('Layout of the runner for the script account', () => {
  it('Should find no problem in a good layout', () => {
    expect(problems({})).toEqual([]);
  });

  it('Should find no problem in a layout without the optional paths', () => {
    const { config, scripts, run } = PATHS;

    expect(problems({}, { config, scripts, run })).toEqual([]);
  });

  it('Should name a configuration that others may read', () => {
    expect(
      problems({ '/etc/dt/runner.yaml': { mode: 0o644, uid: RUNNER_UID } }),
    ).toEqual([
      '/etc/dt/runner.yaml is readable by dt-script: mode 644, owner 998, group 0',
    ]);
  });

  it('Should name a key that a group of the account may read', () => {
    expect(
      problems({
        '/etc/dt/keys': { mode: 0o750, gid: 1001, dir: true },
        '/etc/dt/keys/h.key': { mode: 0o640, gid: 1001 },
      }),
    ).toEqual([
      '/etc/dt/keys/h.key is readable by dt-script: mode 640, group 1001 is a group of dt-script',
    ]);
  });

  it('Should name a state machine file that the account owns', () => {
    expect(problems({ '/etc/dt/fsm.yaml': { mode: 0o600, uid: 999 } })).toEqual(
      [
        '/etc/dt/fsm.yaml is readable by dt-script: mode 600, owner 999 is dt-script',
        '/etc/dt/fsm.yaml is writable by dt-script: mode 600, owner 999 is dt-script',
      ],
    );
  });

  it('Should take a path beneath a closed directory as unreadable', () => {
    expect(
      problems({
        '/etc/dt': { mode: 0o750, uid: RUNNER_UID, dir: true },
        '/etc/dt/runner.yaml': { mode: 0o666, uid: RUNNER_UID },
      }),
    ).toEqual([]);
  });

  it('Should name a writable ancestor of a protected path', () => {
    expect(
      problems({ '/etc/dt': { mode: 0o777, uid: RUNNER_UID, dir: true } }),
    ).toEqual([
      '/etc/dt is writable by dt-script, above a protected path: mode 777, owner 998, group 0',
    ]);
  });

  it('Should name a writable ancestor beneath a closed one', () => {
    expect(
      problems({
        '/etc': { mode: 0o777, dir: true },
        '/etc/dt': { mode: 0o700, uid: RUNNER_UID, dir: true },
      }),
    ).toEqual([
      '/etc is writable by dt-script, above a protected path: mode 777, owner 0, group 0',
    ]);
  });

  it('Should take a sticky ancestor as safe for an entry of another owner', () => {
    expect(problems({ '/etc': { mode: 0o1777, dir: true } })).toEqual([]);
  });

  it('Should name a sticky ancestor of an entry that the account owns', () => {
    expect(
      problems({
        '/etc': { mode: 0o1777, dir: true },
        '/etc/dt': { mode: 0o755, uid: 999, dir: true },
      }),
    ).toEqual([
      '/etc/dt is writable by dt-script, above a protected path: mode 755, owner 999 is dt-script',
      '/etc is writable by dt-script, above a protected path: mode 1777, owner 0, group 0',
    ]);
  });

  it('Should judge a symbolic link by its target', () => {
    expect(
      problems({
        '/etc/dt/runner.yaml': { link: '/opt/conf/runner.yaml' },
        '/opt': { mode: 0o755, dir: true },
        '/opt/conf': { mode: 0o777, dir: true },
        '/opt/conf/runner.yaml': { mode: 0o644, uid: RUNNER_UID },
      }),
    ).toEqual([
      '/opt/conf/runner.yaml is readable by dt-script: mode 644, owner 998, group 0',
      '/opt/conf is writable by dt-script, above a protected path: mode 777, owner 0, group 0',
    ]);
  });

  it('Should name a writable directory that holds a link', () => {
    expect(
      problems({
        '/etc/dt': { mode: 0o777, uid: RUNNER_UID, dir: true },
        '/etc/dt/runner.yaml': { link: '/opt/runner.yaml' },
        '/opt': { mode: 0o755, dir: true },
        '/opt/runner.yaml': { mode: 0o600, uid: RUNNER_UID },
      }),
    ).toContain(
      '/etc/dt is writable by dt-script, above a protected path: mode 777, owner 998, group 0',
    );
  });
});
