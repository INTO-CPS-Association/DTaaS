# 04 Declared Parameters With a Controllable Subset

## Spec

Requirement [R2][dtn-requirements]: a DT declares which of its shared-policy
parameters the Manager may change. The DT author declares them in the
state machine file; the Manager reads and sets them over the API; the
values reach scripts as environment variables
([08](08-script-context.md)) and appear in the state document
([02](02-state-document.md)).

### Declaration

```yaml
events:
  - restart
  - scope-changed
parameters:
  scope:
    type: enum
    values: [single, multi]
    default: single
    controllable: true
    event: scope-changed # optional; raised when the value changes
  capacity:
    type: number
    default: 20
    controllable: false
states:
  create:
    transitions:
      $success: execute
  execute:
    transitions:
      restart: create
      scope-changed: { state: execute, stop: true }
```

- Names follow the name pattern; `__proto__` is refused, as for states.
  `type` is `string`, `number`, `boolean` or `enum`; `enum` requires
  `values`, a non-empty list of strings, and its `default` must be one
  of them. `default` is required and must match the type: YAML reads
  `20` as a number, so a `string` parameter needs `'20'`; a `number` is
  finite (`.inf` and `.nan` are refused), and `"20"` is not coerced to
  a number.
- `controllable` defaults to `false`. Only controllable parameters can
  be set over the API; the others are read-only configuration the DT
  shares with the Manager.
- `event`, if present, must be in `events`.
- Two parameters whose environment variable names
  ([08](08-script-context.md)) collide, such as `a-b` and `a_b`, are a
  startup error.
- Parameters require a state machine file, as decided in the design
  summary (S4); a DT without one has none.

### Changing values

`PUT /parameters` applies a body in this order:

1. Validate the whole body; on any problem change nothing.
1. Store and apply every changed value, so a script that a following
   transition starts sees the new values ([08](08-script-context.md)).
1. Raise the declared events of the changed parameters, in declaration
   order, each against the state the previous one produced; an event
   that two changed parameters declare is raised once, so a
   self-transition with `stop: true` restarts its script once.

The reply does not depend on what the events do. An event the machine
refuses is logged: `no transition` (also before the first transition)
at debug level, `script running` and `stopping` as a warning, as
`complete()` does. The Manager reads the outcome from `GET /state`. A
value equal to the current one changes nothing and raises no event.

### API

- `GET /parameters` and `<base>/parameters`: `200` with the
  declarations and current values; without a state machine `404` with
  the body of `GET /fsm` in that case:
  `{ "status": "no state machine", "state": null }`.

  ```json
  {
    "scope": {
      "value": "multi",
      "type": "enum",
      "values": ["single", "multi"],
      "default": "single",
      "controllable": true
    },
    "capacity": {
      "value": 20,
      "type": "number",
      "default": 20,
      "controllable": false
    }
  }
  ```

- `PUT /parameters` and `<base>/set-parameters`: the body is a flat
  object of names to strings, numbers or booleans,
  `{ "scope": "multi" }`; the validation pipe checks that shape, and a
  body of another shape is `400 Validation Failed`. An unknown name, an
  uncontrollable parameter or a value of the wrong type is `400` with
  `message` listing every problem. `{}` is `200` and changes nothing.
  On success, `200` with the document of `GET /parameters`. The route is
  idempotent and takes no request key. Over MQTT the reply bodies are
  the same, including the `400` bodies.

Each change is recorded with an ISO timestamp, so
[09](09-persistence.md) can restore values and
[11](11-history-metrics.md) can report them.

### State document

After the rebase onto [02](02-state-document.md), `parameters` in the
state document becomes `{ "scope": "multi", "capacity": 20 }`: names to
current values only.

## Plan

1. Move `NAME` and `nameSchema` from `src/fsm/definition.ts` to a new
   `src/fsm/name.ts`, re-exported from `definition.ts`, so that
   `parameters.ts` and `definition.ts` can both import it without a
   module cycle.
1. Add `src/fsm/parameters.ts`:
   - the zod schema of the section, with one value schema per type,
     reused for `default` and for `PUT` values;
   - `parameterProblems(definition): string[]` for the cross-checks
     (`event` declared, `default` in `values`, no variable-name
     collision), called from `crossCheck` in `definition.ts`;
   - the variable name function (`DT_PARAM_` plus the upper-cased name
     with `.` and `-` turned into `_`);
   - a plain class `Parameters` holding the declarations and the
     current values, with `values()`, `document()`,
     `check(body): { problems: string[] } | { changes, events }`, which
     only validates, and `commit(changes)`.
1. In `definition.ts`, add the section to `fileSchema`, `Definition` and
   `toDefinition`, and `field(content, 'parameters')` to `hasProtoKey`.
   It gains about six lines; it is near 250, so nothing else goes there.
1. Add a `parameters` table to `src/queue.service.ts`
   (`id INTEGER PRIMARY KEY AUTOINCREMENT`, `name`, `value` as JSON text,
   `changed_at` as an ISO string), with `setParameter(name, value)` and
   `parameterValues()`, which takes the row with the highest `id` per
   name, since `CURRENT_TIMESTAMP` ties within a second.
