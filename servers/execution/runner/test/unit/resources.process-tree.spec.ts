import { describe, expect, it } from '@jest/globals';
import {
  type ProcessRow,
  TreeTotals,
  walkTree,
} from 'src/resources/process-tree';
import { NO_RESOURCES } from 'src/resources/resources';

const MB = 1024 * 1024;

// A process of a sample; its peak is its resident memory unless given
const row = (
  pid: number,
  ppid: number,
  start: number,
  cpuSeconds = 0,
  rssBytes = 0,
  peakBytes = rssBytes,
): ProcessRow => ({ pid, ppid, start, cpuSeconds, rssBytes, peakBytes });

describe('walkTree', () => {
  it('Should take the root and every process below it, and no other', () => {
    const rows = [
      row(1, 0, 0),
      row(10, 1, 5),
      row(11, 10, 6),
      row(12, 11, 7),
      row(20, 1, 5),
      row(13, 10, 8),
    ];

    expect(walkTree(rows, 10).map(({ pid }) => pid)).toEqual([10, 11, 13, 12]);
  });

  it('Should give nothing for a root that is not among the rows', () => {
    expect(walkTree([row(1, 0, 0), row(11, 10, 6)], 10)).toEqual([]);
  });

  it('Should drop a child older than its parent, as its pid was reused', () => {
    const rows = [row(10, 1, 50), row(11, 10, 40), row(12, 10, 50)];

    expect(walkTree(rows, 10).map(({ pid }) => pid)).toEqual([10, 12]);
  });

  it('Should end on a loop of parents', () => {
    const rows = [row(10, 11, 5), row(11, 10, 5)];

    expect(walkTree(rows, 10).map(({ pid }) => pid)).toEqual([10, 11]);
  });
});

describe('TreeTotals', () => {
  it('Should measure nothing without a sample', () => {
    const totals = new TreeTotals();
    totals.add([]);

    expect(totals.totals()).toBe(NO_RESOURCES);
  });

  it('Should keep the last CPU time of each process, one that exited too', () => {
    const totals = new TreeTotals();
    totals.add([row(10, 1, 5, 0.1), row(11, 10, 6, 0.5)]);
    totals.add([row(10, 1, 5, 0.2)]);

    expect(totals.totals().cpuSeconds).toBe(0.7);
  });

  it('Should not count again a tree after a sample without it', () => {
    const totals = new TreeTotals();
    totals.add([row(10, 1, 5, 0.25), row(11, 10, 6, 1)]);
    totals.add([]);
    totals.add([row(10, 1, 5, 0.5), row(11, 10, 6, 1.5)]);

    expect(totals.totals()).toMatchObject({ cpuSeconds: 2, processes: 2 });
  });

  it('Should count a reused pid as a new process', () => {
    const totals = new TreeTotals();
    totals.add([row(10, 1, 5, 0.25), row(11, 10, 6, 1)]);
    totals.add([row(10, 1, 5, 0.25), row(11, 10, 9, 0.5)]);

    expect(totals.totals().cpuSeconds).toBe(1.75);
  });

  it('Should take the largest sum of a sample, not the sum of peaks', () => {
    const totals = new TreeTotals();
    totals.add([row(10, 1, 5, 0, 2 * MB), row(11, 10, 6, 0, 100 * MB)]);
    totals.add([row(10, 1, 5, 0, 2 * MB), row(12, 10, 7, 0, 90 * MB)]);

    expect(totals.totals().peakRssBytes).toBe(102 * MB);
  });

  it('Should never report less than the peak a process reached alone', () => {
    const totals = new TreeTotals();
    totals.add([row(10, 1, 5, 0, MB, 200 * MB), row(11, 10, 6, 0, 3 * MB)]);

    expect(totals.totals().peakRssBytes).toBe(200 * MB);
  });

  it('Should have no peak without memory, and the largest tree', () => {
    const totals = new TreeTotals();
    totals.add([row(10, 1, 5, 1.2), row(11, 10, 6), row(12, 11, 7)]);
    totals.add([row(10, 1, 5, 1.5)]);

    expect(totals.totals()).toEqual({
      cpuSeconds: 1.5,
      peakRssBytes: null,
      processes: 3,
    });
  });
});
