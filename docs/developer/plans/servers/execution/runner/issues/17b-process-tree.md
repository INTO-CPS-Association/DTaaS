# 17b Measure the Process Tree

## Spec

[17a](17a-script-resources.md) measures the CPU time and peak resident
memory of the script's direct child: the process that execa starts
(`src/execa-runner.ts:41-48`). That process is often not where the
work is. On Windows the direct child is always `powershell.exe`
(`src/runner-factory.service.ts:13-19`), and a script that starts a
simulator or a Python process runs it as a child of that shell. On
Linux a shell script that starts a simulator is the same, and even the
`loop` test script spends its time in `sleep` children
(`test/data/scripts/loop:3`). So [17a](17a-script-resources.md)
under-reports on Windows always and on Linux whenever a script
delegates. This issue measures the
whole tree that the direct child spawns.

### What changes in the figures

The fields of [17a](17a-script-resources.md) keep their names, units,
storage and routes; only what they cover grows from one process to the
tree.

- **CPU time** is the sum over every process seen in the tree of its
  cumulative CPU time (user and system) at the last sample that saw
  it. A process that exited after a sample keeps that sample's value.
- **Peak memory** is the largest, over all samples, of the sum of the
  tree's resident memory in that sample. A sum of per-process peaks
  would add processes that never coexist, such as two simulators run
  one after the other, giving a figure the machine never held.
- **`processes`** is new: the largest tree seen in one sample, the
  direct child included. Every sample holds the list already, so it
  costs nothing (this plan's call). It is a third column next to
  [17a](17a-script-resources.md)'s two, shown wherever they are and
  `null` where they are.

A process is known by its pid and its start time (`starttime` of
`/proc/<pid>/stat` on Linux, `CreationDate` on Windows), so a pid that
the system reuses within one run is counted as a new process rather
than overwriting the old one's CPU time (this plan's call).

### Discovery per platform

Each sample discovers the tree afresh, starting from the direct
child's pid.

| Platform         | Discovery                                                         | Cost per sample                                              |
| :--------------- | :---------------------------------------------------------------- | :----------------------------------------------------------- |
| Linux            | `/proc/<pid>/task/*/children`, root to leaves                     | a few reads per process in a tree                            |
| Linux, fallback  | `ppid` of every `/proc/[0-9]*/stat`, then a walk                  | one read per process in the host                             |
| Windows          | one `Get-CimInstance Win32_Process`, then a walk                  | one `powershell.exe`, as [17a](17a-script-resources.md) pays |
| macOS and others | none; the fields stay `null` as in [17a](17a-script-resources.md) | none                                                         |