1. In `src/fsm/fsm.service.ts`, build `Parameters` in `load()` and
   expose `parameters(): Parameters | undefined`; add
   `setParameters(body)`, which checks the body, stores the changes
   through `Queue` (a third constructor dependency), only then commits
   them in memory, so a failing database leaves both unchanged, and
   raises the events through `event()` without a request key.
   `test/unit/fsm.fixture.ts` passes a fake `Queue` with `setParameter`
   and `parameterValues`. The service is near 250 lines: move the
   `COMPLETION` and `STATUS` maps to `src/dto/fsm.dto.ts`, next to
   `ScriptStatus`. That was not enough, so `outcome()`, which turns a
   script that could not start into `failed`, moved to
   `src/fsm/script-outcome.ts` as well.
1. Add `src/dto/parameters.dto.ts` and `src/parameters.controller.ts`
   (`GET` and `PUT /parameters`, taking only `FsmService`; problems
   become `new BadRequestException(problems)`), and the `parameters`
   and `set-parameters` MQTT routes in `src/mqtt/mqtt.config.ts` and
   `src/mqtt/mqtt-request.handler.ts`, through `this.fsm`; the MQTT
   route returns the exception's `getResponse()` rather than a `500`.
   No constructor gains a parameter.
1. After rebasing onto [02](02-state-document.md):
   `DescriptorService.state()` sets
   `parameters: this.fsm.parameters()?.values() ?? {}`; one line, no
   constructor change. `Queue.setParameters(changes)` stores the
   changes of one request in a transaction, so a database failure part
   way leaves both the store and memory unchanged.
1. Update `test/data/scripts/state-machine.yaml`, `api/*.http`,
   `test/unit/mqtt.config.spec.ts` (route list), `README.md` (State
   Machine and API sections, with the YAML typing notes above),
   `DEVELOPER.md` (the README says that an event linked to a
   self-transition with `stop: true`, as in the example, is the DT
   author opting into a restart; the runner never restarts on its own),
   and the design document (the Validation section that
   says the file holds only `events` and `states`; new decisions for
   declaration placement and change effect, S6). In
   [08](08-script-context.md) and [09](09-persistence.md), replace
   `ParametersService` with `FsmService.parameters()`.

## Tasks

- [x] `nameSchema` lives in `src/fsm/name.ts` and the runner still
      starts. Check: `test/e2e/dist.spec.ts` after `yarn build`.
- [x] Schema accepts the example, and rejects a missing `default`, a
      `default` of the wrong type or outside `values`, `enum` without
      `values`, a non-finite number, an `event` not in `events`, a
      `__proto__` name, and two names with one variable name, each with
      a message. Check: `test/unit/fsm.parameters.spec.ts` (new; the
      definition spec is near 250 lines).
- [x] `Queue` stores changes and returns the latest value per name,
      also for two changes within a second. Check:
      `test/integration/queue.service.spec.ts`.
- [x] `Parameters.check` rejects a body with any bad entry without
      applying the good ones, lists every problem, and returns the
      changes and the events once each in declaration order. Check:
      `test/unit/fsm.parameters.spec.ts`.
- [x] `FsmService.setParameters` stores the values before raising the
      events, raises each declared event once, and logs a refused event
      without failing. Check: `test/unit/fsm.service.parameters.spec.ts`.
- [x] `GET` and `PUT /parameters` behave as specified, including `404`
      without a machine, `400` with every problem, and `{}`. Check:
      `test/e2e/parameters.spec.ts`.
- [x] MQTT routes return the same bodies, including `400`. Check:
      `test/unit/mqtt-request.parameters.spec.ts` (new; the handler
      spec is near 250 lines), `test/e2e/mqtt.spec.ts`.
- [x] After the rebase onto [02](02-state-document.md), `GET /state`
      shows the current values.
      Check: `test/e2e/parameters.spec.ts`,
      `test/unit/descriptor.service.spec.ts`.
- [x] README, `DEVELOPER.md`, design document, request files and the
      [08](08-script-context.md) and [09](09-persistence.md) plans
      updated. Check: from the repository root,
      `npx markdownlint-cli -c .markdownlint.yaml` on them.
- [x] `yarn build` and `yarn test` pass,
      `npx tsc --noEmit --noUnusedLocals` is clean, and no function
      crosses the Qlty thresholds. Check: their output; the Qlty
      thresholds were counted by hand, as the CLI runs in CI.

## Learnings

- `parameters.ts` and `definition.ts` importing each other made
  `nameSchema` a `const` in its temporal dead zone at startup;
  `src/fsm/name.ts` breaks the cycle.
- A plain `Parameters` class owned by `FsmService` instead of an
  injectable service kept every constructor under four parameters.
- `CURRENT_TIMESTAMP` ties within a second, so the latest value is the
  row with the highest id. A multi-value `PUT` stores in one
  transaction, so a database error leaves the store and memory as they
  were (found in review, not in the first implementation).
- prettier writes `{ state: x, stop: true }` and one space before an
  inline comment; yamllint wants neither. YAML test data uses block
  mappings and comments on their own line, or CI fails one of the two.
- `fsm.service.ts` reached 249 lines; `RecentReplies.resolve` and
  `Parameters.apply` made room for [03](03-state-notifications.md), and
  [06](06-escalation.md), [08](08-script-context.md) and
  [09](09-persistence.md) must each say what they move out before adding
  to it.

[dtn-requirements]: ../../../../../system/servers/execution/runner/DT-networks.md#requirements-on-a-managed-dt
