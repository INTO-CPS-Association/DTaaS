# 08 Runner Context and Events for Scripts

## Spec

Each DT adapts through its own MAPE-K loop (Monitor, Analyse, Plan,
Execute; see the [Concepts][dtn-concepts]). In the runner, a long-running
state's script is the natural place for the Monitor and Analyse steps,
and the events it raises are the Plan. Today a script inherits the
runner's environment and nothing more (`src/execa-runner.ts:33-35`),
and the contract for raising events is undocumented. This feature gives
scripts their context and makes the contract explicit.

### Runner variables

| Variable          | Value                                                                |
| :---------------- | :------------------------------------------------------------------- |
| `RUNNER_URL`      | `http://127.0.0.1:<port>`, with the port the HTTP server listens on  |
| `DT_ID`           | `id` of `runner.yaml`                                                |
| `DT_STATE`        | a state, as below                                                    |
| `DT_ENTRY`        | an entry number, as below                                            |
| `DT_PARAM_<NAME>` | each parameter value of 04 at the script's start, as `String(value)` |

`DT_PARAM_<NAME>` is `variableName()` of `src/fsm/parameters.ts`. For a
script the machine starts, `DT_STATE` and `DT_ENTRY` describe the entry
it starts for; for a transition with `stop: true`, the target, once the
stopped script has exited. For a script of `POST /` or the MQTT
`execute` route they describe the machine as it is: its current state
and entry, or empty and `0` before the first transition. Without a
state machine a script gets `RUNNER_URL` and `DT_ID` only: there is no
file, so no parameters and no declared environment.

The port is read after `app.listen`. The host `127.0.0.1` is correct
while `main.ts` calls `listen(port)` without a host, binding all
interfaces; binding one interface would change `RUNNER_URL` with it.

### Declared environment

The owner asked for variables declared at the file level and per state:

```yaml
env:
  LOG_LEVEL: info
  HINT: '${DT_ID}-${DT_PARAM_SCOPE}'
states:
  monitor:
    env:
      INTERVAL: 5
    transitions:
      stop: idle
```

- Names follow `/^[A-Z][A-Z0-9_]*$/` and may not start with `DT_` or
  `RUNNER_`. Values are strings, numbers (finite, as in 04) or
  booleans, stringified; `null` and nested values are refused.
- A value may interpolate `${NAME}` from the known-name set:
  `RUNNER_URL`, `DT_ID`, `DT_STATE`, `DT_ENTRY` and the `variableName()`
  of each declared parameter. Any other name, such as another declared
  variable (`${OTHER_DECLARED}`) or a process variable, is a startup
  error, so a file means the same on every host. There is no escape for
  a literal `${`. The value interpolated is the one the script gets.
- Merge order, later wins: process environment, runner variables,
  file-level `env`, state-level `env`. A script of `POST /` gets the
  state-level `env` of its command when that is a state, even another
  state than the current one, which `DT_STATE` still names (the README
  says so). A declared name can not replace a runner variable, but may
  replace an inherited one such as `PATH`.
- Windows names are case-insensitive: on `win32`, inherited names that
  match a runner or declared variable case-insensitively are dropped
  before the merge, so the child sees one value.

### Contract

The README tells a script how to raise a declared event:
`POST ${RUNNER_URL}/fsm/event` with `{ "event": "<name>" }` and
`Content-Type: application/json`, and what a reply means for it:

| Reply                                                                | For the script                                                                                                                             |
| :------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------- |
| `202` `accepted`                                                     | its state is being left: the next state's script starts, its own exit no longer moves the machine, and with `stop: true` `SIGTERM` follows |
| `400` `invalid event`, `Validation Failed`, `404` `no state machine` | a bug in the script or the state machine file; a retry does not help                                                                       |
| `409` `no transition`, `script running`                              | not now: the current state has no transition for the event, or the next state's script still runs                                          |
| `503` `stopping`                                                     | the runner is shutting down; the script should exit                                                                                        |

A shell example uses `curl` without `jq` (`000` when the runner can not
be reached); a PowerShell 5.1 example catches the exception that
`Invoke-RestMethod` throws on a `4xx` or `5xx` reply, as it has no
`-SkipHttpErrorCheck` (`0` when unreachable). Both are in the README,
Raising Events From Scripts.

A script reads parameters with `GET ${RUNNER_URL}/parameters` (04), or
from the `DT_PARAM_*` variables as they were at its start.
`POST /escalate` is not documented: 06 is not built and adds it. There
is no stdout protocol (non-goal in the index).

## Plan

