import { posix } from 'node:path';
import type { Account } from 'src/scripts/account';
import type { LayoutFs } from 'src/scripts/layout.access';
import type { LayoutPaths } from 'src/scripts/layout';

// A path of the fake file system; a link names its target
export type FakeNode = {
  mode?: number;
  uid?: number;
  gid?: number;
  dir?: boolean;
  link?: string;
};

export type FakeTree = Record<string, FakeNode>;

export const ACCOUNT: Account = {
  name: 'dt-script',
  uid: 999,
  gid: 986,
  home: '/nonexistent',
  groups: [986, 1001],
};

export const RUNNER_UID = 998;

const dir = (mode: number, uid = 0, gid = 0): FakeNode => ({
  mode,
  uid,
  gid,
  dir: true,
});

const file = (mode: number, uid = RUNNER_UID, gid = RUNNER_UID): FakeNode => ({
  mode,
  uid,
  gid,
});

// A layout that passes: root's directories, the runner's files, and a
// run directory that the account's group may write
export const goodTree = (): FakeTree => ({
  '/': dir(0o755),
  '/etc': dir(0o755),
  '/etc/dt': dir(0o755, RUNNER_UID),
  '/etc/dt/runner.yaml': file(0o600),
  '/etc/dt/fsm.yaml': file(0o600),
  '/etc/dt/keys': dir(0o700, RUNNER_UID),
  '/etc/dt/keys/h.key': file(0o600),
  '/var': dir(0o755),
  '/var/lib': dir(0o755),
  '/var/lib/dt': dir(0o755, RUNNER_UID),
  '/var/lib/dt/db': dir(0o700, RUNNER_UID),
  '/var/lib/dt/db/runner.db': file(0o644),
  '/var/lib/dt/run': dir(0o770, RUNNER_UID, 986),
  '/srv': dir(0o755),
  '/srv/dt': dir(0o755, RUNNER_UID),
  '/srv/dt/scripts': dir(0o755, RUNNER_UID),
  '/srv/dt/scripts/open': file(0o755),
  '/srv/dt/scripts/lib': dir(0o755, RUNNER_UID),
  '/srv/dt/scripts/lib/ward.sh': file(0o644),
});

export const PATHS: LayoutPaths = {
  config: '/etc/dt/runner.yaml',
  key: '/etc/dt/keys/h.key',
  stateMachine: '/etc/dt/fsm.yaml',
  database: '/var/lib/dt/db/runner.db',
  scripts: '/srv/dt/scripts',
  run: '/var/lib/dt/run',
};

// Follows every link on the way, as the kernel does
function resolve(tree: FakeTree, path: string): string {
  return path
    .split('/')
    .filter((part) => part !== '')
    .reduce((current, part) => {
      const next = posix.join(current, part);
      const link = tree[next]?.link;
      return link === undefined ? next : resolve(tree, link);
    }, '/');
}

export function fakeFs(tree: FakeTree): LayoutFs {
  return {
    statSync: (path) => {
      const node = tree[resolve(tree, path)];
      return (
        node && {
          mode: node.mode ?? 0,
          uid: node.uid ?? 0,
          gid: node.gid ?? 0,
          isDirectory: () => node.dir === true,
        }
      );
    },
    realpathSync: (path) => resolve(tree, path),
    readdirSync: (path) =>
      Object.keys(tree)
        .filter((entry) => entry !== '/' && posix.dirname(entry) === path)
        .map((entry) => posix.basename(entry)),
  };
}
