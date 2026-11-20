# 09 Persist the Machine Across Restarts

## Spec

A DT that forgets its state on restart reports a wrong state to the
Manager (R1), and an orchestrator moves and restarts DTs at
runtime. D12 of the design document kept the machine in memory because
nothing asked for recovery; this feature stores it and restores it.

### What is stored

The machine's state, entry counter and script status, as one row of a
new `machine` table in `Queue`'s SQLite database, written on every
entry and every completion; parameter values are stored since
[04](04-parameters.md). With `database` in `runner.yaml` the store
survives a restart; in memory
nothing is restored. The reply does not depend on the write: a
failed write is logged. During a graceful shutdown (D14 stands), a
script that finishes still has its status stored and only its
completion transition is skipped, so it is not reported `interrupted`.

### Recovery

`main.ts` runs the configuration, `FsmService.load()`, `Queue.open`,
`FsmService.restore()`, MQTT, `listen`, so no
request reaches the machine before `restore()`, which:

1. Marks every unfinished `commands` row `interrupted`, finished at
   the startup time, even without a machine: no script survives.
1. Without a state machine in `runner.yaml`, logs the stored state and
   ignores (but keeps) the row.
1. Otherwise applies the four recovery rules, then writes the result
   back, so a stale or `running` row is overwritten at once:
   - no row, or a row of an unstarted machine: unstarted, status
     `none`, with the stored entry counter (`0` without a row);
   - a stored state no longer in the definition: a warning naming it,
     then unstarted, status `none`, with the stored entry counter, so
     entry numbers never repeat for a Manager;
   - a stored state with status `running`: that state and entry, status
     `interrupted`: the script did not finish and is not re-run;
   - a stored state with any other status: that state, entry, status.

1. Restores a stored parameter value only if the parameter is still
   declared and the value fits its declaration. Others (removed
   parameter, changed type, removed enum value) are dropped with one
   warning, at each start until set again, and start at the default.
   Controllability is not checked; no declared event is raised (S6).
1. Sends no notification of its own: [03](03-state-notifications.md)'s
   `Notifier` subscribes in `onModuleInit` and sends the startup
   document from
   `onApplicationBootstrap`, both run by `listen` (`app.init()` in
   tests) after `restore()`, so that document is the restored one.

`interrupted` is a new `ScriptStatus` and `CommandStateStatus`. The
machine is idle in it (D7: transitions and events move it on). No
script starts on recovery, so a crash loop cannot rerun one forever.
Transitions are not added to the history
([11](11-history-metrics.md)).

After a restart, `GET /fsm` of a runner killed while `execute` ran:

```json
{ "state": "execute", "status": "interrupted", "entry": 3, "events": ["stop"] }
```

`GET /` and `GET /state` show its command as `interrupted`; a repeat of
its request key is `failed` at the manager (`storedResult` maps an
unknown status so): `400 invalid command` before
[05](05-command-input.md), `200 failed` after.

## Plan

1. Start after [06](06-escalation.md) and [08](08-script-context.md)
   merge; make room first in
   `src/fsm/fsm.service.ts` (249 lines), behaviour unchanged:
   - `isCurrent` folds into the start check of `run`;
   - the refusal logging of `raise` and `complete` becomes one
     `logStay(logger, reply, event)` in `src/fsm/requests.ts`, with the
     text `Stayed in state <state> on <event>: <status>` and the debug
     level for `no transition` that
     `test/unit/fsm.service.parameters.spec.ts` asserts;
   - `pendingStop` moves to a plain `StopChain` in
     `src/fsm/stop-chain.ts`, built from the `ExecaManager` in the
     constructor body; `after(left, run)` runs `run` once the stopped
     script of `left` has exited ("manager.stop never rejects");
   - `enterStopping` folds into `enter(machine, state, left?)`, guarded
     by `left !== state && this.manager.isRunning(state)`;
   - (changed) [08](08-script-context.md)'s `follow`, the one caller of
     `enter` with `left`, folds into `move`, which drops the
     `Transition` import. [05](05-command-input.md) moved `raise` into
     `Requests.raise`, which now calls `logStay`, and
     added `managerCommands`: the merge came to 252 lines, so
     `StopChain.after(left?, run)` also runs `run` at once without
     `left`, and `enter` loses its branch. The service ends at 248.
