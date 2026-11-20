# 03 State Change Notifications

## Spec

The Manager of a DT network runs a Monitor that collects the states of the DTs.
Today it can only poll. This feature publishes the state document of DT
whenever it changes, over MQTT and over an optional HTTP webhook, and
gives [06](06-escalation.md) and [07](07-presence.md) the same path for
their notifications.

### When

A notification is sent when the state document changes:

- the machine enters a state (`FsmService.enter`, `enterStopping`);
- the script of a state completes (`FsmService.run`, once the script
  status is set);
- any command starts or finishes, including a plain `POST /` without a
  state machine (`Queue.enqueue`, `Queue.complete`);
- a parameter value changes ([04](04-parameters.md), once both are
  merged);
- the runner has started (and, with [09](09-persistence.md), restored
  its state).

A document equal to the last one sent, ignoring `time`, is not sent
again, so the entry of a state, which also starts a command, sends one
document, not two.

### Envelope

Every notification, over both transports, is one JSON object:

```json
{
  "kind": "state",
  "id": "hospital-1",
  "time": "2026-10-25T10:00:00.000Z",
  "data": { "...": "the state document of 02" }
}
```

`kind` is `state`, `escalation` ([06](06-escalation.md)) or `presence`
([07](07-presence.md)). `id` repeats the document's; for `state`, `time`
is the document's own `time`.
Documents of one entry built within the same millisecond can share
`time`; a receiver that needs a strict order takes the last one it got
over MQTT, which delivers them in order.

### MQTT

Published on `<base>/notify/<kind>`, QoS 1. `state` and `presence` are
retained, so a Manager that connects later gets the current document;
`escalation` is not. Which kinds are retained is a table in the
notifier. The topics are two levels under the base topic. This amends
D16: requests stay one level down, and the client subscribes to exact
request topics (`src/mqtt/mqtt.service.ts:65`), so the `notify`
sub-tree cannot be mistaken for a request, and a `<topic>/+/response`
subscription still covers every reply.

While disconnected, mqtt.js queues publishes and sends them in order on
reconnect, so the last retained document wins. A long outage holds
every queued document in memory; the documents are small, and the
README says so.

### Webhook

```yaml
notify: # optional
  url: 'https://manager.example.org/dt-events'
  token: 'secret' # optional; sent as Authorization: Bearer <token>
```

Each notification is one `POST` of the envelope,
`Content-Type: application/json`, with a 5 s timeout, retried after 1 s,
2 s and 4 s on a network error or a `5xx` response; the body of a
failed response is discarded before the retry. A `4xx` response is not
retried. Notifications are sent independently and may arrive out of
order. A failure is logged once per URL until a delivery succeeds, with
the URL's host only, since the URL may carry credentials, as the MQTT
service logs its broker (`src/mqtt/mqtt.service.ts:63`, `72-85`).

At shutdown, `WebhookClient` aborts the fetches in progress and drops
the retries still waiting; pending deliveries are abandoned.

Neither transport is required. Without both, `GET /state` is the only
observation.

## Plan

1. Add `src/notify/notify.config.ts` with the zod schema of the
   `notify` key; add the key to `config.schema.ts` (and so to
   `ConfigValues`) and `Config.getNotify()` to
   `src/config/configuration.service.ts`.
1. Add `src/notify/changes.ts`: a plain, non-injectable class
   `Changes { on(listener); emit() }`. `FsmService` and `Queue` each
   own one as a field and expose `onChange(listener)`; neither gains a
   constructor parameter.
1. In `src/fsm/fsm.service.ts`, emit at the end of `enter` and
   `enterStopping` (after the status is `running` and the run has
   started) and in `run` after the status is set and before
   `complete`; `complete`, `runIfCurrent` and refused requests emit
   nothing. The service is near 250 lines: first move the `COMPLETION`
   and `STATUS` maps to `src/dto/fsm.dto.ts`, next to `ScriptStatus`.
   In `src/queue.service.ts`, emit from `enqueue` and `complete`.
1. `DescriptorService.onChange(listener)` subscribes to both, since it
   owns the document whose change they signal.
1. Add `MqttService.notify(kind, body, retain)` next to `respond`,
   doing nothing without MQTT, which publishes on
   `notifyTopic(base, kind)`, a new helper in `src/mqtt/mqtt.config.ts`,
   with the base topic from its own `Config`.
1. Add `src/notify/webhook.client.ts` (constructor: `Config`), using
   the global `fetch` with a signal combining `AbortSignal.timeout(5000)`
   and one shared `AbortController` (`AbortSignal.any`). Split one
   attempt (`'done' | 'retry'`) from the retry loop to stay under
   Qlty's complexity limit; `unref()` the retry timers;
   `beforeApplicationShutdown` aborts the controller and stops further
   attempts.
