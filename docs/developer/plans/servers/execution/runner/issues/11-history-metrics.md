# 11 Richer History and Metrics

## Spec

A DT network such as the hospital example of the
[Concepts][dtn-concepts] is judged by fallback occurrences, patient
distribution, travel distance and a placement score over time. A
Manager computes such measures from the outcomes of DT commands with
their times. The `commands` table already stores the status, exit code
and both times (`src/queue.service.ts:23-33`), but `GET /history`
returns names only (`src/queue.service.ts:177-182`). Nor can a Manager
see what the state machine did since the runner started without
following every notification.

### History

`GET /history` (MQTT `history`) returns full records, oldest first:

| Field        | Value                                                                                    |
| :----------- | :--------------------------------------------------------------------------------------- |
| `id`         | the row id, which grows with each request                                                |
| `name`       | the command                                                                              |
| `status`     | `running` while unfinished, then as `GET /state` reports it                              |
| `exitCode`   | as `GET /`; `null` while running                                                         |
| `receivedAt` | ISO 8601, to the second, as in the Conventions                                           |
| `finishedAt` | the same, `null` while running                                                           |
| `by`         | the principal of the request ([15a](15a-access-control.md)): a name, `script`, or `null` |

No logs (they stay on `GET /`) and no input (D27). The duration that item 11 of
[DT Networks][dtn] lists is left out: it is `finishedAt - receivedAt` (this plan's
call). Three of the ten records of API.md's "Example Session", with
times of the re-run that API.md's Notifications show (illustrative, as
the recording printed names only); the demo has no authentication, so
`by` is `null`:

```json
[
  {
    "id": 2,
    "name": "admit",
    "status": "valid",
    "exitCode": 0,
    "receivedAt": "2026-10-26T14:55:51.000Z",
    "finishedAt": "2026-10-26T14:55:52.000Z",
    "by": null
  },
  {
    "id": 4,
    "name": "admit",
    "status": "failed",
    "exitCode": 3,
    "receivedAt": "2026-10-26T14:55:59.000Z",
    "finishedAt": "2026-10-26T14:56:00.000Z",
    "by": null
  },
  {
    "id": 10,
    "name": "open",
    "status": "running",
    "exitCode": null,
    "receivedAt": "2026-10-26T14:56:17.000Z",
    "finishedAt": null,
    "by": null
  }
]
```

Query parameters, both optional; over MQTT the same as an optional
payload object `{ "since": ..., "limit": ... }`:

- `since`: ISO 8601 with `Z` or an offset; the records with
  `receivedAt >= since`. Times are stored to the second, so `since` is
  compared to the second too (this plan's call): the records of that
  second come again, and a Manager that polls with the last
  `receivedAt` it holds drops repeats by `id`.
- `limit`: a positive integer, default `100`, at most `1000` (this
  plan's call); the newest `limit` records of the selection, still
  oldest first.

`GET /history?since=2026-10-26T14:56:00Z&limit=2` returns records 9
(`discharge`) and 10 (`open`). A value that fails, such as `limit=0`,
`limit=1001`, `limit=1.5`, a `since` that is not ISO 8601, a parameter
given twice, or an MQTT payload that is not a JSON object, gets the
validation error of the Conventions. Unknown parameters are ignored, as
unknown fields of other bodies are.

### Metrics

`GET /metrics` (MQTT `metrics`) answers JSON with counters since the
runner started. At 2:51 of the Example Session (the `GET /history`
step; values worked out from the session, times of the re-run):

```json
{
  "since": "2026-10-26T14:55:41.402Z",
  "uptime": 42,
  "commands": {
    "valid": 6,
    "failed": 2,
    "stopped": 1,
    "invalid": 0,
    "interrupted": 0,
    "running": 1
  },
  "machine": {
    "entries": { "open": 3, "full": 1 },
    "seconds": { "open": 34.4, "full": 4.6 },
    "completions": { "$success": 0, "$failure": 1, "$stopped": 0 },
    "transitions": { "requested": 1, "accepted": 1 },
    "events": { "requested": 5, "accepted": 3, "noTransition": 2 }
  },
  "escalations": { "request": 1, "failure": 1, "no-transition": 1 }
}
```

- `since` is the process start (`performance.timeOrigin`); `uptime` is
  whole seconds, as on `GET /health`.
- `commands` counts the rows received since the start by status, with
  `running` for unfinished ones; `interrupted` counts the rows that this
  start marked ([09](09-persistence.md)). Every key is always present.
- `machine` is `null` without a state machine. `entries` and `seconds`
  have a key for each state entered since the start, and for the state
  a restored machine starts in, which counts from `since` without an
  entry (this plan's call). `seconds` counts the current state up to
  the request, rounded to milliseconds.
- `completions` counts scripts of the current entry that finished:
  open #1 and #2 were left before their scripts ended, so their ends
  raised nothing and count nothing.
- `transitions` and `events` count the requests that reached the
  machine: a repeated request key that gets its stored reply is not
  counted again. `events` includes the events that a parameter change
  raises (`scope-changed` above); `accepted` is this plan's addition.
- `escalations` is top level, not under `machine`, as `POST /escalate`
  needs no state machine (D25; this plan's call).

The counters live in memory: a restart resets them, which `since`
shows. Durable analysis over time is the Manager's business, from the
history and the notifications, so there are no new tables. Metrics stay
out of the state document and its notifications; a counter change
publishes nothing.

### Version

Both changes alter replies, so the runner goes to `0.10.0`
([15a](15a-access-control.md) took `0.9.0`), with a README line, per
the delivery rules.

### Considered and Set Aside

- Prometheus text format: nothing scrapes the runner, and JSON gives
  HTTP and MQTT one shape. Add a text variant when a scraper appears.
- Notifications published by kind: the Manager receives them and can
  count them itself; the `Notifier` would need a hook.
- In-memory command counters: a query of the table gives `running`
  exactly, with no bookkeeping beside the database.
- An upper bound (`until`) for paging: polling with `since` serves the
  Manager; add it when a client needs older pages.

## Plan

1. `by` column: if [15a](15a-access-control.md) is merged, use its
   column. Otherwise add it with [15a](15a-access-control.md)'s
   migration: `addExitCode` (`src/queue.service.ts:68-74`) becomes
   `addColumn(db, column, type)`, called for `exit_code` and `by TEXT`;
   `by` stays `NULL` until [15a](15a-access-control.md) fills it.
1. Make room in `src/queue.service.ts` (245 lines), behaviour
   unchanged: `RECORD`, `RECORD_BY_KEY` and `toRecord` (lines 49-58,
   76-93) move to a new `src/queue.history.ts`, like
   `src/queue.machine.ts`.
1. `src/dto/history.dto.ts`: `HistoryEntryDto` (the fields above;
   [17a](17a-script-resources.md) adds CPU seconds and peak memory to
   it, so it is extended, not replaced), and `historyQuerySchema`:
   `since` as
   `z.iso.datetime({ offset: true }).optional()`, `limit` as
   `z.coerce.number().int().min(1).max(1000).default(100)`, the object
   with `.prefault({})` (zod 4's `.default` would skip the inner
   default).
1. `src/queue.history.ts` gains `HISTORY`, one statement without
   branches: the newest `?` rows with
   `received_at >= COALESCE(datetime(?), '')`, ordered by `id` again
   outside, with `CASE WHEN finished_at IS NULL THEN 'running'` as in
   `commandState` (`src/dto/state.dto.ts:155-167`); `COMMAND_COUNTS`
   (rows with `id > ?`, grouped by that status); and the row mappers.
1. `Queue`: `history(query)` replaces `checkHistory`; `markInterrupted`
   (`src/queue.service.ts:242-244`) also keeps the highest `id` and the
   number of rows it marked (`run().changes`); `commandCounts()` returns
   all six keys. `ExecaManager.checkHistory`
   (`src/execa-manager.service.ts:213-215`) and the `Manager` interface
   (`src/interfaces/command.interface.ts:75`) take the query and return
   `HistoryEntryDto[]`.
1. `src/app.controller.ts:54-57`: `@Query(new ZodValidationPipe(...))`
   with the existing pipe (`src/validation.pipe.ts:115-126`).
   `src/mqtt/mqtt-request.handler.ts:199`: `history` through `whenValid`
   with the same schema; empty payload gives the defaults.
1. Make room in `src/fsm/fsm.service.ts` (248 lines): `Requests` takes
   the logger in its constructor, and `raise` becomes
   `raiseAll(events, move)`, so the loop of `setParameters` (lines
   142-148) shrinks from seven lines to three.
1. `src/fsm/requests.ts`: an `AnswerListener` signal,
   `(request: string, reply: FsmReplyDto) => void`, emitted from the
   `compute` of `reply` (lines 205-216) and from `raiseAll`; the kind
   is the first word of `request` (`transition` or `event`). A repeat
   with a stored reply runs no `compute`, so it is not signalled.
   `FsmService.onAnswer` passes a listener on, next to `onChange` and
   `onEscalation` (lines 108-114); the service ends at 248 lines or
   fewer, with no new call in `enter`, `run` or `complete`.
1. `src/fsm/metrics.ts`: a plain `Metrics` class, fed by signals that
   exist. `start(machine, time)` sets the baseline;
   `observe(machine, now)`, on each `FsmService.onChange`, counts a new
   `entry` (closing
   the time of the state left) or a status leaving `running` within
   the same entry (`valid`, `invalid`, `stopped` as `$success`,
   `$failure`, `$stopped`). The entry time, which `StateMachine` does
   not keep, is a field here. `answered(request, reply)` counts
   requests, `accepted` and `no transition`; `escalated(data)` counts
   by `trigger` (`src/fsm/escalation.ts:172-184`); `report(now)` builds
   the reply. Each method stays under complexity 5.
1. `src/dto/metrics.dto.ts`: `MetricsDto` and the reply's parts.
1. `src/descriptor.service.ts` owns a `Metrics` (no constructor gains a
   parameter, so the MQTT handler reaches it through `descriptor`). It
   implements `OnModuleInit`, which `listen` runs after `restore()`,
   as for the `Notifier` ([09](09-persistence.md)): it subscribes to
   `fsm.onChange`, `fsm.onAnswer` and `fsm.onEscalation` and starts the
   baseline from
   `fsm.check()` at `since`. `metrics()` adds `since`, `uptime` and
   `queue.commandCounts()`, and `machine: null` without a machine.
1. Routes: `@Get('metrics')` in `src/app.controller.ts`; `metrics` in
   `mqttRoutes` (`src/mqtt/mqtt.config.ts:75-89`) and in the handler.
1. Tests to the new history shape: the `checkHistory` and
   `GET /history` assertions of `test/integration/*.spec.ts`,
   `test/e2e/{fsm,fsm.stop,mqtt,options,parameters,script-context}`
   `.spec.ts`, `test/unit/mqtt.fixture.ts`,
   `test/unit/mqtt-request.handler.spec.ts` and
   `test/e2e/mqtt.broker.spec.ts:162,192` (CI only), mapping records to
   names where only the names matter.
   `test/integration/queue.service.spec.ts` is at 249 lines, so new
   queue tests go to a new file.

## Tasks

- [x] Room made in `queue.service.ts` and `fsm.service.ts` with no
      change of behaviour. Check: the existing suite passes, and
      `wc -l` shows both under 250.
- [x] `by` column (unless [15a](15a-access-control.md) added it) on a
      new and an old file;
      `history` returns every field, `running` while unfinished,
      `since` with `Z` and an offset at the second, `limit` newest yet
      oldest first; `commandCounts` above the watermark and the marked
      rows. Check: `test/integration/queue.history.spec.ts`.
- [x] `historyQuerySchema`: defaults, a coerced string, and each
      refused value above. Check: `test/unit/history.dto.spec.ts`.
- [x] `Requests` signals computed replies and raised events, not a
      repeat. Check: `test/unit/fsm.service.requests.spec.ts`.
- [x] `Metrics`: entries, seconds with a fixed clock, a restored
      baseline, each completion, a stale completion not counted,
      answers and escalations. Check: `test/unit/fsm.metrics.spec.ts`.
- [x] `DescriptorService.metrics` with and without a machine, and its
      subscriptions. Check: `test/unit/descriptor.metrics.spec.ts`.
- [x] `GET /history` with and without parameters, and `400` for bad
      ones; `GET /metrics` after a transition, an event without a
      transition and a command. Check: `test/e2e/history.spec.ts`,
      `test/e2e/metrics.spec.ts`.
- [x] MQTT `history` with a payload and `metrics`; the subscription
      list. Check: `test/unit/mqtt-request.handler.spec.ts`,
      `test/unit/mqtt.service.spec.ts`.
- [x] The existing tests on the new shape, including CI's
      `test/e2e/mqtt.broker.spec.ts`. Check: `yarn test` locally, and
      the CI run for the broker test.
- [x] Documents: `README.md` (Command History, the route table, GET
      `/history`, a `/metrics` section, the MQTT table, a 0.10.0 line),
      `api/API.md` (Routes, Request Topics, `GET /history`, a
      `GET /metrics` section, Version), `api/dev.api.http`,
      `api/dev.mqtt.http`, `STATE-MACHINE.md:448`, `DOCKER.md:98`,
      `DEVELOPER.md` if a command changes, and a decision in
      `docs/state-machine-design.md`, the next free D number when the
      PR is opened; `package.json` to `0.10.0`; the index row. Check:
      `npx markdownlint-cli -c .markdownlint.yaml` from the repository
      root, and `npx prettier --check` on the changed files.
- [x] `yarn syntax`, `yarn build`, `yarn test --maxWorkers=2` and
      `npx tsc --noEmit --noUnusedLocals --noUnusedParameters` pass, no
      file at 250 lines, no function over the Qlty thresholds. Check:
      their output.

## Learnings

- **Drift.** [15a](15a-access-control.md) merged first, so step 1 fell
  away: `HISTORY` reads its `by` column, and no migration was added.
  `queue.service.ts` had 211 lines, not 245, and went to 182 when the
  record SQL moved out,
  204 at the end; `fsm.service.ts` went from 248 to 244 and is back at
  248 with `onAnswer`. [15a](15a-access-control.md) took `0.9.0`, so
  this issue bumps to `0.10.0`.
- **SQLite's `datetime()` does the parsing of `since`.** It turns `Z`,
  an offset and a fraction of a second into the stored
  `YYYY-MM-DD HH:MM:SS` in UTC, so one statement compares to the second
  without code in TypeScript. The plan's
  `COALESCE(datetime(?), '')` failed open: a `since` that `datetime()`
  turned into `NULL` would have returned every row. Review replaced it
  with `:since IS NULL OR received_at >= datetime(:since)`, so such a
  time matches no row; the schema refuses it before that anyway.
- **The watermark is a separate query.** `run().changes` gives the
  number of rows `markInterrupted` marked, not the highest `id`, so
  `LAST_ID` reads it after the update. `markInterrupted` runs once, at
  the start, which makes it the natural place for the baseline of
  `commandCounts`.
- **A parameter given twice** arrives from Express as an array, which
  `z.coerce.number()` and `z.iso.datetime()` refuse, so the plan's
  "given twice" needed no code; unknown parameters pass because the
  object schema strips them.
- **Signed requests and query strings.** The `htu` claim of
  [15a](15a-access-control.md) is compared to the path without the
  query, so a JWS for `GET /history` also authorizes
  `GET /history?limit=1`; `test/e2e/auth.spec.ts`
  shows it, with `by` set to the manager's name.
- **Times of the metrics** use `performance.timeOrigin +
performance.now()`, a monotonic clock, so a change of the wall clock
  does not make `seconds` negative; `uptime` comes from
  `process.uptime()`, as on `GET /health`.
- **Room in the tests.** The queue history tests went from
  `test/integration/queue.service.spec.ts` to
  `test/integration/queue.history.spec.ts`, and the expected machine of
  `test/e2e/metrics.spec.ts` to a constant, to keep both files and the
  test under the limits.
- **Review of #91** also asked for an explicit request kind:
  `AnswerListener` receives `{ kind, name }`, set by
  `Requests.transition`, `Requests.event` and `raiseAll`, rather than a
  label that `Metrics` parsed by its prefix. `COMPLETION_OF_STATUS` in
  `dto/fsm.dto.ts` derives the completion of a status from `STATUS`
  and `COMPLETION`. The documents now tell that the `+` of an offset is
  `%2B` in a URL, and that a stop transition counts no `$stopped`, as
  it leaves the entry before the stopped script ends.
- **For [17a](17a-script-resources.md).** `HistoryEntryDto` and
  `toHistoryEntry` take the CPU seconds and peak memory as two more
  fields, and `HISTORY` two more columns; `Metrics.report` is where
  totals per state would go.

[dtn-concepts]: ../../../../../system/servers/execution/runner/DT-networks.md#concepts
[dtn]: ../../../../../system/servers/execution/runner/DT-networks.md