1. `interrupted` joins `ScriptStatus` (`src/dto/fsm.dto.ts`, which also
   gains `StoredMachine`) and `CommandStateStatus`
   (`src/dto/state.dto.ts`), but no `STATUS` map: it is no
   `RunOutcome`. The `OUTCOME` comment in `src/execa-manager.service.ts`
   says `interrupted` counts as failed.
1. `src/queue.service.ts` gains `saveMachine` (`INSERT OR REPLACE`, row
   1), `loadMachine` (`NULL` state as `undefined`) and
   `markInterrupted(time)` (`finished_at = datetime(?)` on unfinished
   rows); none emits a change. `CREATE TABLE IF NOT EXISTS machine`
   (`id` fixed to 1 by a `CHECK`) joins `SCHEMA`: no `ALTER` is needed.
   (changed) The SQL is in `src/queue.machine.ts` from the start:
   [05](05-command-input.md) took the service from 197 to 221 lines, and
   with 09's 24 it is at 245.
1. `src/fsm/recovery.ts`, pure: `recover(definition, stored?)` returns
   `Recovered = StoredMachine & { warning? }` by the four rules,
   complexity 3, two returns, with the `running` to `interrupted`
   mapping and the warning in helpers.
1. The constructor of `StateMachine` takes
   `(definition, current?, entries = 0)`.
   `Parameters.restore(values): string[]` commits the values of
   declared parameters that fit, and returns the other names.
   (changed) [08](08-script-context.md)'s `RunnerContext` keeps the
   definition private, so `FsmService.load()` keeps it in a field.
1. `src/fsm/machine-store.ts`: a plain `MachineStore(queue, logger)`
   with `save` (a try/catch that logs) and
   `restore(definition?, parameters?)`, which marks the commands, logs
   and ignores a stored row without a definition, applies `recover`,
   writes the result back and restores the parameters; one helper logs
   both warnings.
   (changed) No `markInterrupted` or `load` wrappers, as only `restore`
   uses them; `save` takes `{ state, entry }`, which both a
   `StateMachine` and a `Recovered` have.
1. `src/fsm/fsm.service.ts`: a `MachineStore` field built in the
   constructor body (no constructor gains a parameter); `restore()`
   sets `status` and `machine` from `store.restore`; `enter` stores the
   `running` entry; after the script `run` sets, emits and stores the
   status whenever `machine.entry === entry`, and skips only `complete`
   once `stopping` is set. The start check keeps `stopping`, so a stop
   transition's target does not start during shutdown and comes back
   `interrupted`.
1. `ExecaManager.onApplicationShutdown` awaits one `setImmediate`
   between the runs settling and `close()`; its comment states the
   invariant that nothing between a run settling and the write awaits
   I/O.
1. `src/main.ts`: `FsmService.restore()` right after `Queue.open`.
1. `test/unit/fsm.fixture.ts`: the fake queue gains `loadMachine`,
   `saveMachine`, `markInterrupted` and `parameterValues`.
   `test/e2e/util.ts`: `startStoredRunner` mirrors `main.ts` without
   MQTT; `startRunner` stays in memory. (changed) Both share two small
   helpers, `createApp` and `configure`.
1. Documents: `README.md` (Command History, a Restarts section for the
   lost-state text, `interrupted` in `GET /`, `GET /state`, `GET /fsm`
   and Repeated Requests, the Parameters text on defaults, a 0.8.0
   line); `docs/state-machine-design.md` (D12 replaced, D28 for
   `interrupted`, a Behaviour item, Components, Error Handling, Out of
   Scope); the index row and the Order diagram; version `0.8.0`
   ([05](05-command-input.md) claims `0.7.0`, D24 and D27). `api/*.http`
   and `DEVELOPER.md` are
   unchanged. (changed) At the owner's request: a user guide,
   `STATE-MACHINE.md`, with two worked examples, linked from the
   README; the design document rewritten for runner developers, with
   its sequence diagram corrected and state diagrams of the lifecycle
   and the restore.

## Tasks

- [x] `saveMachine` and `loadMachine` round-trip a started and an
      unstarted row, return `undefined` before the first save and
      survive reopening a file; a file without the `machine` table
      opens with its commands; `markInterrupted` marks only unfinished
      rows, as `YYYY-MM-DD HH:MM:SS`, and `commandState` shows
      `interrupted`. Check: `test/integration/queue.machine.spec.ts`.