The `children` file needs kernel 3.5 or later built with
`CONFIG_PROC_CHILDREN`. Without it, the scan reads every process of
the host, or of the pid namespace in a container: hundreds of small
reads per sample on a busy host, a few milliseconds. The choice is
made once per runner process, by probing
`/proc/self/task/<pid>/children` (this plan's call).

On Windows the query selects `ProcessId`, `ParentProcessId`,
`CreationDate`, `UserModeTime`, `KernelModeTime` and `WorkingSetSize`
of every process; the same rows give the tree and the figures. A pid
can be reused while an old process still names it as its parent, so a
row counts as a child only when it is not older than its parent.
`pidusage` has no tree function, so discovery is own code whatever
[17a](17a-script-resources.md) chose; on Windows the CIM rows give the
figures too, saving a second query (this plan's call).

The measuring process is a child of the runner, not of the script, so
it is never part of the tree. No configuration is added: the sample
interval is [17a](17a-script-resources.md)'s. If
[17a](17a-script-resources.md) added `resources.sampleMs` to
`runner.yaml`, it governs the tree too; the fallback scan is the only
cost that could call for a longer interval, and only on a host with
many processes.

### Limits and error bounds

- A process that starts and exits between two samples is never seen;
  one that exits after a sample loses the CPU time it used since. Each
  lost process lived at most one sample interval, so the error per
  process is at most the interval times the cores it could use. A
  script that starts many short processes, such as `loop`'s `sleep`,
  loses most of them; their CPU time is small.
- A spike in memory shorter than the interval is missed. Where
  [17a](17a-script-resources.md) reads a kernel peak of the direct child
  (`VmHWM`, `PeakWorkingSet64`), the reported peak is the larger of that
  and the sampled tree peak, so this issue never reports less than
  [17a](17a-script-resources.md) would (this plan's call).
- Resident memory counts shared pages, such as libraries, once per
  process, so the sum over the tree overstates.
- A process whose parent exits leaves the tree (Linux re-parents it
  to init; on Windows it names a dead parent), and so does every child
  once the direct child exits, when sampling ends as in
  [17a](17a-script-resources.md). Their CPU time up to the last sample
  that saw them stays counted.

### Interaction with stop

This issue does not change the stop (D18). The runner still signals
only the direct child through execa's `forceKillAfterDelay`
(`src/execa-runner.ts:42`, `:65-72`), and on Windows the processes a
script started keep running after a stop, as the README says under
Stopping Scripts. The tree is measured, not managed. A stopped run
reports the tree's figures up to the last sample before the direct
child exited; children that survive the stop are not followed. A tree
kill is set aside below.

### Example

A `simulate` script starts a simulator and loops while it runs:

```sh
#!/bin/sh
python3 sim.py &
trap 'kill $!; exit' TERM
while :; do sleep 0.1; done
```

After 60 seconds a stop ends it; `simulate.ps1` does the same on
Windows. The figures are illustrative, not measured:

| Platform | Measured                                          | CPU time | Peak memory | `processes` |
| :------- | :------------------------------------------------ | -------: | ----------: | ----------: |
| Linux    | direct child ([17a](17a-script-resources.md))     |    0.3 s |        2 MB |           — |
| Linux    | tree (17b)                                        |   58.9 s |      214 MB |           3 |
| Windows  | `powershell.exe` ([17a](17a-script-resources.md)) |    0.9 s |       71 MB |           — |
| Windows  | tree (17b), `simulate.ps1`                        |   59.6 s |      283 MB |           2 |

On Linux the third process is the `sleep` alive at the sample that
saw the most.

### Version

No shape breaks: the fields of [17a](17a-script-resources.md) keep their
meaning and `processes` is added. The delivery rules bump only for a
breaking change, so `package.json` stays at
[17a](17a-script-resources.md)'s version (this plan's call).

## Plan

Line numbers are of today's code; [17a](17a-script-resources.md)
changes these files first, so review them before starting.

1. `src/resources/process-tree.ts`: a `ProcessRow` type (key of pid
   and start time, parent pid, CPU milliseconds, resident bytes), a
   `walkTree(rows, rootPid)` that returns the rows under the root
   (with the start-time check of Windows), and a `TreeTotals` class
   whose `add(rows)` keeps the last CPU time per key, the largest sum
   of resident bytes and the largest row count. Each function stays
   under complexity 5.
1. `src/resources/linux-tree.ts`: the probe, the walk through the
   `children` files and the fallback scan of `/proc/*/stat`, each
   taking the `/proc` root as a parameter so tests can point it at a
   fake directory. Parse `stat` after the last `)`, as the command
   name may hold spaces and parentheses; reuse
   [17a](17a-script-resources.md)'s reads of CPU and memory.
1. `src/resources/windows-tree.ts`: the CIM query, with `CreationDate`
   selected as `ToFileTimeUtc()` so that `ConvertTo-Json` gives a
   number, and a parser of its output into `ProcessRow`s; a single
   process comes back as an object, not a list.
1. [17a](17a-script-resources.md)'s sampler under `src/resources/`:
   each sample reads the tree through the platform's discovery and
   feeds `TreeTotals`; its result gains `processes`. The interface of
   [17a](17a-script-resources.md) keeps its shape otherwise.
1. Storage and replies, next to [17a](17a-script-resources.md)'s
   columns: the `processes` column and its migration
   (`src/queue.service.ts` is at 245 lines today; use the helper
   [17a](17a-script-resources.md) moved its columns into), the command
   record and reply types (`src/interfaces/command.interface.ts`,
   `src/dto/command.dto.ts`, `src/command-result.ts`).
1. Test scripts `test/data/scripts/spawn-busy` and `spawn-busy.ps1`:
   start a child that spins for about one second, then wait for it.
   The POSIX version waits with `wait`, the PowerShell one starts
   `powershell.exe -NoProfile -Command` in the foreground, so no
   process outlives the test.
1. The sweeps of the Tasks, and this file's row in
   `docs/issues/README.md`.

## Tasks

- [x] `walkTree` and `TreeTotals`: a reused pid is a new process, an
      exited process keeps its last CPU time, the peak is the maximum
      of sums and not the sum of peaks, `processes` is the largest
      tree. Check: `test/unit/resources.process-tree.spec.ts`.
- [x] Linux discovery through `children` files and through the
      fallback scan give the same tree from a fake `/proc`, including a
      command name with `) (`. Check:
      `test/unit/resources.linux-tree.spec.ts` (all platforms).
- [x] The Windows parser builds rows from captured CIM output, one row
      and many, and drops a child older than its parent. Check:
      `test/unit/resources.windows-tree.spec.ts` (all platforms).
- [x] A `spawn-busy` run reports a tree CPU time above the direct
      child's and at least two processes; a stopped `loop` run reports
      figures and the stop kills no more than before. Check:
      `test/integration/resources.tree.spec.ts`, on Linux and Windows
      only, skipped elsewhere; the Linux run in CI is the authority.
- [x] `processes` is stored, migrated into an older database, and shown
      by `POST /`, `GET /` and the MQTT routes. Check:
      `test/integration/queue.migration.spec.ts`,
      `test/integration/queue.service.spec.ts`,
      `test/e2e/command-input.spec.ts`, `test/e2e/mqtt.spec.ts`; grep
      `test/e2e/mqtt.broker.spec.ts` for the reply shapes.
- [x] README: the section [17a](17a-script-resources.md) added on
      resource figures says the tree, its limits and `processes`;
      Stopping Scripts says the surviving children of a stop are not
      measured. Check: `npx markdownlint-cli -c .markdownlint.yaml` on
      it.
- [x] `api/API.md`: `POST /`, `GET /` and `POST /stop` show
      `processes` and the tree. Check: the same lint.
- [x] `docs/state-machine-design.md`: amend the decision of the number
      [17a](17a-script-resources.md) took to measure the tree; D18
      unchanged. Check: the Decisions section.
- [x] `DEVELOPER.md`: which resource tests are platform-conditional.
      Check: the Developer Commands section.
- [x] `yarn syntax`, `yarn build`, `yarn test --maxWorkers=2` and
      `npx tsc --noEmit --noUnusedLocals --noUnusedParameters` pass,
      and no function crosses the Qlty thresholds. Check: their output.

## Learnings

- **Drift.** [17a](17a-script-resources.md) moved the lines the plan
  cites: execa starts the direct child at `src/execa-runner.ts:53-59`,
  with `forceKillAfterDelay` at `:54` and the kill of a stop at `:84`;
  `powershell.exe` is at `src/runner-factory.service.ts:16-22`.
  `queue.service.ts` had 240 lines, not 245, and has 241; the columns
  live in `createSchema` of `src/queue.schema.ts`, which
  [11](11-history-metrics.md) made. The
  command record, the reply types and `storedResult` carry
  `ScriptResources` whole, so they needed no change of their own;
  `test/e2e/mqtt.broker.spec.ts` compares with `MEASURED`, which gained
  `processes`. [17a](17a-script-resources.md) added no
  `resources.sampleMs`, so the interval is `SAMPLE_MS`, 500 ms.
  `src/execa-runner.ts` is untouched: the meter already gets the pid
  and the start, so [18](18-script-user.md)'s change of the command in
  that file does not meet this one.
- **What replaced [17a](17a-script-resources.md)'s reads.** `readLinux`
  and `Sample` are gone: `readProcess` reads a row (stat and status),
  `readStat` the link alone for the scan, and both watches feed
  `TreeTotals`.
  `parseStatus` gives 0 for a missing `VmRSS` or `VmHWM` rather than
  failing, as a child that has exited but is not yet reaped has no
  memory lines and still has its CPU time;
  [17a](17a-script-resources.md) failed such a read.
  After reading the rows, `readTree` walks them again, so a process
  whose pid was reused or whose parent exited between the discovery
  and the read drops out.
- **Readings this plan left open.** The peak is never below the kernel
  peak of any process in a sample (`VmHWM`, `PeakWorkingSetSize`), not
  only the direct child's: each is a lower bound of the tree's peak.
  `processes` joins `GET /metrics` as the largest tree of a command's
  runs and the history records, as the Spec puts it next to
  [17a](17a-script-resources.md)'s two figures wherever they are.
  `walkTree` keeps a visited set, so a loop of parents seen across a
  scan ends. `TreeTotals` moves the CPU time
  of a process that left the tree into a sum, so its memory is that of
  one tree: a script that loops on short sleeps, as the README advises,
  starts two processes a second, which a map of every process seen
  would keep for the whole run. A sample that finds no tree is skipped,
  so it does not retire the processes that the next sample sees again.
- **The Windows sampler, as measured.** Windows PowerShell 5.1 on this
  host answers `Get-CimInstance Win32_Process` with seven properties in
  about 0.45 s for some 400 processes, 0.6 to 1.5 s while other work
  runs; the first query of a session is slower. Formatting the rows
  with a `foreach` statement took 50 ms; with `ForEach-Object` 4 s. So
  the sampler prints integer rows joined by `;`, one line a sample of
  about 25 KB, rather than `ConvertTo-Json` as the plan has it: one
  integer format, as in [17a](17a-script-resources.md), and no single
  object for a single row. Samples are thus about a second apart on
  Windows. [17a](17a-script-resources.md)'s held handle stays: after the
  exit the sampler prints the root's final `TotalProcessorTime` under
  the `CreationDate` of its last CIM row,
  since `StartTime.ToFileTimeUtc()` differed from it in the last digit
  (…842151758 against …842151750). `PeakWorkingSetSize` is in kB,
  `WorkingSetSize` in bytes, and an empty property prints 0 through
  `[uint64]`. A `CreationDate` is above 2^53, so as a number it loses
  its last microseconds; order and identity hold.
- **`conhost.exe`.** On Windows every run counts at least two
  processes: Windows gives `powershell.exe` a `conhost.exe`, which
  `Win32_Process` lists as its child. `busy.ps1` reported 2.7 s, 118 MB
  and 2 processes; `spawn-busy.ps1` 3.6 to 4.0 s, 150 to 157 MB and 3;
  a `loop.ps1` stopped after 4 s 0.64 s, 81 MB and 2.
- **Linux, as measured in WSL** (Ubuntu 26.04, kernel
  6.18.33.2-microsoft-standard-WSL2, built with
  `CONFIG_PROC_CHILDREN=y`). The probe chose the children files. As
  uid 1000, `/proc/1/task/1/children`, `stat` and `status` of root's
  pid 1 were readable, so [18](18-script-user.md)'s second account
  changes nothing here; `setpriv` execs the script in place, keeping pid
  and `starttime`, so a first sample that sees `setpriv` names the same
  process. Both
  discoveries gave the same tree of a real `sh` with nested `sleep`
  children, in 10 and 8 ms among 28 processes. `busy` reported 0.5 s,
  2.1 MB and 1 process; `spawn-busy` 0.98 s, 4.2 MB and 2; a `loop`
  stopped after 4 s 0.01 s, 10 MB and 2.
- **Which path ran where.** On Windows: the whole suite (114 suites,
  1026 tests passed, 10 skipped), with the Windows cases of
  `execa-runner.resources.spec.ts` and `resources.tree.spec.ts`
  against the real CIM query. In WSL: the resource unit tests and both
  integration specs, so `busy`, `spawn-busy` and a stopped `loop`
  through the real children files, and the scan against the real
  `/proc` by hand. Jest 30 resolves through `unrs-resolver`, whose
  native binding is per platform, so the Windows `node_modules` does
  not run in WSL; a copy of the runner under the WSL home with its own
  `yarn install` did. The fallback scan runs against a fake `/proc` in
  the unit tests everywhere. CI ran the Linux cases on GitHub's
  runner, the authority for that path: 1028 tests passed and 8
  skipped, `spawn-busy` and the stopped `loop` among them.
- **SonarCloud on the PR** found an `await` inside the level loop of
  `byChildren` (S9382), which now descends through each child at once,
  and no tests in `resources.tree.spec.ts` (S2187), as it did not see
  `it` behind an alias; the platform condition now skips the
  `describe`. Qlty reported no smells.
- **The stop.** No stop code changed, so a stop kills no more than
  before; `resources.tree.spec.ts` checks that a stopped `loop` reports
  all three figures and that the stop takes under two seconds.
- **Version and decision.** `processes` is an added field, so the
  version stays 0.10.0, as the Spec says. [18](18-script-user.md) takes
  D35, so this decision is D36; D33 is amended to point to it.

## Considered and Set Aside

- **Kill the tree on a stop.** For: a stop on Windows, and on Linux a
  script without a `trap`, leaves orphaned simulators running and
  using the resources that this issue reports, with nobody to end
  them. Against: a kill per process races the processes spawned while
  the runner walks; a script that leaves a process behind on purpose
  loses it; `stopGrace` needs a meaning per process. A stop is D18's
  decision, so a tree kill is an issue of its own.
- **cgroups on Linux.** A cgroup per script gives exact CPU time
  (`cpu.stat`) and peak memory (`memory.peak`), short processes
  included. It needs a delegated cgroup subtree, which a runner in a
  container or under a plain user rarely has, and changes how every
  script starts. Worth revisiting when the runner controls containers.
- **Job Objects on Windows.** A job gives exact totals and can end the
  tree in one call. Node and execa cannot assign a process to a job
  without a native addon, and the assignment races the script's first
  children.
- **`cutime` and `cstime` of the direct child on Linux.** They hold the
  CPU time of descendants that were waited for, which would recover
  short processes, but adding them to the sampled values counts the
  same process twice.
- **A wall-clock spin is not a CPU figure.** `busy` spun for one
  second of `/proc/uptime`, and the tree test asked for more than 0.4 s
  of CPU time. On a GitHub runner with two jobs in parallel the child
  got 0.36 s of CPU in that second, and the last sample that saw it was
  up to 500 ms before its exit, as a tree is read every `SAMPLE_MS` and
  not at exit. The script now spins until fields 14 and 15 of its own
  `/proc/self/stat` reach 1.5 s, so the figure no longer depends on the
  load of the host; the loop forks nothing, as `$(...)` would, and reads
  the positional parameters as `${12}`, since `$12` is `$1` followed by
  `2`. In WSL it uses 1.5 s of CPU in 1.6 s of wall time.
