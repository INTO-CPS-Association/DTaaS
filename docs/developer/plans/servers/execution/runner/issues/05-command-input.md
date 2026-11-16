# 05 Command Input, Outcome and Exposure

## Spec

In the hospital example of the [Concepts][dtn-concepts], the Manager submits
`admit(p)` to a DT and depends on its outcome.
Today `POST /` takes a name only, passes nothing to the script, and
answers `400 invalid command` both for a failed script and for a
command that is not permitted. This feature adds input, a result in
the reply, a `failed` status, and the commands a Manager may submit.
Unlike item 5 of [DT Networks][dtn], the input is not recorded and has no
per-command schema (a non-goal).

### Request

```json
{ "name": "admit", "input": { "patient": "p-17", "ward": "B" } }
```

- `input` is optional and, when present, a JSON object; `{}` is valid,
  an array, a string, `null` or an own `__proto__` key is not. Its serialised form,
  `Buffer.byteLength(JSON.stringify(input))`, is at most 64 KiB (65 536
  bytes). Any other `input` gets the existing `400 Validation Failed`.
  Over HTTP, Express refuses a body over its 100 kB `json` limit with
  `413` before validation; MQTT payloads have only the 64 KiB cap.
- The input goes to stdin as one line of JSON and a newline, and stdin
  is closed; without input, or for a script the state machine starts,
  stdin is closed empty, so a script that reads it never hangs. Nothing
  goes on the command line, which keeps arguments out of a remote
  execution path.
- The input is not stored: it can hold personal data, such as a
  patient, and nothing reads it back. A script that prints its input
  puts it in the stored logs; the README says so.
- A repeated request key gets the stored result, whatever its `input`.
- A request with `input` for a command that is running is refused with
  `409 command running`, as joining the run would drop its input. It is
  not added to the history and its key is not kept, so a retry is
  checked again. A request without `input` joins the run as today.

### Reply

```json
{
  "status": "failed",
  "result": { "exitCode": 3, "stdout": "", "stderr": "no free bed" }
}
```

| `status`          | HTTP | When                                                                            |
| :---------------- | :--- | :------------------------------------------------------------------------------ |
| `success`         | 200  | The script exited with 0                                                        |
| `failed`          | 200  | A permitted script exited non-zero, was killed from outside, or could not start |
| `stopped`         | 200  | A stop request stopped the script                                               |
| `invalid command` | 400  | The command is not in `commands`, or the request key is of another command      |
| `command running` | 409  | The request has `input` and the command is running                              |

- `result` is present for `success`, `failed` and `stopped`, with the
  logs whatever the outcome (before, those of a failed or stopped run
  were empty). `exitCode` is `null` for a stopped script, even one
  that exits with a code, and, on POSIX, for one that could not start
  or was killed by a signal, as execa gives `undefined` then (Windows
  reports codes for those; see Learnings).
- MQTT `execute` answers the same bodies. A failing script was
  `400 invalid command`: the breaking change, at version `0.7.0`.

### Stored status

`commands.status` is `valid`, `failed` (new), `invalid` (not
permitted) or `stopped`, and a new `exit_code` column holds the code:

- `GET /` and MQTT `status` may show `failed` and gain `exitCode`
  (`null` before the first command); `command.status` of `GET /state`
  may be `failed` (`CommandStateStatus` of 02, `src/dto/state.dto.ts`).
- A replayed key (`storedResult`) gets `failed` with the stored
  `result`; a row that never finished, as after a crash, now replays as
  `failed` with `exitCode: null`. Rows from before 0.7.0 keep `invalid`
  for failed scripts and replay as `invalid command`, as they did.
- `GET /history` stays as it is (11 extends it). `GET /fsm` keeps
  `invalid` for a failed script: `ScriptStatus` is the machine's, and
  `FsmService` is left alone.

### Exposure

The state machine file lists the commands a Manager may submit:

```yaml
manager:
  commands: [admit]
```

Each must be in `commands` of `runner.yaml`, or the runner does not
start. `GET /dt` gains `"manager": { "commands": ["admit"] }`, with
`[]` without a machine or a list, as for a bare `manager:`. Nothing
enforces the list until 15; the README says so.

## Plan

As implemented; deviations from the signed-off plan are marked _(changed)_.

