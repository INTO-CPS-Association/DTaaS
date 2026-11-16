# Runner Issues

Specifications, plans and task lists for the work that turns the runner
into a stateful manager of one digital twin (DT) that an external
Manager can observe and steer. The features come from
[DT Networks][dtn];
each file here is one feature, numbered by its item in DT Networks page so that
the two documents cross-reference by one number. Items 15 and 17 are split into
sub-issues with a letter suffix. Item 14 is deferred (see below) and has
no file.

## Status

| File                                                   | Feature                     | Size | Status    |
| :----------------------------------------------------- | :-------------------------- | :--- | :-------- |
| [01-dt-identity.md](01-dt-identity.md)                 | DT identity and descriptor  | S    | done      |
| [02-state-document.md](02-state-document.md)           | One state document          | M    | done      |
| [03-state-notifications.md](03-state-notifications.md) | State change notifications  | M    | done      |
| [04-parameters.md](04-parameters.md)                   | Declared parameters         | M    | done      |
| [05-command-input.md](05-command-input.md)             | Command input and outcome   | M    | done      |
| [06-escalation.md](06-escalation.md)                   | Escalation signal           | M    | done      |
| [07-presence.md](07-presence.md)                       | Presence: join and leave    | S    | done      |
| [08-script-context.md](08-script-context.md)           | Runner context for scripts  | S    | done      |
| [09-persistence.md](09-persistence.md)                 | Persist the machine         | M    | done      |
| [10-stop.md](10-stop.md)                               | Stop a running script       | M    | done      |
| [11-history-metrics.md](11-history-metrics.md)         | Richer history and metrics  | M    | done      |
| [12-health.md](12-health.md)                           | Health endpoint             | S    | done      |
| [13-peers.md](13-peers.md)                             | Peer list and relationships | M    | done      |
| [15a-access-control.md](15a-access-control.md)         | Access control by role      | M    | done      |
| [15b-signed-output.md](15b-signed-output.md)           | Signed notifications        | M    | done      |
| [16-peer-events.md](16-peer-events.md)                 | React to peer state         | L    | in review |
| [17a-script-resources.md](17a-script-resources.md)     | Script resource usage       | M    | done      |
| [17b-process-tree.md](17b-process-tree.md)             | Process tree usage          | M    | done      |
| [17c-fidelity.md](17c-fidelity.md)                     | Fidelity convention         | S    | done      |
| [18-script-user.md](18-script-user.md)                 | Scripts as a second account | L    | in review |

Sizes: S is a day or less, M a few days with tests and documentation, L
a week or more.

## Order

A feature starts when the features it depends on are merged.

```text
01 identity ─┬─> 02 state-document ─┬─> 03 notifications ─> 06 escalation
             ├─> 04 parameters ─────┼─> 05 command-input
             │                      └─> 08 script-context
             ├─> 07 presence
             └─> 10 stop ─> 09 persistence (after 06 and 08)

12 health
```

02 comes before 04 because the state document is where parameter values
are first exposed; 10 before 09 because an `interrupted` script needs
the stop path to exist before recovery is designed around it. 07 needs
03's notifier for its webhook, so in practice it follows 03.

The second round, planned on 2026-10-26, after all of the above:

```text
15a access-control ─┬─> 13 peers ─────────┬─> 16 peer-events
                    └─> 15b signed-output ─┘

11 history-metrics ─> 17a script-resources ─┬─> 17b process-tree
                                            └─> 17c fidelity
```

15a and 11 start together. 11 shows the principal name that 15a
stores with each command; whichever merges second adds the column. 13
needs 15a because `PUT /peers` is a Manager route, and 16 needs 15b so
that a peer's state documents can be verified. 17a extends the records
and metrics of 11.

## Delivery

- One branch per file, named `runner/NN-slug`, pushed to the
  `prasad-public` remote with a pull request against its
  `feature/distributed-demo` branch.
- The file's `Status` and ticked tasks change in the same pull
  request as the code. A task is ticked only after its check ran.
- Breaking changes to existing routes are allowed with a minor version
  bump of `package.json` and a line in the README; the runner is at
  `0.10.0` and nothing in this repository consumes its API.
- Each pull request sweeps `README.md`, `api/*.http`,
  `docs/state-machine-design.md` (amend the decision or assumption the
  feature changes) and `DEVELOPER.md`.
