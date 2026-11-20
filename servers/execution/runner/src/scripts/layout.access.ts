import { readdirSync, realpathSync, statSync } from 'node:fs';
import { posix } from 'node:path';
import type { Account } from './account.js';

export type PathStat = {
  mode: number;
  uid: number;
  gid: number;
  isDirectory(): boolean;
};

// What the layout check reads of the file system; statSync follows a
// symbolic link and gives undefined for a missing path
export type LayoutFs = {
  statSync(path: string): PathStat | undefined;
  realpathSync(path: string): string;
  readdirSync(path: string): string[];
};

export const NODE_FS: LayoutFs = {
  statSync: (path) => statSync(path, { throwIfNoEntry: false }),
  realpathSync: (path) => realpathSync(path),
  readdirSync: (path) => readdirSync(path),
};

export type Rights = { r: boolean; w: boolean; x: boolean };

const STICKY = 0o1000;

const NO_RIGHTS: Rights = { r: false, w: false, x: false };

// The owner bits apply to the owner, else the group bits to a member
// of the group, else the other bits; the kernel picks one class, never
// a union of them
function classShift({ uid, gid }: PathStat, account: Account): number {
  if (uid === account.uid) {
    return 6;
  }
  return account.groups.includes(gid) ? 3 : 0;
}

export function access(stat: PathStat, account: Account): Rights {
  const bits = (stat.mode >> classShift(stat, account)) & 7;
  return { r: (bits & 4) !== 0, w: (bits & 2) !== 0, x: (bits & 1) !== 0 };
}

// The mode, and the owner or group that decides the account's access
function describe(stat: PathStat, account: Account): string {
  const mode = `mode ${(stat.mode & 0o7777).toString(8).padStart(3, '0')}`;
  const shift = classShift(stat, account);
  if (shift === 6) {
    return `${mode}, owner ${stat.uid} is ${account.name}`;
  }
  if (shift === 3) {
    return `${mode}, group ${stat.gid} is a group of ${account.name}`;
  }
  return `${mode}, owner ${stat.uid}, group ${stat.gid}`;
}

// The directories above a path, from its parent up to /
export function ancestors(path: string): string[] {
  const parent = posix.dirname(path);
  return parent === path ? [] : [parent, ...ancestors(parent)];
}

// The access of one account to the paths of one file system, read once
export class LayoutView {
  private readonly stats = new Map<string, PathStat | undefined>();

  constructor(
    readonly fs: LayoutFs,
    readonly account: Account,
  ) {}

  stat(path: string): PathStat | undefined {
    if (!this.stats.has(path)) {
      this.stats.set(path, this.fs.statSync(path));
    }
    return this.stats.get(path);
  }

  // A path as the kernel finds it, after every symbolic link
  real(path: string): string {
    return this.stat(path) === undefined ? path : this.fs.realpathSync(path);
  }

  rights(path: string): Rights {
    const stat = this.stat(path);
    return stat === undefined ? NO_RIGHTS : access(stat, this.account);
  }

  // A problem line for a path, which names its mode and never its content
  line(path: string, problem: string, remark = ''): string {
    const stat = this.stat(path);
    const detail =
      stat === undefined ? '' : `: ${describe(stat, this.account)}`;
    return `${path} ${problem} ${this.account.name}${remark}${detail}`;
  }

  // The ancestors that the account can not search
  blocked(path: string): string[] {
    return ancestors(path).filter((dir) => !this.rights(dir).x);
  }

  reaches(path: string): boolean {
    return this.blocked(path).length === 0;
  }

  readable(path: string): boolean {
    return this.reaches(path) && this.rights(path).r;
  }

  // Writing into a directory needs its x bit as well
  writable(path: string): boolean {
    const { w, x } = this.rights(path);
    const entries = this.stat(path)?.isDirectory() !== true || x;
    return this.reaches(path) && w && entries;
  }

  // The sticky bit keeps the account from renaming an entry that
  // exists and that it does not own, in a directory it does not own
  private keeps(dir: string, entry: string): boolean {
    const { mode, uid } = this.stat(dir) as PathStat;
    const owner = this.stat(entry)?.uid;
    const notOwned = uid !== this.account.uid && owner !== this.account.uid;
    return (mode & STICKY) !== 0 && owner !== undefined && notOwned;
  }

  private replaces(dir: string, entry: string): boolean {
    return this.writable(dir) && !this.keeps(dir, entry);
  }

  // The ancestors that the account can write, and so rename the path's
  // branch away and put its own in its place
  replacing(path: string): string[] {
    const dirs = ancestors(path);
    const entries = [path, ...dirs];
    return dirs.filter((dir, index) => this.replaces(dir, entries[index]));
  }
}