1. `RunOptions` of `runner.interface.ts` carries `input` next to 08's
   `env`; `Runner` gets `run(options?: RunOptions)` and
   `checkExitCode()`. `CommandResult` gains the exit code as a third
   tuple element, so `const [outcome] = await manager.newCommand(state)`
   in `scriptOutcome` keeps compiling; `CommandRecord`, `CommandStatus`
   and `Manager.newCommand(name, requestKey?, options?)` follow.
1. `ExecaRunner.run` passes `input: options?.input ?? ''` and
   `reject: false`, keeps the logs whatever the outcome, and the exit
   code unless stopped. `stop()` lost its `.catch`, as the subprocess no
   longer rejects _(changed)_.
1. `src/dto/command.dto.ts`: `input` in `executeCommandSchema` (no
   `.required()`), `MAX_INPUT_BYTES`, `runOptions`, `CommandRefused`,
   `EXECUTE_STATUS_CODES` and `executeReply`, which replace
   `EXECUTE_STATUS` and `executeResponse`.
1. `ExecaManager`: `newCommand` refuses input for a running command
   before `join`; `execute` refuses a command that is not permitted
   after `Queue.refuse(id)`; `repeat` rejects a key of another command;
   `checkStatus` adds `exitCode`. A refused run's `result` rejects to
   the requests that await it, and `stop` and shutdown settle it with
   `allSettled`; nothing swallows it. The file would have reached 246
   lines, so `storedResult` and `refuseInput` live in
   `src/command-result.ts` _(changed)_.
1. `Queue`: `exit_code` in `SCHEMA`; `connect()` runs `exec(SCHEMA)`,
   then `ALTER TABLE` when `PRAGMA table_info(commands)` has no
   `exit_code`; `failed` status; `refuse(id)` signals a change as
   `complete()` does. `CommandStateStatus` gains `failed`.
1. `AppController` and the MQTT `execute` route answer
   `executeReply(newCommand(name, key, runOptions(dto, env)))`, where
   `env` is 08's `FsmService.environment(name)`, the controller with
   `EXECUTE_STATUS_CODES[reply.status]`.
1. `src/fsm/manager.ts` holds `managerSchema`, nullish like
   `stateSchema`, with a nullish `commands` too _(changed)_, and
   `managerProblems`. `definition.ts` gains the key, `managerCommands`,
   `manager?.commands ?? []` and one call in `crossCheck`; the
   completion-cycle search moved to `src/fsm/completion-cycle.ts` as a
   default export, as 08 has it.
1. `StateMachine.describe(status)`, which 08 also added, holds the body
   of `check()`, and `StateMachine.managerCommands` feeds
   `FsmService.managerCommands()`. `DescriptorService` reads
   `check() !== undefined` instead of `hasMachine()`, as 06 also does,
   and adds `manager`, as does `DescriptorDto`. With 06 merged,
   `FsmService` would have reached 254 lines, so `raise()` moved into
   06's `Requests` as `requests.raise(event, handle, logger)`
   _(changed)_ (249 lines).
1. Test scripts `echo-input`, `fail` and their `.ps1` versions (shell
   ones 100755) join `test/config/runner.test.yaml`, whose inline
   comments moved to their own lines for prettier _(changed)_, and
   `config/runner.test.yaml.sample`; `state-machine.yaml` lists
   `create` under `manager` for the request files.
1. README (Create Commands, Manager Commands, POST /, GET /, GET /dt,
   GET /state, Repeated Requests, MQTT API, the 0.7.0 note),
   `api/*.http` and `api/README.md`, the design document (Validation,
   Components, D24 and D27, as 08 took D23 and 06 and 07 hold D25 and
   D26) and `package.json` at `0.7.0`. The pull
   request lists `docs/developer/codebase/runner.md` and the user
   documentation copy of the README as stale.

## Tasks

- [x] `ExecaRunner` passes input on stdin, closes empty stdin, returns
      the exit code and logs of a failing script, `null` for a stopped
      one, and, on POSIX, for one that could not start (the ENOENT test
      kept) or was killed. Check: `test/integration/execa-runner.spec.ts`.
- [x] `Queue` adds `exit_code` once to a file of 0.6.0, returns `null`
      for its old row and the code of a new one, stores `failed`, and
      `refuse` leaves a finished `invalid` row. Check:
      `test/integration/queue.migration.spec.ts` (new).
