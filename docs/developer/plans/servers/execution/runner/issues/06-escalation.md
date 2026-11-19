# 06 Escalation Signal

## Spec

Requirement [R3][dtn-requirements]: a DT signals the Manager when its local adaptation
space is exhausted or it wants a shared-policy parameter changed. Without
this signal, a Manager can only infer escalation from the observed
state. The runner cannot
judge what "exhausted" means for a DT, so the DT author declares which
observable conditions count, and scripts can escalate explicitly.

### Declaration

```yaml
escalation:
  onFailure: true # a $failure the state has no transition for
  onNoTransition: true # a client event the state has no transition for
```

The section is optional and both flags default to `false`; without it,
only explicit requests escalate. It is a strict object of booleans, so
an unknown key, `__proto__` included, or a non-boolean value is a
startup error.

### Automatic triggers

- `failure`, with `onFailure`: the script of the current state ends
  `failed` and the state has no `$failure` transition. A `$failure`
  whose transition exists but is refused (`script running`) has a
  transition, is logged as today, and does not escalate. `$stopped`
  ([10](10-stop.md)) and `$success` never escalate. Each entry completes
  once, so `failure` needs no deduplication.
- `no-transition`, with `onNoTransition`: a client event, over
  `POST /fsm/event` or the `event` MQTT route, gets `no transition`
  in a started machine. It escalates at most once per entry and event,
  so a client that repeats an event does not flood the Manager; the
  record resets when the machine enters a state. Nothing escalates
  before the first transition (state `null`), for an `invalid event`,
  for a request refused as `stopping`, or for an event that a
  parameter change raises ([04](04-parameters.md)). The reply stays
  `409 no transition`.

### Explicit request

`POST /escalate` and `<base>/escalate`:

```json
{ "reason": "capacity", "proposal": { "scope": "multi" } }
```

