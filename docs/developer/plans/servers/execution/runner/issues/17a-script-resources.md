# 17a Script Resources

## Spec

DTs compete for the computational resources of the shared
infrastructure, and a DT Orchestrator adjusts their fidelity to load.
Placement of DTs is left to the platform, not to the Manager. The runner therefore
reports what each script used and decides nothing: an Orchestrator or a
Manager reads the figures and acts. 17 is split in three; this file
measures the direct child process of every script run, the commands of
`POST /` and the scripts of states alike. Size M.

### What Is Measured

`cpuSeconds` is user plus system CPU time in seconds, rounded to the
millisecond; `peakRssBytes` is the peak resident memory in bytes.

| Platform | `cpuSeconds`                                     | `peakRssBytes`                                            | Process measured                    |
| :------- | :----------------------------------------------- | :-------------------------------------------------------- | :---------------------------------- |
| Linux    | fields 14 and 15 of `/proc/<pid>/stat`, in ticks | `VmHWM` of `/proc/<pid>/status`                           | the script                          |
| Windows  | `TotalProcessorTime` of `Get-Process -Id <pid>`  | `PeakWorkingSet64`, or the largest `WorkingSet64` sampled | `powershell.exe` running the script |
| other    | `null`                                           | `null`                                                    | none                                |

Linux converts ticks with the clock tick of `getconf CLK_TCK`, read once
at the first measurement, or 100 when that fails. On Windows the direct
child is `powershell.exe -File <name>.ps1`
(`src/runner-factory.service.ts:13-19`), so the figures are PowerShell's
own plus the script's: an idle PowerShell loop on a Windows 11 host
peaked at 115 646 464 bytes. Processes the script starts are not counted
on either platform; that is 17b.

### Sampling and Its Limits

A process that has exited can no longer be read, so the runner samples
it while it runs and reports the last successful sample.

