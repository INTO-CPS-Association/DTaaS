# 02 One State Document

## Spec

Requirement [R1][dtn-requirements] asks each DT to make its state observable to the
Manager in one place. Today the machine's state is on `GET /fsm` and
the last command on `GET /`. This feature adds a document that joins
them, which 03 publishes on every change.

### API

`GET /state` and the MQTT route `<base>/state` answer `200` always,
machine or not:

```json
{
  "id": "hospital-1",
  "time": "2026-10-25T10:00:00.000Z",
  "machine": {
    "state": "execute",
    "status": "running",
    "entry": 3,
    "events": ["restart"]
  },
  "parameters": {},
  "command": {
    "name": "execute",
    "status": "running",
    "receivedAt": "2026-10-25T09:59:58.000Z",
    "finishedAt": null
  }
}
```

- `machine` is `null` when no state machine is loaded; otherwise it is
  the body of `GET /fsm`, which gains `entry`, the entry counter of
  `StateMachine`, so a Manager can tell two entries into the same state
  apart. `state` is `null` and `entry` `0` before the first transition.
  The document reuses `FsmStateDto` rather than copying its fields, and
  `machine.status` is its `ScriptStatus`, so `stopped` (10) and later
  `interrupted` (09) flow through with one change in `fsm.dto.ts`.
- `parameters` maps names to values (`string`, `number` or `boolean`).
  It is `{}` until 04 fills it; the key and its type exist from the
  start so the shape does not change.
- `command` is the most recent command, or `null` before the first.
  `ExecaManager` runs commands by name side by side (A7), so it may be a
  finished manual `POST /` while the machine's script runs; a Manager
  reads the machine's script from `machine.status`. `command.status` is
  `running` while the command has not finished, else the stored
  status: `valid`, `invalid` or `stopped` (`interrupted` arrives with
  09). `finishedAt` is `null` while it runs. Logs stay on `GET /`: the
  document is published on every change and script output can be
  large.
- `receivedAt` and `finishedAt` are ISO 8601 UTC. The database keeps
  SQLite's `YYYY-MM-DD HH:MM:SS`; the runner converts on read, so
  existing database files need no migration.
- `time` is when the document was built, ISO 8601 UTC. 03's envelope
  repeats it; `GET /state` has no envelope, so the document carries it.

`GET /` and `GET /history` stay as they are.

## Plan

1. In `src/queue.service.ts`, select the two timestamps in the `RECORD`
   query as ISO strings with
   `strftime('%Y-%m-%dT%H:%M:%SZ', received_at)` (and the same for
   `finished_at`; `strftime` of `NULL` is `NULL`, so no `CASE` is
   needed), and add `receivedAt` and `finishedAt` to `CommandRecord`
   (`src/interfaces/command.interface.ts`) and `toRecord`. The schema,
   `complete` and the `finished` column, which `ExecaManager.repeat`
   reads, are unchanged.
1. Add `entry` to `FsmStateDto` and `FsmService.check`
   (`src/dto/fsm.dto.ts`, `src/fsm/fsm.service.ts`). Update the tests
   that assert the whole `GET /fsm` body
   (`test/unit/fsm.service.spec.ts`, `test/e2e/fsm.spec.ts`,
   `test/unit/mqtt-request.handler.spec.ts`) and the README's `GET /fsm`
   example.
1. Add `src/dto/state.dto.ts` with `StateDocumentDto`, a
   `CommandState` type for `command`, and the status union
   (`running | valid | invalid | stopped`), so 09 adds one member.
1. Build the document in `DescriptorService` (`src/descriptor.service.ts`),
   which gains `Queue` as its third constructor parameter and a
   `state(): StateDocumentDto` next to `describe()`, reading
   `Queue.activeCommand()` directly. Neither `AppController` nor
   `MqttRequestHandler` gains a constructor parameter: both already hold
   the descriptor service. 03 consumes `state()`.
1. Add `GET /state` to `src/app.controller.ts` and the `state` route to
   `src/mqtt/mqtt.config.ts` and `src/mqtt/mqtt-request.handler.ts`.
1. Update `api/dev.api.http`, `api/dev.mqtt.http`, `README.md` (API and
   MQTT API, and the `GET /fsm` example) and the Components table of
   `docs/state-machine-design.md`.
   List `docs/developer/codebase/runner.md` in the PR for a separate
   change.

## Tasks

- [x] `Queue.activeCommand` returns ISO `receivedAt` and `finishedAt`,
      with `finishedAt` null while running, for rows written in SQLite's
      own format. Check: `test/integration/queue.service.spec.ts`, with
      `expect.any(String)` and an ISO pattern instead of fixed times.
- [x] `FsmService.check` returns `entry`, 0 before the first
      transition. Check: `test/unit/fsm.service.spec.ts`.
- [x] The document has `machine: null` without a machine,
      `command: null` before the first command, `running` for an
      unfinished command, the stored status otherwise, and `time` from
      the clock. Check: a new `test/unit/descriptor.service.spec.ts`
      against fakes, with `jest.useFakeTimers({ now })` for `time`; it
      also covers `describe()`, which only e2e tests reach today.
- [x] `GET /state` answers 200 with and without a machine, and shows a
      running command while the `loop` test script runs. Check:
      `test/e2e/state.spec.ts`.
- [x] The `state` MQTT route returns the same body. Check:
      `test/unit/mqtt-request.handler.spec.ts`, `test/e2e/mqtt.spec.ts`.
- [x] README, request files and the design document's Components table
      show the route. Check: from the repository root,
      `npx markdownlint-cli -c .markdownlint.yaml` on them.
- [x] `yarn build` and `yarn test` pass,
      `npx tsc --noEmit --noUnusedLocals` is clean (eslint lints no
      `.ts` file here), and no function crosses the Qlty thresholds.
      Check: their output.

## Learnings

- `CREATE TABLE IF NOT EXISTS` never changes an existing database file,
  so new fields come from converting on read (`strftime` in the query)
  or from a guarded `ALTER TABLE` (as 05 will need for its new columns),
  never from a new column default.
- `strftime('%Y-%m-%dT%H:%M:%fZ', …)` gives the same shape as
  `toISOString()`, milliseconds included, for rows SQLite wrote with
  second resolution.
- The `commands` row says `invalid` until a command finishes (the column
  default), so `running` is derived from `finished_at`; `GET /` still
  shows `invalid` while a command runs.
- Building the document in `DescriptorService`, which the controller and
  the MQTT handler already hold, kept every constructor under Qlty's
  limit of four parameters.

[dtn-requirements]: ../../../../../system/servers/execution/runner/DT-networks.md#requirements-on-a-managed-dt
