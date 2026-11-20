import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import {
  byChildren,
  byScan,
  chooseDiscovery,
  readTree,
} from 'src/resources/linux-tree';

// A process of the fake /proc: its parent, start, the children of each
// of its threads, and its command name
type Fake = {
  ppid: number;
  start: number;
  threads?: Record<number, number[]>;
  name?: string;
};

// init 1 runs the script 100 and an unrelated 600; the script starts 200,
// with two threads that each started a child, and 300; 400 has a command
// name with ") (" in it
const HOST: Record<number, Fake> = {
  1: { ppid: 0, start: 1, threads: { 1: [100, 600] } },
  100: { ppid: 1, start: 50, threads: { 100: [200, 300] } },
  200: { ppid: 100, start: 60, threads: { 200: [400], 201: [500] } },
  300: { ppid: 100, start: 61 },
  400: { ppid: 200, start: 70, name: 'sim ) (x' },
  500: { ppid: 200, start: 71 },
  600: { ppid: 1, start: 40 },
};

const TREE = [100, 200, 300, 400, 500];

const stat = (pid: number, { ppid, start, name = 'sh' }: Fake) =>
  `${pid} (${name}) S ${ppid} ${pid} ${pid} 0 -1 4194560 120 0 0 0 ${pid} 0 0 0 20 0 1 0 ${start} 2453504 210\n`;

function writeProcess(proc: string, pid: number, fake: Fake): void {
  const dir = join(proc, `${pid}`);
  mkdirSync(dir);
  writeFileSync(join(dir, 'stat'), stat(pid, fake));
  writeFileSync(join(dir, 'status'), `VmHWM:\t 8 kB\nVmRSS:\t 4 kB\n`);
  Object.entries(fake.threads ?? { [pid]: [] }).forEach(([tid, kids]) => {
    mkdirSync(join(dir, 'task', tid), { recursive: true });
    const children = kids.map((kid) => `${kid} `).join('');
    writeFileSync(join(dir, 'task', tid, 'children'), children);
  });
}

describe('Linux process tree', () => {
  let proc: string;

  beforeEach(() => {
    proc = mkdtempSync(join(tmpdir(), 'proc-'));
    Object.entries(HOST).forEach(([pid, fake]) =>
      writeProcess(proc, Number(pid), fake),
    );
  });

  afterEach(() => {
    rmSync(proc, { recursive: true, force: true });
  });

  it.each([
    ['the children files', byChildren],
    ['the scan', byScan],
  ])('Should find the tree through %s', async (_, discover) => {
    const pids = await discover(100, proc);

    expect(pids[0]).toBe(100);
    expect([...pids].sort((a, b) => a - b)).toEqual(TREE);
  });

  it.each([
    ['children files where the kernel has them', true, byChildren],
    ['the scan otherwise', false, byScan],
  ])('Should choose %s', async (_, present, discovery) => {
    const self = join(proc, 'self', 'task', `${process.pid}`);
    if (present) {
      mkdirSync(self, { recursive: true });
      writeFileSync(join(self, 'children'), '');
    }

    await expect(chooseDiscovery(proc)).resolves.toBe(discovery);
  });

  it('Should read the rows of the tree, root first', async () => {
    const rows = await readTree(100, proc, byChildren);

    expect(rows[0]).toMatchObject({ pid: 100, ppid: 1, start: 50 });
    expect(rows.map(({ pid }) => pid).sort((a, b) => a - b)).toEqual(TREE);
    expect(rows[0]).toMatchObject({ rssBytes: 4096, peakBytes: 8192 });
  });

  it('Should leave out a process gone or reused since the discovery', async () => {
    rmSync(join(proc, '500'), { recursive: true });
    rmSync(join(proc, '300'), { recursive: true });
    writeProcess(proc, 300, { ppid: 1, start: 90 });

    const rows = await readTree(100, proc, async () => TREE);

    expect(rows.map(({ pid }) => pid)).toEqual([100, 200, 400]);
  });

  it('Should reject a root that is gone', async () => {
    await expect(readTree(700, proc, byChildren)).rejects.toThrow();
    await expect(readTree(700, proc, byScan)).rejects.toThrow();
  });
});
