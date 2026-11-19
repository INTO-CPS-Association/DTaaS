# 10 Stop a Running Script

## Spec

A parameter update ([04](04-parameters.md)) or a DT's removal may need
the current script to end. D10 of the design document says the runner
cannot cancel a script: `ExecaRunner.run` awaits execa and keeps no
handle (`src/execa-runner.ts:20-32`), and a long state is left only by
an event while its script keeps running. This feature adds a stop.

### Mechanism

A stop sends `SIGTERM` and, if the process is still alive after the
grace period, `SIGKILL` (execa's `forceKillAfterDelay`). A run is
`stopped` only when the runner's own `stop()` was called and the
process then exited; a process killed from outside (`kill`, the OOM
killer) stays a failure. `stop()` is idempotent: a second call while
the first waits does nothing more.

execa resolves only after the script's stdout and stderr close. A
script whose children keep the pipes open (a foreground `sleep` under
`sh` survives the shell's `SIGTERM`) holds the stop until they exit;
scripts must end their children on `SIGTERM`, for example with `exec`
or a `trap`. On Windows, execa ends `powershell.exe` at once with
`TerminateProcess`, and the processes the script started keep running.
The README says both.

### Configuration

`stopGrace` in `runner.yaml`, in milliseconds, default `5000`. Until
[01](01-dt-identity.md) merges it is an optional key of today's
`ConfigValues` with a `getStopGrace()` getter; on the rebase after
[01](01-dt-identity.md) it moves into [01](01-dt-identity.md)'s schema.

### Outcome

`run` reports one of `success`, `failed` and `stopped`
(`RunOutcome`). `CommandResult` becomes `[RunOutcome, Map]` in place of
`[boolean, Map]`, and the queue stores the matching status: `valid`,
`invalid` or `stopped`. A repeated request key of a stopped run, and a
request joined to a run that is then stopped, get `stopped`.
`POST /` and the MQTT `execute` route answer a stopped run with `200`
and `{ "status": "stopped" }`; success and failure keep today's
replies.

### `$stopped`

A stopped script of the current entry completes with a new completion
event, `$stopped`, next to `$success` and `$failure`, and the script
status becomes `stopped` (a new `ScriptStatus`). A state with no
`$stopped` transition stays idle in that state. A deliberate stop never
looks like a crash: it does not count for `onFailure` escalation
([06](06-escalation.md)).
The completion-cycle check leaves `$stopped` out: it fires only after
an outside `POST /stop`, so a loop through it cannot run by itself.

### API

`POST /stop` and `<base>/stop`, body optional (`{}`, an empty HTTP
body or an empty MQTT payload all mean "everything"):

```json
{ "name": "execute" }
```

Without `name` every run in progress is stopped; with it, that run
only. Reply `200 { "stopped": ["execute"] }`, `[]` when nothing was
running. The route takes no request key: a repeat finds nothing
running and answers `[]`. The reply comes when the processes have
exited, so it can take the grace period and more; it does not wait for
the machine's `$stopped` transition, so a `GET /fsm` straight after may
still show the old state for a moment.

### Transition with stop

```yaml
states:
  execute:
    transitions:
      restart: { state: execute, stop: true }
      stop: idle
```

A transition value is a state name, as today, or `{ state, stop: true }`
(`stop: false` and unknown keys are errors). `stop: true` is refused on
`$success`, `$failure` and `$stopped`, whose script has already ended.

On such an event the runner, in this order:

1. refuses with `script running` if the target's script runs and the
   target is not the current state (D8 as before);
1. enters the target synchronously, which increments the entry number,
   so the old script's completion is stale and ignored;
1. sets the script status to `running` and replies
   `202 { "status": "accepted", "state": "<target>" }`;
1. stops the script of the state it left (the name captured before
   entering), waits for it to exit, and then, unless shutdown began or
   a later entry happened meanwhile, runs the target's script. When
   that script had already finished, the stop does nothing and the
   target runs at once.

So a self-transition with `stop: true` restarts the script, which is the
use case of a parameter change. Without `stop: true` D8 still refuses
it while the script runs.

A `transition` request while a script runs stays `409 busy` (D7). A
Manager that wants to force a state calls `POST /stop` first, which
works only when the state has no `$stopped` transition; otherwise the
machine moves on and is busy again.

## Plan

1. Add `stopGrace?` to `ConfigValues` and `getStopGrace()` to
   `src/config/configuration.service.ts`.
1. Add `RunOutcome` and `stop(): Promise<void>` to `Runner`
   (`src/interfaces/runner.interface.ts`). In `src/execa-runner.ts`,
   keep the subprocess, pass `forceKillAfterDelay`, record that
   `stop()` was called, catch the rejection as today, and map the
   result to an outcome. `RunnerFactory.create` passes the grace
   period.
1. Change `CommandResult` to `[RunOutcome, Map]`
   (`src/interfaces/command.interface.ts`) and every user: `Queue.complete`
   and `storedResult` (`src/queue.service.ts`,
   `src/execa-manager.service.ts`), `executeResponse`
   (`src/dto/command.dto.ts`), `AppController.newCommand`, the MQTT
   `execute` route, `FsmService.succeeds`, and the tests and fakes
   (`test/unit/fsm.fixture.ts`, which also gains a `stop(name)` that
   finishes the fake run as `stopped`, and the specs using
   `[true, …]`).
1. In `ExecaManager`, create the runner in `start` and keep it in
   `Run`, together with the promise `start` returns; add `stop(name?)`
   that stops the matching runs and awaits those promises, so the run
   has left `running` when the stop resolves and a new `newCommand` of
   the same name starts afresh instead of joining it. It returns the
   names. A run whose command is not permitted has no
   runner and nothing to stop.
1. In `src/fsm/definition.ts`, add `$stopped` to `COMPLETION_EVENTS`,
   accept the object transition form, refuse `stop` on completion
   events, keep `$stopped` out of `completionTargets`, and carry the
   flag in `Transitions`. `src/fsm/state-machine.ts`'s `next()` returns
   the target and the flag.
1. In `src/fsm/fsm.service.ts`, map the outcome to `$success`,
   `$failure` or `$stopped`. Put the stop-transition path of the event
   flow above into a helper or a small unit of its own, so the service
   stays under 250 lines and each function under complexity 5.
1. Add `POST /stop` to `src/app.controller.ts` with a schema that
   accepts no body, and the `stop` MQTT route, treating an empty
   payload as `{}`.
1. Add test scripts to `test/data/scripts/` that loop on short sleeps
   (`while :; do sleep 0.1; done`, and one with `trap '' TERM`), with
   `.ps1` versions.
1. Update `api/*.http`, `README.md` (State Machine: the long-state
   guidance, the pipe and Windows limits; API; MQTT API), and the
   design document (replace D10, amend D7 and D8, add decisions for
   `$stopped` and `RunOutcome`).
1. Bump the minor version in `package.json` (0.6.0 after
   [01](01-dt-identity.md)'s 0.5.0) and note the new `stopped` reply of
   `POST /` in the README.

## Tasks

- [x] `ExecaRunner.stop` ends a looping script with `stopped`; a script
      that ignores `SIGTERM` is killed after the grace period; an outside
      kill is `failed`; a second `stop()` is harmless. Check:
      `test/integration/execa-runner.spec.ts` (the `SIGTERM` cases on
      POSIX only).
- [x] `ExecaManager.stop` stops one named run or all, awaits them,
      records `stopped`, a repeated key or joined request gets
      `stopped`, and a `newCommand` of the same name after the stop
      runs the script again. Check: `test/integration/execa-manager.stop.spec.ts`,
      `test/integration/queue.service.spec.ts`.
- [x] Definition accepts the object form, rejects `stop: false`, unknown
      keys and `stop` on completion events, and accepts a loop through
      `$stopped`. Check: `test/unit/fsm.definition.spec.ts`.
- [x] A `POST /stop` of the current script raises `$stopped` and follows
      its transition, or stays idle with status `stopped`; a
      stop-transition enters the target before the old script exits,
      ignores its completion, and restarts a self-transition. Check:
      `test/unit/fsm.service.stop.spec.ts` with a fake manager,
      `test/e2e/fsm.stop.spec.ts` with the loop script.
- [x] `POST /stop` and the MQTT route answer as specified, including an
      empty body and payload. Check: `test/e2e/stop.spec.ts`,
      `test/unit/mqtt-request.handler.spec.ts`.
- [x] README, design document (D7, D8, D10) and request files updated.
      Check: `npx markdownlint-cli` on them.
- [x] `yarn syntax`, `yarn build` and `yarn test` pass, and no function
      crosses the Qlty thresholds. Check: their output.

## Learnings

- A stop transition must enter its target before stopping the old
  script, so the old completion is stale; a self-transition needed D8
  checked only for another state, and the restart could join the dying
  run until `stop()` awaited the run's start promise.
- Two quick stop transitions overlapped scripts until their stops were
  chained (`pendingStop`).
- execa resolves only when stdout and stderr close: a child that keeps
  them open, such as a foreground `sleep` under `sh`, holds a stop, so
  test scripts loop on short sleeps.
- On Windows the stop ends `powershell.exe` at once and the processes it
  started keep running; `stopGrace` has no effect there.
- The `SIGTERM` grace-period test is skipped on Windows, so it first ran
  in CI.
- SonarCloud does not count supertest's `.expect()` chains as test
  assertions, and flags `await` inside a loop; both turned up only in CI.