- No pull request changes files outside `servers/execution/runner`,
  other than by merging `feature/distributed-demo`. Documentation
  elsewhere that a feature makes stale, such as
  `docs/developer/codebase/runner.md` or the user documentation copy
  of the README, is listed in the pull request for a separate change.

## File Shape

Each file has these sections:

- **Spec**: the behaviour, configuration and API, with one example.
- **Plan**: ordered steps that name the files they touch.
- **Tasks**: a checkbox list; each task ends with its check, which is a
  named test file, a lint or build command, or a document section.
- **Learnings**: what the implementation taught that the plan did not
  foresee, written in the pull request that implements the issue.

`Status` is `planned`, `in progress`, `in review` (a pull request is
open) or `done`.

## Decisions Shared by All Features

| #   | Decision                                                                                                                                                                                                   |
| :-- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | The runner is a managed DT only. It never acts as the Manager of a network.                                                                                                                                |
| S2  | One runner serves one DT, as one process. A1 of the design document stands.                                                                                                                                |
| S3  | Outbound notifications go over MQTT, under `<base>/notify/<kind>`, and over an optional HTTP webhook. Polling always works.                                                                                |
| S4  | `runner.yaml` is the operator's file: identity, port, paths, broker, webhook. The state machine file is the DT author's: states, parameters, exposed commands, escalation, script environment.             |
| S5  | `runner.yaml` names the state machine file by path; the fixed name in `location` goes (amends D1).                                                                                                         |
| S6  | The runner never restarts a script on its own. A parameter change takes effect at the next script start, or through a declared event.                                                                      |
| S7  | Notification payloads share one envelope: `{ kind, id, time, data }`.                                                                                                                                      |
| S8  | A DT positively lists the peers it is willing to interact with, in `runner.yaml`. There is no discovery; a peer's base topic is its address. A Manager may enable and disable listed peers, never add one. |
| S9  | Callers are named principals with Ed25519 key pairs; `runner.yaml` holds public keys only. A request carries a short-lived JWS bound to that request; over MQTT the request payload is the JWS.            |
| S10 | Three roles: `client` (everything), `manager` (reads, parameters, peers, `manager.commands`), `script` (reads, events, escalation). No `peer` role. `GET /health` is always open.                          |
| S11 | Scripts authenticate with an opaque `RUNNER_TOKEN` minted per start; the runner creates both sides, so a key pair adds nothing there.                                                                      |
| S12 | With `auth.key`, the runner signs its notifications and MQTT responses as a JWS over the same JSON; HTTP replies are not signed.                                                                           |
| S13 | Peer subscriptions are global to the state machine file and edge-triggered: an event is raised when a `when` condition on a peer's `state` or `online` turns true, not on every document.                  |
| S14 | Metrics are counters in memory since the runner started, served as JSON, and never part of the state document; durable analysis is the Manager's, from the history and the notifications.                  |
| S15 | Verification and signing use `node:crypto`; `jose` is added only if the routine outgrows one file.                                                                                                         |

## Lessons for Every Issue

From implementing 01, 02, 03, 04, 10 and 12:

- Plans written before the code go stale. Before implementing, review
  the plan against the current code: names, line numbers, file sizes
  and constructor parameters all change as earlier issues merge.
- eslint in this project lints no `.ts` file: the flat config's
  `files: ['src/**', 'test/**']` never matches a non-JavaScript file, so
  `yarn syntax` passes whatever the code. Until that is fixed, run
  `npx tsc --noEmit --noUnusedLocals --noUnusedParameters` and rely on
  SonarCloud and Qlty in CI.
- Qlty fails a function at complexity 5, at 4 parameters and at 4
  returns, constructors included. Most redesigns in review came from
  the constructor limit: prefer a plain class or signal owned by an
  existing service to a new injectable that every caller must receive.
- `fsm.service.ts`, `definition.ts` and several test files sit near the
  250-line limit; each plan names what it moves out before it adds.
