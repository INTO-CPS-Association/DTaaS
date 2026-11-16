import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ProcessRow, TreeLink } from './process-tree.js';

// The clock tick when getconf can not tell it, the usual value on Linux
const DEFAULT_TICKS = 100;

// getconf by its path, so that no directory of PATH can stand in for it
const GETCONF = '/usr/bin/getconf';

// Fields 3 to 22 of /proc/<pid>/stat after the command name: ppid is
// field 4, utime and stime, in clock ticks, fields 14 and 15, and
// starttime, in clock ticks since boot, field 22
const STAT_FIELDS = /^ \S+ (\d+) (?:\S+ ){9}(\d+) (\d+) (?:\S+ ){6}(\d+)\b/;

const VM_RSS = /^VmRSS:\s+(\d+) kB$/m;

const VM_HWM = /^VmHWM:\s+(\d+) kB$/m;

let ticks: number | undefined;

// A process's parent, start and user plus system CPU time in clock
// ticks, read after the last ), as the command name may hold spaces and
// parentheses
export type StatFields = { ppid: number; start: number; ticks: number };

export function parseStat(text: string): StatFields | undefined {
  const end = text.lastIndexOf(')');
  const match = end < 0 ? null : STAT_FIELDS.exec(text.slice(end + 1));
  if (match === null) {
    return undefined;
  }
  const [ppid, utime, stime, start] = match.slice(1).map(Number);
  return { ppid, start, ticks: utime + stime };
}

const kilobytes = (pattern: RegExp, text: string): number =>
  Number(pattern.exec(text)?.[1] ?? 0) * 1024;

// The resident memory and its peak, VmRSS and VmHWM, in bytes; 0 where
// a line is missing, as for a process that has exited but is not reaped
export const parseStatus = (
  text: string,
): Pick<ProcessRow, 'rssBytes' | 'peakBytes'> => ({
  rssBytes: kilobytes(VM_RSS, text),
  peakBytes: kilobytes(VM_HWM, text),
});

// The clock tick that the getconf given prints, or the default
export function readClockTicks(getconf = GETCONF): number {
  try {
    const value = Number(
      execFileSync(getconf, ['CLK_TCK'], { encoding: 'utf8', timeout: 1000 }),
    );
    return value > 0 ? value : DEFAULT_TICKS;
  } catch {
    return DEFAULT_TICKS;
  }
}

// The clock ticks per second, read once
export function clockTicks(): number {
  ticks ??= readClockTicks();
  return ticks;
}

const procFile = (proc: string, pid: number, file: string) =>
  readFile(join(proc, `${pid}`, file), 'utf8');

// The stat file of a pid; rejects when it is gone or can not be read.
// stat and status can be read by every user, so a script that runs as
// another user is read the same way.
export async function readStat(
  pid: number,
  proc = '/proc',
): Promise<TreeLink & StatFields> {
  const fields = parseStat(await procFile(proc, pid, 'stat'));
  if (fields === undefined) {
    throw new Error(`Can not read the figures of process ${pid}`);
  }
  return { pid, ...fields };
}

// A process from the stat and status files of its pid; rejects when
// either is gone or its stat can not be read
export async function readProcess(
  pid: number,
  proc = '/proc',
): Promise<ProcessRow> {
  const [{ ppid, start, ticks: cpu }, status] = await Promise.all([
    readStat(pid, proc),
    procFile(proc, pid, 'status'),
  ]);
  const cpuSeconds = cpu / clockTicks();
  return { pid, ppid, start, cpuSeconds, ...parseStatus(status) };
}