- `reason` is a required, non-empty string. `proposal` is an optional
  JSON object, by convention the parameter values the DT would like
  (the \(\theta'\) of the DT's proposal); the runner forwards it as
  received and does not interpret it. Each value is measured as
  `Buffer.byteLength(JSON.stringify(value), 'utf8')`, the rule of
  [05](05-command-input.md): `reason` up to 1 KiB (1024 bytes),
  `proposal` up to 4 KiB. Any other body is `400 Validation Failed`;
  over MQTT, the same body.
- Reply `202 { "status": "accepted" }`, with or without a state
  machine, so a plain DT can escalate too. Without a machine, or before
  its first transition, the notification has `state: null, entry: 0`.
- An optional `Idempotency-Key` (MQTT 5: `idempotency-key`) is kept in
  a `RecentReplies` of its own, apart from the keys of the `fsm`
  routes (D13). Every escalation is the same request, `'escalate'`,
  and every reply is kept, so a repeated key gets the stored reply and
  escalates nothing, even with a different body; no reply is
  `invalid request key`, and there is no new `400` variant.

### Notification

Sent through the notifier of [03](03-state-notifications.md) as
`kind: "escalation"` on `<base>/notify/escalation`, QoS 1, not retained,
and to the webhook.
`data` holds `trigger` (`failure`, `no-transition` or `request`),
`state` and `entry` of the machine when the trigger fired, `event`
(the client event of `no-transition`, else `null`), `reason` (the
request's, or the runner's text such as
`no transition for restart in state execute`) and `proposal` (the
request's, else `null`). The README has a full example. Once shutdown
has begun the notifier sends nothing; a request is still answered
`202`.

## Plan

1. Move the `replies` field and the private `request` and `reply` of
   `src/fsm/fsm.service.ts` to a plain class `Requests` in
   `src/fsm/requests.ts`, built with a getter of `{ machine, stopping }`:
   `reply(request, requestKey, handle)` replays a repeated key, and
   `answer(handle)` gives `no state machine`, `stopping` or the
   handler's reply. Split the handler of `event` into a private
   `move(machine, event)`. The behaviour does not change.
1. Add `src/dto/escalation.dto.ts`: `escalateSchema`, whose `proposal`
   is a refinement on `z.unknown()` for an object that is not an array
   (`z.record` drops a `__proto__` key silently), a `fits(limit)`
   helper for the byte rule ([05](05-command-input.md) has the same
   rule; once both are merged, one copy stays), `EscalateBody`,
   `EscalateReplyDto` and `EscalationData`.
1. Add `src/fsm/escalation.ts`: `escalationSchema` (strict, with
   `.prefault({})`), `Escalation`, `EscalationListener`, and a plain
   class `Escalations` with `on`, `declare(flags)` (called from
   `FsmService.load()`, which may run after `app.init()`, so one object
   keeps the notifier's listener), `failure(machine)`,
   `noTransition(machine, event)` (a `firstTime` helper owns the record
   per entry) and `request(body, requestKey, machine)` (resolves
   `'escalate'` in its own `RecentReplies`, keeping every reply).
1. Add the section to `fileSchema`, `Definition` and `toDefinition` of
   `src/fsm/definition.ts`.
1. In `FsmService`, without a new constructor parameter: an
   `escalations` field declared in `load()`, `onEscalation`,
   `escalate`; `event()` calls `noTransition` on `no transition`;
   `raise` answers through `move`, so a parameter's event never
   escalates; `complete()` calls `failure` for a `$failure` without a
   transition.
1. `DescriptorService.onEscalation` forwards to `FsmService`, and
   `Notifier.onModuleInit` sends each escalation. Add `POST /escalate`
   to `AppController` (202, zod pipe, `validRequestKey`) and the
   `escalate` route to `mqttRoutes` and the MQTT request handler.
1. Move `startBroker` and `stopBroker` to `test/e2e/mqtt.util.ts` and
   the `Webhook` server to `test/e2e/webhook.util.ts`. The end-to-end
   test spies on `Config.prototype.getMqtt` and `getNotify`, starts a
   `digitalTwin` folder with `startRunner` of `test/e2e/util.ts`, then
   starts `MqttService`, so MQTT, the webhook and the state machine run
   in one runner. Retention is checked on the broker (aedes's retained
   stream), as `lateSubscriber` resolves on the first message.
1. Sweep `README.md`, `api/dev.api.http`, `api/dev.mqtt.http`,
   `docs/state-machine-design.md` (Validation, A4, D25; D23 is
   [08](08-script-context.md)'s, D24 [05](05-command-input.md)'s), the
   comment of `src/dto/notify.dto.ts` (only presence is left, for
   [07](07-presence.md)) and the 06 row of the index.

## Tasks

- [x] After the move of step 1 the service answers as before, and
      `StateMachine.describe(status)` returns the machine document.
      Check: `test/unit/fsm.service.requests.spec.ts`,
      `test/unit/fsm.service.spec.ts`,
      `test/unit/fsm.state-machine.spec.ts`.
- [x] The section defaults both flags to `false` when missing or
      partial, and rejects an unknown key, `__proto__` and a
      non-boolean; `parseDefinition` carries it. `Escalations` emits
      nothing without flags, `failure` once per call, `no-transition`
      once per entry and event and again after a new entry, nothing
      before the first transition; `request` emits with `state: null`
      and `entry: 0` without a machine, emits once per key, also for a
      repeat with another body, and every time without a key. Check:
      `test/unit/fsm.escalation.spec.ts`.
- [x] `escalateSchema` accepts a 1024-byte `reason` and a 4096-byte
      `proposal`, and rejects a missing or empty `reason`, one byte
      more of either, and a `proposal` that is an array or `null`.
      Check: `test/unit/escalation.dto.spec.ts`.
- [x] Through `FsmService` with a `scriptFolder` definition that has
      the section: a `$failure` without a transition escalates; one
      whose target's script is running does not; `$stopped` does not;
      a repeated client event escalates once per entry; an event that
      a parameter raises does not; nothing escalates with the flags
      off. Check: `test/unit/fsm.service.escalation.spec.ts`.
- [x] `DescriptorService.onEscalation` forwards; the notifier sends an
      escalation unretained. Check: `test/unit/descriptor.service.spec.ts`,
      `test/unit/notifier.service.spec.ts`.
- [x] The MQTT `escalate` route returns `{ "status": "accepted" }`,
      the validation body for a bad payload or key, and passes the key.
      Check: `test/unit/mqtt-request.escalate.spec.ts`,
      `test/unit/mqtt.config.spec.ts` (route list).
- [x] `POST /escalate` answers `202` with and without a machine, `400`
      for a bad body, and replays a repeated key without a second
      notification; the escalation reaches the webhook, and a client
      that subscribes to `<base>/notify/+` on the local aedes broker
      after the escalation receives the retained `state` notification;
      the broker retains nothing on `<base>/notify/escalation`. Check:
      `test/e2e/escalation.spec.ts`.
- [x] README, request files, design document (Validation, A4, D25) and
      the index updated. Check: from the repository root,
      `npx markdownlint-cli -c .markdownlint.yaml` on them.
- [x] `yarn build` and `yarn test` pass. eslint lints no `.ts` file,
      so `npx tsc --noEmit --noUnusedLocals --noUnusedParameters` must
      be clean, no file passes 250 lines, and no function crosses the
      Qlty thresholds. Check: their output, and
      `qlty metrics --functions` (highest complexity 4).

## Learnings

- The plan's line numbers for the cycle search were stale (it named
  256-291; the code was at 130-165). [08](08-script-context.md) merged
  first and moved it to `src/fsm/completion-cycle.ts`, so
  `definition.ts` is 222 lines with both the `env` and `escalation`
  sections.
- [08](08-script-context.md) merged first with its own `request`,
  `reply`, `follow` and `StateMachine.describe`. The rebase keeps
  [08](08-script-context.md)'s `follow` and `describe`, replaces
  `request` and `reply` with `Requests`, and drops `hasMachine()` for
  `check() !== undefined` in `DescriptorService`. `fsm.service.ts` is
  then at 249 lines, with no room left: [09](09-persistence.md) must
  move something out before it adds, for example the script runs
  (`enter`, `enterStopping`, `run`, `complete`).
- `startRunner` of `test/e2e/util.ts` does not start `MqttService`.
  Starting it after `app.init()` misses the startup state notification,
  so the end-to-end test makes a transition first to have a retained
  state.
- [07](07-presence.md) merged before 06 and made the same moves of
  `startBroker`, `stopBroker` and the `Webhook` server; the rebase keeps
  [07](07-presence.md)'s `mqtt.util.ts`, and `webhook.util.ts` holds
  [07](07-presence.md)'s `received` and `presence` with a public
  `first`. With [07](07-presence.md), the broker retains the presence
  and state topics, and still not the escalation one.
- aedes 1.x does not declare `persistence` in its types; the
  broker-side retained check casts to `{ createRetainedStream }` and
  reads the stream with `Readable.toArray()`. Setting `escalation`
  retained in `RETAINED` makes that test fail, so the check works.
- A byte size by the JSON rule counts the quotes of a string, so a
  1024-byte `reason` has 1022 ASCII characters; the README says so.
- Jest passed a test file with a type error (a `kind: string` envelope
  where `NotifyKind` was due); only the `tsc` check caught it.
- No version bump: the change adds a section, a route and a
  notification kind, and breaks no existing request.
- `DEVELOPER.md` names no route or notification, so it needs no
  change. `docs/developer/codebase/runner.md` documents the route set
  and is stale; the pull request lists it for a separate change.

[dtn-requirements]: ../../../../../system/servers/execution/runner/DT-networks.md#requirements-on-a-managed-dt