- [x] The schema accepts `{}` and an input of exactly 65 536 bytes, and
      refuses one byte more, a list, a string and `null`. Check:
      `test/unit/validation.pipe.spec.ts`.
- [x] `ExecaManager` gives `success`, `failed` and `invalid command`,
      passes input, refuses input for a running command without keeping
      it, joins without input, and replays keys as specified. Check:
      `test/integration/execa-manager.input.spec.ts` (new),
      `execa-manager.service.spec.ts`, `execa-manager.stop.spec.ts`.
- [x] `manager` is read, empty when left out or bare, and refused with
      the file name for an unknown key or command. Check:
      `test/unit/fsm.manager.spec.ts` (new), `fsm.definition.spec.ts`.
- [x] `POST /` answers every row of the reply table, `413` above 100 kB,
      `GET /` has `exitCode`, `GET /state` shows `failed`, `GET /dt`
      shows `manager`. Check: `test/e2e/command-input.spec.ts` (new, in
      place of `commander.spec.ts`, which tests the CLI _(changed)_),
      `app.controller.spec.ts`, `test/e2e/descriptor.spec.ts`,
      `options.spec.ts`, `stop.spec.ts`, `descriptor.service.spec.ts`.
- [x] MQTT `execute` answers the same bodies, `status` has `exitCode`.
      Check: `test/unit/mqtt-request.execute.spec.ts` (new),
      `test/e2e/mqtt.spec.ts`.
- [x] The machine still moves on `$success` and `$failure` with the new
      fixture shape. Check: `test/unit/fsm.service*.spec.ts`,
      `test/e2e/fsm*.spec.ts`; `script-outcome.ts` is unchanged.
- [x] README, design document and request files updated. Check:
      markdownlint-cli 0.37.0 and prettier 3.9.9 from the root.
- [x] `yarn build` and `yarn test --maxWorkers=2` pass (525 passed, 9
      skipped); `npx tsc --noEmit --noUnusedLocals --noUnusedParameters`
      is clean; no file over 250 lines; Qlty counted by hand. Check:
      their output.

## Learnings

- On Windows, execa reports exit code 1 for a missing executable and
  for a process killed from outside, and `powershell.exe -File` with a
  missing script exits with 4294770688. `exitCode: null` for those
  cases holds on POSIX only; the tests assert it there.
- With `reject: false` the subprocess promise never rejects, so the
  `.catch` in `stop()` became dead code that coverage flagged.
- A script that does not read stdin still succeeds with a 65 kB input:
  execa ignores the broken pipe.
- `CREATE TABLE IF NOT EXISTS` never adds a column to an existing
  table; a new column needs `PRAGMA table_info` and `ALTER TABLE`
  after it, the pattern for 09.
- An unfinished row keeps the default status `invalid`, so
  `storedResult` checks `finished` before reading `invalid` as a
  refusal.
- `{"text":""}` is 11 bytes; exact-size tests build the input from
  two-byte characters. Express's 100 kB limit answers `413` before the
  pipe runs.
- `RunOutcome` has no value for a request that ran nothing, so
  refusals reject with `CommandRefused`; a new caller of `newCommand`
  (06) must turn that into a reply or let `scriptOutcome` count it as
  failed.
- A PowerShell start took 1.4 to 3.4 s on the loaded host whether
  stdin was closed or not; tests that run two scripts in sequence need
  the 30 s timeout of the other script specs.
- `fsm.service.ts` is at 249 lines and `queue.service.spec.ts` at
  249: 09 moves something out of the service before adding, and puts
  new queue tests in new files.
- zod 4's `z.record` copies an object and drops an own `__proto__`
  key, so the script would get other input than the client sent and
  the size check would measure the copy. `input` is checked as received
  with `z.custom` and refuses that key (found in review).
- supertest sends a request only when `then` is called on it, so a
  test that starts a long request before polling must call it.
- 08's tests fake a runner and assert the old reply body; a change to
  `Runner` or to the reply updates them too.
- 06 can tell a crash (`failed`, with `exitCode`) from a refusal
  (`invalid`).

[dtn-concepts]: ../../../../../system/servers/execution/runner/DT-networks.md#concepts
[dtn]: ../../../../../system/servers/execution/runner/DT-networks.md