- SonarCloud checks new test code too: an `async` arrow without
  `await`, `await` inside a loop, a test without a Jest `expect`
  (supertest's `.expect()` does not count), and bracket access to a
  private member are all findings. Code moved into a new file counts as
  new.
- prettier and yamllint disagree on flow mappings and inline comments;
  write YAML with block mappings and comments on their own line.
- On Windows the full suite runs PowerShell scripts in parallel and
  times out under load. `yarn test --maxWorkers=2` is reliable locally;
  Linux CI is the authority.
- `test/e2e/dist.spec.ts` starts the built runner; ts-jest hides a
  relative import without its `.js` suffix, which breaks the build.
- Jest runs test files that do not type-check (seen in 06), so the
  `tsc` check above is the only gate for type errors in tests too.
- Before merging, read every CI conclusion and the Qlty status's
  blocking count, not only the checks that pass; a PR retargeted after
  its first push needs a new run (close and reopen) so Qlty compares
  against the right base.
- Rebase by squashing a branch's code commits first and resolving once
  against the final shape; decision numbers in the design document and
  rows of the status table are the usual conflicts.
- Qlty Cloud's dotenv-linter takes any file whose name contains `.env`
  (`fsm.env.spec.ts`, `x.environment.spec.ts`) for a dotenv file and
  rewrites it, prettier then fails, and the `qlty check` status reports
  "Build errored". Name such files `*-env.spec.ts`. The `Qlty` workflow
  runs only actionlint and osv-scanner, so it does not catch this;
  `qlty check --upstream <base>` locally does.
- `test/e2e/mqtt.broker.spec.ts` runs only in CI, against Mosquitto,
  so a change to a reply, status or stored shape passes locally and
  fails there (05's first run); grep it for the old shapes.
- On Windows, `yarn test -t` with a pattern of two words breaks the
  command line before Jest sees it; use a one-word pattern.
- Render every Mermaid diagram with mermaid-cli and look at the image:
  a diagram that parses can still be wrong, and some syntax, such as
  `note below of` in a state diagram, fails only when rendered.

From implementing 15a:

- Git Bash rewrites an argument that starts with `/` into a Windows
  path before a native program such as `node` sees it, so `/dt` becomes
  `C:/Program Files/Git/dt`. Set `MSYS_NO_PATHCONV=1` on a call that
  passes a URL path.
- `record.mjs` of the demo rewrites its two casts,
  `demo-<platform>-manager.cast` and `demo-<platform>-network.cast`;
  restore them with `git checkout` unless the issue re-captures the
  recording.
- `node:crypto` takes any 32 bytes as an Ed25519 public key; only a
  verification shows that a key is no point of the curve.

From implementing 13:

- Nest builds every provider before it runs any `onModuleInit`, so a
  listener that an injectable registers in its constructor hears what
  another provider signals in its `onModuleInit`, whatever the order of
  the hooks.
- `test/e2e/mqtt.util.ts` runs two runners in one process against one
  aedes broker, each with its own spied `getId` and base topic, which
  tests one runner following another without Mosquitto.

From implementing 15b:

- eslint lints the `.ts` files since `a82e10a3`, so the lesson above
  that it lints none is stale: `yarn syntax` catches errors in them.
- A row of a Markdown table that is wider than its column makes
  prettier re-pad every row; keep a new decision within the widths of
  the table, or the rows of parallel issues conflict.

## Deferred

From [DT Networks][dtn], with the decision that blocks each:

- **14 Machine-readable API description**: skipped by the owner on
  2026-10-26. The API is documented in prose in `api/API.md`; whether
  to generate OpenAPI from the controllers or write it by hand stays
  open until a consumer needs the document.

Items 11, 13, 15, 16 and 17 left this list on 2026-10-26, when the
decisions that blocked them were taken (S8 to S15).

## Non-Goals

Out of scope for every file here, with what could reopen each:

Item and question numbers refer to DT Networks.

- More than one DT per runner (S2).
- The runner as Manager, or any runner-side policy evaluation such as
  the local goal `γ_i` (open question 2).
- Forecasts and exogenous triggers, which are the Manager's.
- Server-sent events as a push transport (item 3); the webhook of 03
  covers HTTP.
- A stdout line protocol for scripts to raise events (item 8, open
  question 6); scripts use the HTTP API.
- A script that mirrors physical-twin state into the state document
  (item 2).
- A declared `recover` state after a restart (open question 5).
- Per-command input schemas (item 5, open question 4).
- Discovery of peers by wildcard subscription (S8).
- A `peer` role, mutual TLS, or signed HTTP replies (S10, S12).
- Prometheus text format for the metrics (S14).
- Showing DTN state in the DTaaS client or library.

[dtn]: ../../../../../system/servers/execution/runner/DT-networks.md
