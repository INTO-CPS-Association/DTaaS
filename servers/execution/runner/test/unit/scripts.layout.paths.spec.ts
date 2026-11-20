import { describe, expect, it } from '@jest/globals';
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
const problems = (changes: FakeTree) =>
  layoutProblems(PATHS, ACCOUNT, fakeFs({ ...goodTree(), ...changes }));

const withoutNode = (path: string): FakeTree => {
  const tree = goodTree();
  delete tree[path];
  return tree;
};

const runnerDir = (mode: number) => ({ mode, uid: RUNNER_UID, dir: true });

describe('Layout of the database for the script account', () => {
  // x alone lets the account open a file whose name it knows
  it('Should name a database directory that grants only x', () => {
    expect(problems({ '/var/lib/dt/db': runnerDir(0o711) })).toEqual([
      '/var/lib/dt/db grants access to dt-script: mode 711, owner 998, group 0',
      '/var/lib/dt/db/runner.db is readable by dt-script: mode 644, owner 998, group 998',
    ]);
  });

  it('Should name a database directory that grants only r', () => {
    expect(problems({ '/var/lib/dt/db': runnerDir(0o704) })).toEqual([
      '/var/lib/dt/db grants access to dt-script: mode 704, owner 998, group 0',
    ]);
  });

  it('Should name an open database directory and a readable file', () => {
    expect(problems({ '/var/lib/dt/db': runnerDir(0o755) })).toEqual([
      '/var/lib/dt/db grants access to dt-script: mode 755, owner 998, group 0',
      '/var/lib/dt/db/runner.db is readable by dt-script: mode 644, owner 998, group 998',
    ]);
  });

  it('Should take a missing database file as no problem', () => {
    const tree = withoutNode('/var/lib/dt/db/runner.db');

    expect(layoutProblems(PATHS, ACCOUNT, fakeFs(tree))).toEqual([]);
  });
});

describe('Layout of the scripts for the script account', () => {
  it('Should walk the scripts directory recursively', () => {
    expect(
      problems({
        '/srv/dt/scripts/lib/ward.sh': { mode: 0o666, uid: RUNNER_UID },
      }),
    ).toEqual([
      '/srv/dt/scripts/lib/ward.sh is writable by dt-script: mode 666, owner 998, group 0',
    ]);
  });

  it('Should name a scripts directory that a group of the account may write', () => {
    expect(
      problems({
        '/srv/dt/scripts': {
          mode: 0o775,
          uid: RUNNER_UID,
          gid: 1001,
          dir: true,
        },
      }),
    ).toEqual([
      '/srv/dt/scripts is writable by dt-script: mode 775, group 1001 is a group of dt-script',
    ]);
  });

  it('Should name the ancestors of a script that links out', () => {
    expect(
      problems({
        '/srv/dt/scripts/open': { link: '/tmp/open' },
        '/tmp': { mode: 0o777, dir: true },
        '/tmp/open': { mode: 0o755, uid: RUNNER_UID },
      }),
    ).toEqual([
      '/tmp is writable by dt-script, above a protected path: mode 777, owner 0, group 0',
    ]);
  });

  it('Should end the walk at a link back into the tree', () => {
    expect(
      problems({ '/srv/dt/scripts/lib/self': { link: '/srv/dt/scripts' } }),
    ).toEqual([]);
  });

  it('Should take a missing scripts directory as no problem', () => {
    const tree = withoutNode('/srv/dt/scripts');

    expect(layoutProblems(PATHS, ACCOUNT, fakeFs(tree))).toEqual([]);
  });
});

describe('Layout of the run directory for the script account', () => {
  it('Should name a run directory that the account may not write', () => {
    expect(problems({ '/var/lib/dt/run': runnerDir(0o755) })).toEqual([
      '/var/lib/dt/run is not writable by dt-script: mode 755, owner 998, group 0',
    ]);
  });

  it('Should name an ancestor that the account may not search', () => {
    expect(
      problems({
        '/var/lib/dt': runnerDir(0o750),
        '/var/lib/dt/run': { mode: 0o777, dir: true },
      }),
    ).toEqual([
      '/var/lib/dt is not searchable by dt-script: mode 750, owner 998, group 0',
    ]);
  });

  it('Should name a missing run directory', () => {
    expect(
      layoutProblems(PATHS, ACCOUNT, fakeFs(withoutNode('/var/lib/dt/run'))),
    ).toEqual(['/var/lib/dt/run does not exist or is not a directory']);
  });

  it('Should name every problem in the order of the paths', () => {
    expect(
      problems({
        '/etc/dt/runner.yaml': { mode: 0o644, uid: RUNNER_UID },
        '/srv/dt/scripts/open': { mode: 0o777, uid: RUNNER_UID },
        '/var/lib/dt/run': runnerDir(0o755),
      }),
    ).toEqual([
      '/etc/dt/runner.yaml is readable by dt-script: mode 644, owner 998, group 0',
      '/srv/dt/scripts/open is writable by dt-script: mode 777, owner 998, group 0',
      '/var/lib/dt/run is not writable by dt-script: mode 755, owner 998, group 0',
    ]);
  });
});
