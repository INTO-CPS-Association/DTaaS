import { describe, expect, it } from '@jest/globals';
import { walkTree } from 'src/resources/process-tree';
import { parseRows, samplerScript } from 'src/resources/windows-tree';

// Rows as the sampler prints them on Windows 11: ProcessId,
// ParentProcessId, CreationDate as a FILETIME, UserModeTime and
// KernelModeTime in 100 ns, WorkingSetSize in bytes and
// PeakWorkingSetSize in kB. 7312 is powershell.exe running a script,
// 9100 the python.exe it started; 4 is System, whose time is all kernel.
const SYSTEM = '4 0 134375896320000000 0 204305000000 180224 1020328';
const SHELL = '7312 5528 134375905120000000 4062500 1093750 74158080 94320';
const PYTHON = '9100 7312 134375905310000000 52968750 781250 220000256 216000';

describe('Windows tree rows', () => {
  it('Should read one row', () => {
    expect(parseRows(SHELL)).toEqual([
      {
        pid: 7312,
        ppid: 5528,
        start: 134375905120000000,
        cpuSeconds: 0.515625,
        rssBytes: 74158080,
        peakBytes: 94320 * 1024,
      },
    ]);
  });

  it('Should read many rows, and a line ended by CR', () => {
    const rows = parseRows(`${SYSTEM};${SHELL};${PYTHON}\r`);

    expect(rows?.map(({ pid }) => pid)).toEqual([4, 7312, 9100]);
    expect(rows?.[0].cpuSeconds).toBe(20430.5);
  });

  it.each([
    ['an empty line', ''],
    ['a row with an empty figure', '7312 5528 134375905120000000  0 0 0'],
    ['a row with a decimal comma', SHELL.replace('4062500', '406,25')],
    ['a line with one bad row', `${SHELL};PS> oops`],
  ])('Should read nothing from %s', (_, line) => {
    expect(parseRows(line)).toBeUndefined();
  });

  it('Should walk the tree of a root, and drop a child older than it', () => {
    // 8800 names 7312 as its parent, but started before it, so it is the
    // child of an older process that had the same pid
    const stale = '8800 7312 134375890000000000 10000000 0 4096 4';
    const rows = parseRows([SYSTEM, SHELL, PYTHON, stale].join(';')) ?? [];

    expect(walkTree(rows, 7312).map(({ pid }) => pid)).toEqual([7312, 9100]);
  });

  it('Should take only numbers into its script', () => {
    const script = samplerScript(4242, 1761576000123);

    expect(script).toContain('Get-Process -Id 4242');
    expect(script).toContain('-gt 1761576000123');
    expect(script).toContain('-eq 4242');
    expect(script).toContain('Get-CimInstance Win32_Process');
  });
});