- [x] A repeat of the key of an interrupted command gets `failed`;
      `onApplicationShutdown` closes the database only after a write
      three microtasks after a run's result (fails without the
      `setImmediate`). Check (changed, as [05](05-command-input.md) left
      the planned file at 231 lines):
      `test/integration/execa-manager.restart.spec.ts`.
- [x] `recover`: each rule and each kept status. Check:
      `test/unit/fsm.recovery.spec.ts`. A `StateMachine` built with a
      state and entry follows its transitions and numbers the next
      entry after it. Check: `test/unit/fsm.state-machine.spec.ts`.
- [x] `Parameters.restore` keeps fitting values and returns a removed
      parameter, another type and a removed enum value. Check:
      `test/unit/fsm.parameters.restore.spec.ts`.
- [x] `MachineStore`: a throwing save is logged, commands are marked
      with and without a definition, a row without one is logged and
      ignored, the recovered row is written back, and both warnings.
      Check: `test/unit/fsm.machine-store.spec.ts`.
- [x] `check()` after `restore()`; from `interrupted` a transition and
      an event move the machine; entries and `run` store the machine,
      and a throwing write leaves the reply `accepted`; a script that
      finishes during shutdown stores its status and does not complete.
      Check: `test/unit/fsm.service.restore.spec.ts`; the other
      `fsm.service*.spec.ts` pass unchanged.
- [x] Restart: killed (the row is `loop`, 1, `running`; after the rows
      are reset as a kill leaves them, a second runner reports
      `interrupted` on `GET /fsm`, `GET /` and `GET /state` and accepts
      a transition) and graceful (`stopped`, which also fails without
      the `setImmediate`). (changed) Each test has its own folder.
      Check: `test/e2e/restart.spec.ts`.
- [x] Documents and version. Check: `npx markdownlint-cli`.
- [x] `STATE-MACHINE.md` and the design document, with every diagram
      rendered. Check: `npx @mermaid-js/mermaid-cli@11` on both files
      and the rendered images; the replies of example 1 come from a
      runner, and those of example 2 from the demo's recording.
- [x] `yarn build`, `yarn test`, the `tsc` check, prettier, no file at
      250 lines, Qlty `check`, `smells` and `metrics`. Check: their
      output.

## Learnings

- The plan put the stop transition in `move`; [08](08-script-context.md)
  had added `follow` between them, and folding it in paid for the
  definition field and
  `restore`. A `Definition` import that pushed the line past 80
  characters would have cost five lines.
- [05](05-command-input.md) and 09 together bring `queue.service.ts` to
  245 lines, so the machine SQL went to `queue.machine.ts` at once; the
  `machine` table joins `SCHEMA` through a template, and the rebase onto
  [05](05-command-input.md) merged the file without a conflict.
- The rebase onto [05](05-command-input.md) conflicted in
  `fsm.service.ts` ([05](05-command-input.md)'s `raise` move against
  09's `logStay`), `execa-manager.service.ts`
  ([05](05-command-input.md) moved `OUTCOME` to `command-result.ts`,
  where the comment now goes), the `CommandStateStatus` union, the
  README and the decision table, whose columns
  [05](05-command-input.md)'s D27 had widened.
- The order at shutdown hangs on microtasks: the run of the manager
  settles a few microtasks before `FsmService.run` writes. Both the
  integration test and the graceful e2e test fail without the
  `setImmediate`.
- `logStay` gives a skipped completion transition the text of a
  refused event, so the name of the next state left the message.
- `test/e2e/mqtt.broker.spec.ts` runs only in CI; it asserts no shape
  that 09 changes, as `interrupted` needs a restart from a file.
- The sequence diagram of the design document parsed in mermaid 9, 10
  and 11; its error showed only in the drawing, where the entries after
  the first skipped `StateMachine.enter`. Rendering also caught
  `note below of`, which `stateDiagram-v2` refuses, and self-transition
  labels that overlap other edges, so self-transitions became notes.
- Not changed here: `docs/developer/codebase/runner.md` still says the
  database holds only commands; it is for a separate change.
