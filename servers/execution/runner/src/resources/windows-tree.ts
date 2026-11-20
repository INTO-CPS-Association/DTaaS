import type { ProcessRow } from './process-tree.js';

// UserModeTime and KernelModeTime count 100 ns
const TICKS_PER_SECOND = 1e7;

// ProcessId, ParentProcessId, CreationDate as a FILETIME, UserModeTime,
// KernelModeTime, WorkingSetSize in bytes and PeakWorkingSetSize in kB
const ROW = /^(\d+) (\d+) (\d+) (\d+) (\d+) (\d+) (\d+)$/;

const FIELDS =
  'ProcessId,ParentProcessId,CreationDate,UserModeTime,KernelModeTime,WorkingSetSize,PeakWorkingSetSize';

// A PowerShell loop that holds the root process and prints, at once and
// after each wait of up to 500 ms for its exit, a line with every
// process of the host from one CIM query. Its tree is walked from these
// rows, so one query gives both the tree and the figures. After the exit
// it prints the root once more: the held handle still reads its final
// CPU time, under the CreationDate of its last row. It prints nothing
// for a root that started after start, as Windows reuses a pid quickly.
// Only numbers reach the script, which prints integers, so no culture
// formats them; a property that CIM leaves empty prints 0.
export const samplerScript = (pid: number, start: number): string => `
$ErrorActionPreference = 'Stop'
$p = Get-Process -Id ${pid}
$null = $p.Handle
if (([DateTimeOffset]$p.StartTime).ToUnixTimeMilliseconds() -gt ${start}) { exit }
$created = $p.StartTime.ToFileTimeUtc()
do {
  $all = Get-CimInstance Win32_Process -Property ${FIELDS}
  $rows = foreach ($r in $all) {
    $c = 0; if ($r.CreationDate) { $c = $r.CreationDate.ToFileTimeUtc() }
    if ($r.ProcessId -eq ${pid}) { $created = $c }
    "$($r.ProcessId) $($r.ParentProcessId) $c $([uint64]$r.UserModeTime) $([uint64]$r.KernelModeTime) $([uint64]$r.WorkingSetSize) $([uint64]$r.PeakWorkingSetSize)"
  }
  $rows -join ';'
} until ($p.WaitForExit(500))
"${pid} 0 $created $($p.TotalProcessorTime.Ticks) 0 0 0"`;

function parseRow(text: string): ProcessRow | undefined {
  const match = ROW.exec(text);
  if (match === null) {
    return undefined;
  }
  const [pid, ppid, start, user, kernel, set, peak] = match
    .slice(1)
    .map(Number);
  const cpuSeconds = (user + kernel) / TICKS_PER_SECOND;
  return {
    pid,
    ppid,
    start,
    cpuSeconds,
    rssBytes: set,
    peakBytes: peak * 1024,
  };
}

// The processes of a line of the sampler, rows separated by ;, or
// undefined for a line with a row that is not as the sampler prints it.
// A CreationDate is above 2^53, so it loses its last few microseconds as
// a number. The order of two of them stays, and one CreationDate always
// gives the same number, which is all that a start is used for.
export function parseRows(line: string): ProcessRow[] | undefined {
  const rows = line.trim().split(';').map(parseRow);
  const complete = rows.every((row) => row !== undefined);
  return complete ? (rows as ProcessRow[]) : undefined;
}
