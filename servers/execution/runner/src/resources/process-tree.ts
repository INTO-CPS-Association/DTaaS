import {
  NO_RESOURCES,
  roundSeconds,
  type ScriptResources,
} from './resources.js';

// One process as a sample saw it. Its pid and start time name it, as a
// pid may be reused; the start is in the platform's own unit. CPU time
// is user plus system so far; peakBytes is the peak resident memory that
// the system keeps for the process, 0 where it keeps none.
export type ProcessRow = {
  readonly pid: number;
  readonly ppid: number;
  readonly start: number;
  readonly cpuSeconds: number;
  readonly rssBytes: number;
  readonly peakBytes: number;
};

// What places a process in a tree
export type TreeLink = Pick<ProcessRow, 'pid' | 'ppid' | 'start'>;

function childrenByParent<T extends TreeLink>(
  rows: readonly T[],
): Map<number, T[]> {
  const children = new Map<number, T[]>();
  for (const row of rows) {
    const siblings = children.get(row.ppid) ?? [];
    siblings.push(row);
    children.set(row.ppid, siblings);
  }
  return children;
}

// The root and the processes below it, root first. A row counts as a
// child only when it is not older than its parent, as a pid may be
// reused while an old process still names it as its parent.
export function walkTree<T extends TreeLink>(
  rows: readonly T[],
  rootPid: number,
): T[] {
  const root = rows.find(({ pid }) => pid === rootPid);
  if (root === undefined) {
    return [];
  }
  const children = childrenByParent(rows);
  const tree = new Set([root]);
  for (const parent of tree) {
    (children.get(parent.pid) ?? [])
      .filter(({ start }) => start >= parent.start)
      .forEach((child) => tree.add(child));
  }
  return [...tree];
}

// The figures of a run from the trees of its samples: the last CPU time
// of every process seen, the largest sum of resident memory in one
// sample or the largest peak of one process, and the largest tree. A
// process missing from a sample has left the tree for good, as its pid
// and start name it, so its CPU time moves to a sum and the memory held
// stays that of one tree, however many processes a long run starts.
export class TreeTotals {
  private running = new Map<string, number>();

  private leftSeconds = 0;

  private peakBytes = 0;

  private largest = 0;

  // An empty tree is a sample that did not find the root, not a sign
  // that every process left
  add(tree: readonly ProcessRow[]): void {
    if (tree.length === 0) {
      return;
    }
    this.retire(
      new Map(tree.map((row) => [`${row.pid}@${row.start}`, row.cpuSeconds])),
    );
    const resident = tree.reduce((sum, { rssBytes }) => sum + rssBytes, 0);
    const peaks = tree.map(({ peakBytes }) => peakBytes);
    this.peakBytes = Math.max(this.peakBytes, resident, ...peaks);
    this.largest = Math.max(this.largest, tree.length);
  }

  totals(): ScriptResources {
    if (this.largest === 0) {
      return NO_RESOURCES;
    }
    let cpuSeconds = this.leftSeconds;
    this.running.forEach((seconds) => {
      cpuSeconds += seconds;
    });
    return {
      cpuSeconds: roundSeconds(cpuSeconds),
      peakRssBytes: this.peakBytes || null,
      processes: this.largest,
    };
  }

  // Keeps the CPU time of the processes that left the tree, and takes
  // the processes of the sample as the running ones
  private retire(running: Map<string, number>): void {
    this.running.forEach((seconds, key) => {
      this.leftSeconds += running.has(key) ? 0 : seconds;
    });
    this.running = running;
  }
}