- **Linux.** One read right after the spawn, then one every 500 ms
  (this plan's call), each reading `stat` and `status` of the pid; a
  read still pending when the timer fires skips that tick. `VmHWM` is
  the kernel's peak up to the read.
- **Windows.** One sampler per run (this plan's call): a
  `powershell.exe -NoProfile -NonInteractive -Command` loop that holds
  the process from `Get-Process -Id`, waits for its exit for up to
  500 ms (`WaitForExit(500)`), and prints `TotalProcessorTime.Ticks`,
  `WorkingSet64` and `PeakWorkingSet64` as integers, so no culture
  formats a decimal. After the exit it prints one more line, as the
  held handle still reads the final `TotalProcessorTime` (checked on
  Windows 11 with Windows PowerShell 5.1). It prints nothing for a
  process whose `StartTime` is later than the run's start, since
  Windows reuses a pid quickly. One PowerShell per run, not per sample:
  a start takes about a second, 1.4 to 3.4 s under load (05).
- **End of a run.** When execa resolves, the runner takes the latest
  sample it holds, stops the timer or kills the sampler, and waits for
  nothing. The figures are lower bounds: up to one interval of use
  before the exit is missed, unless the Windows line after the exit
  arrived first.
- **Short scripts.** On Linux a script under one interval reports the
  first read, near-zero CPU and the memory it held then, and `null`
  only when that read lost the race with the exit. On Windows a script
  that ends before the sampler starts reports `null`.

### Replies

The two figures sit in a `resources` object (this plan's call), so that
17b can add to it without crowding the record. Both are `null` when not
measured: other platforms, a failed read, a refused command, a row
written before 17a. `POST /` and MQTT `execute` add it to `result`;
`admit` of the API reference becomes:

```json
{
  "status": "success",
  "result": {
    "exitCode": 0,
    "stdout": "hospital-1 in state open#1, scope single\r\np-1 admitted to cardiology",
    "stderr": "",
    "resources": { "cpuSeconds": 0.469, "peakRssBytes": 115646464 }
  }
}
```

`GET /` and MQTT `status` add `resources` after `exitCode`, with both
`null` before the first command and while the latest one runs; each
record of 11's `GET /history` adds it after `by`. `GET /state` is
unchanged (this plan's call), so a measurement raises no state
notification. 11's `GET /metrics` gains a top-level `resources` object
next to its `commands` counts (this plan's call on the shape):

```json
{
  "resources": {
    "admit": { "cpuSeconds": 2.031, "peakRssBytes": 117440512 },
    "open": { "cpuSeconds": 0.812, "peakRssBytes": 115646464 }
  }
}
```

Like `commands`, it covers the rows received since the start.
`cpuSeconds` is the sum over the command's runs, `peakRssBytes` the
largest peak of one run; a `null` adds nothing, and a command with no
measured run is left out, so the object is `{}` before any.

### Storage, Failure and Version

The `commands` table gains `cpu_seconds REAL` and
`peak_rss_bytes INTEGER`, `NULL` when not measured, added to an older
database file as `exit_code` was (`src/queue.service.ts:68-74`, which
11 turns into `addColumn`). A replayed request key gets the stored
figures; an `interrupted` row has `null`.

A read that fails (permission, process gone, unparsable output, a
sampler that does not start) logs once per run at debug level and
leaves that sample out. Measurement never fails, delays or blocks a run
or a stop: the sampler is not awaited, and the timer is `unref`'d.

No shape breaks, so no bump is due; the version stays 11's.

### What 17b and 17c Add

17b measures the process tree, so Windows figures become the script's
and children count; 17c documents a `fidelity` parameter convention.

### Considered and Set Aside

- **Linux-only `/proc`**: the owner wants Windows too.
- **`process.resourceUsage()`**: the runner's own process only.
- **cgroup accounting**: needs a cgroup per script, so a container.
- **Measuring in the shell wrapper** (`/usr/bin/time`, a PowerShell
  prologue): changes how every script starts and mixes the figures
  into its output.

## Plan

1. Decide the mechanism. `pidusage` 4.1.0 (latest, 2026-10-13) runs
   `wmic` on Windows whenever `System32\wbem\WMIC.exe` exists, and
   `gwmi win32_process` through `powershell.exe` otherwise or with
   `useGwmi: true` (`lib/stats.js`, `lib/gwmi.js`). It passes the
   `wmic` criterion only with `useGwmi`, and then starts one
   PowerShell per poll, reports current memory only (`WorkingSetSize`;
   on Linux `rss` times the page size), no peak, and adds a dependency.
   The plan uses own reads (this plan's call, on those facts); the
   design decision records why.
1. `src/resources/resources.ts` (new): `ScriptResources`,
   `NO_RESOURCES`, `Sample`, `ResourceWatch` with
   `finish(): ScriptResources`, `Meter` (a pid, possibly `undefined`,
   and the start time to a watch), and `meterFor(platform)`, which
   gives the Linux or Windows meter or one that yields `NO_RESOURCES`.
1. `src/resources/linux.ts` (new): `parseStat` splits after the last
   `)`, as the command name may hold spaces and parentheses;
   `parseStatus` reads `VmHWM` in kB; `clockTicks()` caches
   `getconf CLK_TCK` (`execFileSync`, 1 s timeout) or 100;
   `readLinux(pid)` reads both files with `fs/promises`.
1. `src/resources/polling-watch.ts` (new): the Linux watch, sampling
   as the Spec says; `finish()` clears the timer.
1. `src/resources/windows.ts` (new): `windowsSampler(pid, start)`
   builds the loop with both as numbers, so no string reaches the
   command, starts it with execa (`windowsHide`, `reject: false`),
   parses each line into a `Sample`, keeps the largest `WorkingSet64`
   for a `PeakWorkingSet64` of 0, and `finish()` kills the sampler
   without awaiting it.
1. `src/execa-runner.ts`: the constructor has three parameters
   (`:27-31`), so `stopGrace` and the meter move into one options
   object, `{ stopGrace?, meter? }`, without a meter measuring nothing.
   `run` (`:40-54`) starts a watch on `subprocess.pid` after `execa` and
   calls `finish()` after the await; `checkResources()` returns it.
   `RunnerFactory.create` (`src/runner-factory.service.ts:8-21`) passes
   `meterFor(platform)`.
1. `checkResources()` joins `Runner`
   (`src/interfaces/runner.interface.ts`); `CommandResult`
   (`src/interfaces/command.interface.ts:6`) gains `ScriptResources` as
   a fourth element, so destructuring three keeps compiling;
   `CommandRecord` and `CommandStatus` gain `resources`.
   `ExecaManager.execute` (`src/execa-manager.service.ts:134-151`),
   `createStatus` (`:188-198`) and `checkStatus` (`:200-211`) add it;
   `storedResult` (`src/command-result.ts:16-28`) returns the stored
   figures.
1. Queue, after 11, which moves `RECORD`, `RECORD_BY_KEY` and
   `toRecord` to `src/queue.history.ts` and makes `addExitCode` an
   `addColumn(db, column, type)`: `connect`
   (`src/queue.service.ts:124-129`) adds the two columns, `RECORD` and
   11's `HISTORY` select them, and `complete` (`:151-165`) writes them.
   If `queue.service.ts` is still over 240 lines, `SCHEMA` (`:23-47`)
   moves to `src/queue.history.ts` too.
1. `CommandResultDto` and `resultDto` (`src/dto/command.dto.ts:62-75`)
   add `resources`, as does 11's `HistoryEntryDto`.
1. Metrics: `RESOURCE_TOTALS` next to 11's `COMMAND_COUNTS` in
   `src/queue.history.ts` (rows above the start's highest id,
   `SUM(cpu_seconds)` and `MAX(peak_rss_bytes)` by name, rows with both
   `NULL` left out); `Queue.resourceTotals()` returns it,
   `DescriptorService.metrics()` adds it and `MetricsDto` types it.
1. `test/data/scripts/busy` (a second of CPU, mode 100755), `busy.ps1`,
   in `test/config/runner.test.yaml`, `config/runner.test.yaml.sample`.
1. Documentation, as in Tasks; the README's new Resources section
   holds the platform table, the PowerShell note and the lower bounds,
   and `docs/issues/README.md` gets a status row.

## Tasks

- [x] `parseStat` reads fields 14 and 15 behind a name with spaces and
      `)`, `parseStatus` reads `VmHWM`, malformed text yields no sample.
      Check: `test/unit/resources.linux.spec.ts`.
- [x] The polling watch keeps the last sample, skips overlapping reads,
      logs repeated failures once, gives `NO_RESOURCES` without any;
      `meterFor('darwin')` measures nothing. Check:
      `test/unit/resources.polling.spec.ts` with fake timers.
- [x] The Windows sampler parses integer lines, prefers
      `PeakWorkingSet64`, ignores a malformed line and is killed by
      `finish()` without being awaited. Check:
      `test/unit/resources.windows.spec.ts` with a fake subprocess.
- [x] `ExecaRunner` reports CPU above 0.3 s and a peak above 1 MB for
      `busy`, `null` without a meter, and a stop is not delayed by the
      meter. Check: `test/integration/execa-runner.resources.spec.ts`
      (new; the Linux case on `linux` only, the Windows case on `win32`
      only, so CI runs the first).
- [x] The queue adds both columns once to a file of 11's version,
      returns `null` for its old rows, and stores and replays new
      figures. Check: `test/integration/queue.migration.spec.ts`,
      `test/integration/queue.resources.spec.ts` (new, as
      `queue.service.spec.ts` is at 249 lines).
- [x] `POST /`, `GET /`, `GET /history` and MQTT `execute`, `status`
      and `history` carry `resources`; `GET /metrics` sums by name;
      fakes and tuples of `CommandResult` gain `NO_RESOURCES`. Check:
      `test/e2e/command-input.spec.ts`,
      `test/unit/mqtt-request.execute.spec.ts`, 11's metrics specs,
      `test/unit/fsm.fixture.ts`, and `test/e2e/mqtt.broker.spec.ts`
      grepped for the old shapes (CI only).
- [x] README (POST /, GET /, GET /history, Resources), `DEVELOPER.md`
      (the `busy` script), `api/API.md` (POST /, GET /, GET /history,
      the metrics section) and `api/dev.api.http` updated; `DOCKER.md`
      needs nothing, as the image is Linux. Check: markdownlint-cli and
      prettier.
- [x] `docs/state-machine-design.md`: a decision with the next free D
      number when the pull request is opened (own reads, not
      `pidusage`; the direct child only; lower bounds), and Components
      lists `src/resources/`. Check: markdownlint-cli.
- [x] `yarn syntax`, `yarn build`, `yarn test --maxWorkers=2` and
      `npx tsc --noEmit --noUnusedLocals --noUnusedParameters` pass, no
      file is over 250 lines and no function crosses the Qlty limits.
      Check: their output, with Linux CI as the authority.

## Learnings

- **Drift.** 11 had already moved `RECORD`, `RECORD_BY_KEY` and
  `toRecord` to `src/queue.history.ts`, and `SCHEMA` and `addColumn`
  to `src/queue.schema.ts`, so `connect` calls `createSchema`, where
  the two columns were added; `queue.service.ts` went from 226 lines
  to 240 and nothing more moved. `ExecaManager.execute`, `createStatus`
  and `checkStatus` sat at `:140-157`, `:194-204` and `:206-217`, and
  `resultDto` at `src/dto/command.dto.ts:78-82`; the other references
  held. `test/integration/queue.service.spec.ts` had 243 lines, and
  `test/e2e/mqtt.broker.spec.ts` 249, which a shared `figures` keeps
  at 248.
- **`meterFor` lives in `src/resources/meter.ts`**, not in
  `resources.ts` as the plan has it: the watches import
  `NO_RESOURCES` from `resources.ts`, and `meterFor` imports the
  watches, so one file would make an import cycle.
- **The Windows sampler, as measured.** On Windows 11 with Windows
  PowerShell 5.1, the held process reads the final
  `TotalProcessorTime` only after `$p.Handle` was read once; without
  it the line after the exit had no CPU time. `WorkingSet64` and
  `PeakWorkingSet64` read `$null` after the exit, so the loop keeps
  the values of the last refresh that had them, starting from 0, and
  a line whose memory is 0 gives `peakRssBytes` `null` with a CPU
  time. A process that is gone before `Get-Process` makes the sampler
  exit with 1, which is logged once at debug level. The start that
  the sampler compares is `Date.now()` right after the spawn, against
  `ToUnixTimeMilliseconds()` of `StartTime`: both are truncated to the
  millisecond, so the script's own process never counts as later.
- **Readings this plan left open.** `Sample` carries a CPU time and a
  peak that may be `null`, for the Windows line above; a Linux read
  without `VmHWM` fails as a whole. `ExecaRunner` takes the meter in
  `{ stopGrace, meter }` and exposes it as a public `options`, like
  `command` and `args`, so the factory test reads it without bracket
  access. `readLinux` takes the `/proc` root as a parameter, as 17b
  plans for its tree, so its test runs on every platform against a
  temporary directory.
- **`busy`.** The POSIX script reads `/proc/uptime` with the `read`
  builtin, as a command substitution or `date` would start a process
  that is not measured; under dash in WSL (Ubuntu 26.04) it used
  0.36 s of user and 0.62 s of system time. `busy.ps1` spins for three
  seconds rather than one: while this host ran other test suites, a
  PowerShell took 5 to 12 s to start, and the sampler is one. Adding
  `busy` to the test configuration changed the command lists of
  `options.service.spec.ts`, `mqtt.spec.ts` and
  `mqtt.presence.spec.ts`.
- **Tests compare figures by kind.** Whether a run is measured
  depends on the platform and on timing, so the e2e and integration
  replies expect `MEASURED` of `test/utils.ts`, a number or `null` per
  figure, and `UNMEASURED` where no script ran. supertest's
  `.expect(body)` compares without Jest's matchers, so `postRequest`
  and `getRequest` of `test/e2e/util.ts` now compare the body with
  Jest's `expect`.
- **Which path ran where.** Locally, on Windows, the Windows case of
  `execa-runner.resources.spec.ts` passed and the Linux case was
  skipped; the parsers of both platforms, the polling watch with fake
  timers and the sampler with a fake subprocess ran everywhere. The
  Linux measurement itself, `busy` under `/proc`, ran only in CI,
  where it passed in about a second. Docker was not running on the
  host, so the Linux path was not tried in a container first.
- **SonarCloud on the PR** rated new code B for security: `getconf`
  ran through `PATH` (S4036), so it runs as `/usr/bin/getconf`, its
  place on Debian and Ubuntu; and the Windows watch started listening
  in its constructor (S7059), so `windowsSampler` calls `listen()`.
  Codecov missed the fallback to 100 ticks, which CI's `getconf`
  never takes, so `readClockTicks` takes the program as a parameter
  and a test names one that does not exist.
- **Version and decision.** No shape breaks, so the version stays
  0.10.0, as the Spec says. 11, 13 and 15b took D30 to D32, so this
  decision is D33.