1. Make room, behaviour unchanged, with the names and shapes of 05,
   which makes the same moves. `src/fsm/definition.ts` (239 lines):
   `LOOPING_EVENTS`, `completionTargets`, `findCycle` and
   `completionCycle` (130-165) go to `src/fsm/completion-cycle.ts`.
   `src/fsm/fsm.service.ts` (249 after 03): `check()` returns
   `this.machine?.describe(this.status)`, a new `StateMachine` method
   (05's); `follow()` is inlined into `event()`; and `runIfCurrent`
   (205-215) folds into `run`, which returns early when the entry is
   no longer current (the stop path) and otherwise calls `newCommand`
   synchronously, as the `enter` path needs; a test asserts both.
1. Options shared with 05:
   `export type RunOptions = { input?: string; env?: Record<string, string> }`
   in `src/interfaces/runner.interface.ts`, and
   `Runner.run(options?: RunOptions)`; whichever of 05 and 08 merges
   second drops its duplicate. `ExecaRunner.run` passes
   `env: options?.env` and `extendEnv: options?.env === undefined` to
   execa, whose own merge would restore a Windows name the builder
   dropped. `RunnerFactory.create` is unchanged.
1. `ExecaManager.newCommand(name, key?, options?: RunOptions)` hands the
   options through `start` and `execute` (106-143) to `runner.run`; a
   join or a repeat runs nothing and ignores them. The `Manager`
   interface (`src/interfaces/command.interface.ts:29-34`) follows; the
   constructor does not change, so no cycle with `FsmService`.
1. Add `src/fsm/script-context.ts`, importing `Definition` as a type
   only, so `definition.ts` imports it without a runtime cycle:
   - `envSchema`, names to stringified values with the name rules;
   - `RUNNER_VARIABLES` and `knownNames(definition)`, the one definition
     of the known-name set, and `envProblems(definition)`, one problem
     per unknown `${NAME}`, naming the variable and any state;
   - `scriptEnvironment(context: ScriptContext): Record<string, string>`,
     pure, taking one object with `id`, `url`, `command`, `state`,
     `entry`, `values`, `definition`, `inherited` and `platform`;
     `inherited` and `platform` default to `process.env` and
     `process.platform`, so tests inject them;
   - `runnerUrl(server: Server)` from `node:http`, `undefined` unless
     `server.address()` is an `AddressInfo` (it is `null` before
     `listen` and a string for a pipe), so nothing is cast;
   - `RunnerContext`, which holds the id, the URL, the definition and
     the parameters, and whose `environment(command, state?, entry?)`
     calls the builder; `FsmService` keeps one and adds only a few lines.
1. In `src/fsm/definition.ts`: the `env` key in `fileSchema` and
   `stateSchema`; `Definition.env` and a separate
   `Definition.stateEnv: ReadonlyMap<string, Env>` from `toDefinition`,
   so `states` keeps its value type; `field(content, 'env')` and each
   state's `env` in `hasProtoKey`, as zod skips a `__proto__` key; and
   `...envProblems(definition)` in `crossCheck`.
1. In `src/fsm/fsm.service.ts`: `load()` fills the `RunnerContext`;
   `setRunnerUrl(url?)`, where `undefined` leaves `RUNNER_URL` unset;
   `environment(command)`, from the current state and entry. `run`
   builds the environment from its own arguments and passes it through
   `scriptOutcome(manager, { state, env }, logger)`.
1. `AppController` gains `FsmService` (three constructor parameters)
   and passes `{ env: this.fsm.environment(name) }` to `newCommand`;
   so does the MQTT `execute` route (`mqtt-request.handler.ts:54-57`).
1. In `src/main.ts`, MQTT still starts before `app.listen`, so the
   startup state document reaches the broker; after `listen`, call
   `setRunnerUrl(runnerUrl(app.getHttpServer()))`. `listening` fires on
   `nextTick`, so the URL is set before any MQTT message can be read.
   Without `listen`, as in most tests, `RUNNER_URL` is unset and
   interpolates empty.
1. In `test/data/scripts/`, `print-context` and `.ps1` print `DT_ID`,
   `DT_STATE`, `DT_ENTRY`, `DT_PARAM_SCOPE` and `HINT` on one line;
   `raise-event` and `.ps1` raise `done` and print the status code.
   Shell scripts get `git update-index --chmod=+x`. `writeScripts` in
   `test/e2e/fsm.util.ts` copies them (`loops` becomes `copies`).
1. Update `README.md` (Create Commands: the variables; State Machine:
   `env`, the contract and both examples), `DEVELOPER.md` (the test
   scripts; the Linux e2e test needs `curl`) and the design document:
   A4 gains "A script is such a client: it raises events over HTTP
   through `RUNNER_URL`"; the next free decision number, picked in the
   pull request, records the context as environment variables with
   start-time values (S6), `env` interpolating only runner variables,
   and events over HTTP, not stdout; the Validation list and the
   Components table grow. The version stays; no route changes.

## Tasks

- [x] The moves of step 1 change no behaviour; `run` starts the script
      synchronously on `enter` and not for a stale stop. Check:
      `test/unit/fsm.definition.spec.ts`, `test/unit/fsm.service.spec.ts`
      and `test/unit/fsm.service.stop.spec.ts`; `wc -l`.
- [x] `scriptEnvironment` gives the runner variables with and without
      a machine and a URL, merges in order, interpolates, stringifies,
      adds a state's `env` only for its command, and drops `Path` for a
      declared `PATH` and `dt_id` for `DT_ID` on an injected `win32`,
      not on `linux`. Check: `test/unit/script-context.spec.ts` (new).
- [x] The schema accepts `env` at both levels and rejects a lower-case
      name, a `DT_` or `RUNNER_` name, a nested or `null` value, a
      non-finite number, `${OTHER_DECLARED}`, `${HOME}` and a
      `__proto__` key at either level, each with a message. Check:
      `test/unit/fsm.declared-env.spec.ts` (new; the definition spec
      is 239).
- [x] `ExecaRunner` gives the child exactly the environment passed,
      built with `scriptEnvironment` so that `PATH` and `SystemRoot`
      still start `/bin/sh` and `powershell.exe`;
      `ExecaManager` hands options to a new run and ignores them on a
      join or a repeat. Check: `test/integration/execa-runner.spec.ts`,
      `test/integration/execa-manager.script-env.spec.ts` (new).
- [x] `run` passes the `env` of the entry it starts, also for a stop
      transition's target, and `environment(command)` that of the
      current entry; in `test/unit/fsm.fixture.ts` the fake `newCommand`
      takes a third argument and the fake config gains `getId`. Check:
      `test/unit/fsm.service.script-env.spec.ts` (new), asserting the
      `env` that `newCommand` receives.
- [x] `POST /` and MQTT `execute` pass `fsm.environment(name)`. Check:
      the `newCommand` assertions of
      `test/integration/app.controller.spec.ts` and
      `test/unit/mqtt-request.handler.spec.ts` expect it.
- [x] With a parameter `scope` and a file-level
      `HINT: '${DT_ID}-${DT_PARAM_SCOPE}'`, `print-context` prints
      `dt-1 print-context 1 single dt-1-single` when the machine runs
      it, an empty state and `0` from `POST /` before the first
      transition, and only `DT_ID` without a machine; after
      `await app.listen(0)` and the same `setRunnerUrl` call as
      `main.ts`, `raise-event` moves the machine on `done`. Check:
      `test/e2e/script-context.spec.ts` (new).
- [x] The built runner loads. Check: `test/e2e/dist.spec.ts` after
      `yarn build`. Documents updated. Check: from the repository root,
      `npx markdownlint-cli -c .markdownlint.yaml` on them.
- [x] `yarn build` and `yarn test` pass,
      `npx tsc --noEmit --noUnusedLocals --noUnusedParameters` is clean
      (eslint lints no `.ts` file here), no changed file reaches 250
      lines, and no function crosses the Qlty thresholds. Check: their
      output; the thresholds counted by hand.

## Learnings

- Issue 03 left `fsm.service.ts` at 249 lines, so a private builder
  call did not fit: `RunnerContext` holds the id, URL, definition and
  parameters, and with the moves of step 1 the service ends at 248.
- zod 4 reports a refused record key only as "Invalid key in record",
  so `envSchema` checks the names in a `superRefine` to name the rule.
- `extendEnv: false` gives the child nothing but the env passed, so the
  builder must carry the inherited environment: without `PATH` and
  `SystemRoot`, `/bin/sh` and `powershell.exe` do not start.
- The e2e helper `startRunner` calls `app.init()`, not `listen`, so
  `RUNNER_URL` is unset in most tests; a test that needs it calls
  `app.listen(0)` and `setRunnerUrl` itself, as `main.ts` does.
- The runner image has no `curl`, so the README's shell example needs
  a `node` variant for scripts that run in the container.
- Starting MQTT after `listen` lost the startup state document over
  MQTT, as the notifier sends it at bootstrap; the order was restored.
- `app.controller.spec.ts` did not await `loadConfig`; it now awaits it
  and loads `FsmService`, whose environment needs the id.
- For 05: `scriptOutcome` takes `{ state, env }` and `POST /` passes
  `{ env }`, so 05 adds `input` to that object; `completionCycle` is a
  default export. For 06: escalation belongs in the README's Raising
  Events From Scripts.

[dtn-concepts]: ../../../../../system/servers/execution/runner/DT-networks.md#concepts
