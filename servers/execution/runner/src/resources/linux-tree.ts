import { access, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { readProcess, readStat } from './linux.js';
import { type ProcessRow, walkTree } from './process-tree.js';

const PROC = '/proc';

// The pids of a tree, its root first, from the /proc directory given
export type Discovery = (rootPid: number, proc: string) => Promise<number[]>;

const fulfilled = <T>(results: PromiseSettledResult<T>[]): T[] =>
  results.flatMap((result) =>
    result.status === 'fulfilled' ? [result.value] : [],
  );

// The children of a pid, from the children file of each of its threads;
// none for a process that is gone
async function childPids(pid: number, proc: string): Promise<number[]> {
  const task = join(proc, `${pid}`, 'task');
  const tids = await readdir(task).catch((): string[] => []);
  const lists = await Promise.all(
    tids.map((tid) =>
      readFile(join(task, tid, 'children'), 'utf8').catch(() => ''),
    ),
  );
  return lists.join(' ').split(/\s+/).filter(Boolean).map(Number);
}

// Adds the processes below a pid to the tree, reading the children of
// all its children at once
async function descend(
  pid: number,
  proc: string,
  tree: Set<number>,
): Promise<void> {
  const children = (await childPids(pid, proc)).filter((kid) => !tree.has(kid));
  children.forEach((kid) => tree.add(kid));
  await Promise.all(children.map((kid) => descend(kid, proc, tree)));
}

// Walks down from the root through the children files
export const byChildren: Discovery = async (rootPid, proc) => {
  const tree = new Set([rootPid]);
  await descend(rootPid, proc, tree);
  return [...tree];
};

// Reads the parent of every process of the host, then walks the tree
export const byScan: Discovery = async (rootPid, proc) => {
  const pids = (await readdir(proc)).filter((name) => /^\d+$/.test(name));
  const links = await Promise.allSettled(
    pids.map((pid) => readStat(Number(pid), proc)),
  );
  return walkTree(fulfilled(links), rootPid).map(({ pid }) => pid);
};

// The children files where the kernel has them (3.5 or later, built with
// CONFIG_PROC_CHILDREN), probed on the runner's own process; the scan
// otherwise
export const chooseDiscovery = (proc: string): Promise<Discovery> =>
  access(join(proc, 'self', 'task', `${process.pid}`, 'children')).then(
    () => byChildren,
    () => byScan,
  );

// The processes of the tree under the root, root first; rejects when the
// root can not be read. The rows are walked again, so that a process
// whose pid was reused or whose parent exited since the discovery drops
// out.
export async function readTree(
  rootPid: number,
  proc: string,
  discover: Discovery,
): Promise<ProcessRow[]> {
  const pids = await discover(rootPid, proc);
  const [root, others] = await Promise.all([
    readProcess(rootPid, proc),
    Promise.allSettled(pids.slice(1).map((pid) => readProcess(pid, proc))),
  ]);
  return walkTree([root, ...fulfilled(others)], rootPid);
}

let hostDiscovery: Promise<Discovery> | undefined;

// The tree under the root in this host's /proc, discovered as chosen at
// the first read of the runner process
export function readHostTree(rootPid: number): Promise<ProcessRow[]> {
  hostDiscovery ??= chooseDiscovery(PROC);
  return hostDiscovery.then((discover) => readTree(rootPid, PROC, discover));
}