1. Add `src/notify/notifier.service.ts` (constructor:
   `DescriptorService`, `MqttService`, `WebhookClient`): subscribes
   through `DescriptorService.onChange` on module init, skips a
   document equal to the last `state` document sent ignoring `time`,
   builds the envelope, publishes with the retain table, and posts to
   the webhook. It exposes `send(kind, data)` for [06](06-escalation.md)
   and [07](07-presence.md), whose envelope takes `id` from
   `DescriptorService.describe()`, and sends the startup document from
   `onApplicationBootstrap`. It sends nothing once
   `beforeApplicationShutdown` has run.
1. Register the units in `src/app.module.ts`.
1. In `test/e2e/mqtt.util.ts`, call `MqttService.start()` before
   `app.init()`, as `main.ts` connects before the server listens, so the
   startup publish reaches the broker in the broker test.
1. Document the topics, the `notify` key, the envelope, the dedup rule
   and the offline queue in `README.md`; amend D16 and A4 ("the runner
   publishes its state unasked") in `docs/state-machine-design.md`; add
   a subscription example to `api/dev.mqtt.http`. Note in
   [07](07-presence.md)'s plan that its shutdown presence post needs a
   signal of its own, as `WebhookClient` aborts its shared one at shutdown.
1. When [04](04-parameters.md) is merged first, or on the rebase of the
   later of the two:
   `FsmService.setParameters` emits once after it commits the values.

## Tasks

- [x] `notify` schema accepts `url` alone and `url` with `token`, and
      rejects a non-URL and an unknown key. Check:
      `test/unit/notify.config.spec.ts`.
- [x] `FsmService` emits on entry, on a stop transition and on
      completion, once each, and not for a refused request; `Queue`
      emits on `enqueue` and `complete`. Check:
      `test/unit/fsm.service.spec.ts`,
      `test/unit/fsm.service.stop.spec.ts`,
      `test/integration/queue.service.spec.ts`.
- [x] `MqttService.notify` publishes QoS 1 on `<base>/notify/<kind>`
      with the given retain flag and does nothing without MQTT. Check:
      `test/unit/mqtt.notify.spec.ts`.
- [x] Webhook client retries on network error and `5xx` at 1, 2 and
      4 s, stops after the third retry, does not retry `4xx`, sends the
      bearer token, logs a repeated failure once by host, and stops
      retrying after shutdown. Check: `test/unit/webhook.client.spec.ts`
      with fake timers for the delays and a fake `fetch` (a rejected
      `TimeoutError` stands for the timeout).
- [x] Notifier wraps the document in the envelope, retains `state` and
      `presence` but not `escalation`, skips an unchanged document, and
      sends the startup document once; `DescriptorService.onChange`
      passes both sources to one listener. Check:
      `test/unit/notifier.service.spec.ts`,
      `test/unit/descriptor.service.spec.ts`.
- [x] A transition over HTTP produces a retained message on
      `<base>/notify/state` that a late subscriber receives. Check:
      `test/e2e/mqtt.broker.spec.ts` (runs in CI with the broker); a
      command over HTTP does the same on the local broker of
      `test/e2e/mqtt.spec.ts`.
- [x] A transition produces a `POST` on a local test server configured
      through `jest.spyOn(config, 'getNotify')`, and the test file
      finishes without `--forceExit`. Check: `test/e2e/webhook.spec.ts`.
- [x] README, design document (D16, A4) and request files updated.
      Check: from the repository root,
      `npx markdownlint-cli -c .markdownlint.yaml` on them.
- [x] `yarn build` and `yarn test` pass,
      `npx tsc --noEmit --noUnusedLocals` is clean, and no function or
      constructor crosses the Qlty thresholds. Check: their output.

## Learnings

- An injected emitter would have given `FsmService` and the notifier a
  fourth constructor parameter and a dependency cycle; a plain `Changes`
  object owned by `FsmService` and `Queue`, forwarded by
  `DescriptorService.onChange`, needs none. [06](06-escalation.md) and
  [07](07-presence.md) follow the same pattern for escalations and the
  MQTT connection.
- One document per state entry depends on `run` enqueueing its command
  synchronously, so the queue signals first and the notifier skips the
  entry's own, unchanged, document. An `await` before `enqueue` would
  double the notifications.
- Webhook posts are concurrent and arrive out of order (seen in the PR
  evidence); MQTT delivers in order, and its retained message is the
  latest.
- The notifier stops before the queue closes because the queue closes
  in `ExecaManager.onApplicationShutdown`, after every
  `beforeApplicationShutdown` hook. Those hooks start in one pass, in
  provider order, so `MqttService` is already disconnecting when a later
  hook runs ([07](07-presence.md) depends on this).
- Pending webhook retries kept Jest alive until they were aborted at
  shutdown and their timers `unref()`-ed.
- The broker test runs only in CI against Mosquitto with MQTT 5; the
  local aedes broker speaks MQTT 3.1.1 and covers a late subscriber of a
  retained message.
