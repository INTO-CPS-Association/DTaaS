# 07 Presence: Join and Leave

## Spec

DTs join and leave a DT network at runtime, and its Manager keeps a
database of DT addresses. Today nothing is published without a
request, so a Manager learns of a runner only when it asks. This
feature announces the runner when it connects and when it leaves, over
the transports of 03, as notifications of kind `presence`.

### Envelope

The online notice carries the descriptor of 01 (`GET /dt`):

```json
{
  "kind": "presence",
  "id": "hospital-1",
  "time": "2026-10-25T10:00:00.000Z",
  "data": { "online": true, "descriptor": { "...": "GET /dt of 01" } }
}
```

The offline notice is `{ "online": false }` with the current time. The
MQTT will is the same notice with `"time": null`, as the will is fixed
when the client connects. That is the one exception to S7's envelope:
`NotificationDto.time` becomes `string | null` rather than a separate
will type, as the will and the offline notice share one topic and one
shape, and a separate type would make the parameter of `notify` and
`post` a union for no gain.

### MQTT

- On every `connect` (first connection and each reconnect), the online
  notice is published on `<base>/notify/presence`, QoS 1, retained. A
  reconnect publishes over MQTT only, not to the webhook.
- The client connects with a will on the same topic, QoS 1, retained.
  The broker publishes it only when the runner disappears without a
  clean shutdown: a crash, a kill or a lost connection.
- At shutdown, `MqttService.beforeApplicationShutdown`:
  1. publishes the offline notice with the current time, retained, and
     races it against 2 s;
  1. if the publish settled (acknowledged or failed), ends gracefully
     with `endAsync()`, which sends DISCONNECT, so the broker drops the
     will and the retained notice keeps its time; the end is raced
     against 2 s too;
  1. if the publish did not settle, ends with `endAsync(true)`;
  1. if the graceful end did not finish, destroys the socket with
     `client.stream.destroy()`. A second `end()`, forced or not, is a
     no-op once a graceful one has started: mqtt.js calls it back at
     once while `disconnecting` is set (`client.js` ~929), and the
     graceful end may still wait for `outgoingEmpty` (~826).
  1. Either fallback logs a warning that "the broker did not confirm
     the leave", unlike the error `notify()` logs for a failed publish.
     The broker may then publish the will, which overwrites the
     retained notice with `time: null`; it still says offline.

The race timers are cleared when the promise settles. The leave adds
at most 4 s to the shutdown.

### Webhook

With `notify.url`, the online notice is posted once at startup with the
retries of 03. The offline notice is posted once at shutdown, with one
attempt and a timeout of 2 s, so the retry schedule of 03 cannot hold
the shutdown. Nest runs the `beforeApplicationShutdown` hooks of the
module concurrently, so the webhook's 2 s overlap the MQTT wait.

Without MQTT and without a webhook, nothing is announced. Presence
adds a kind and a topic and breaks no route, so the version stays.

### Ownership

Nest starts the `beforeApplicationShutdown` hooks of one module in
provider order in one tick: `MqttService`, then `WebhookClient`, then
`Notifier`. When the notifier's hook runs, the MQTT client is already
disconnecting, so `MqttService` publishes the offline notice itself,
built from `Config` alone (`getId()`, `new Date()`).

The online notice needs the descriptor, which `MqttService` cannot
reach without a fourth constructor parameter. So `MqttService` gains
`onConnect(listener)`, backed by a `Changes` instance of 03 and emitted
from its `connect` handler; `Notifier.onModuleInit` subscribes and
publishes through `MqttService.notify`. No constructor changes.

`main.ts` calls `start()` right before `app.listen()`, which runs
`app.init()`, and `test/e2e/mqtt.util.ts` calls it before `app.init()`.
The first `connect` event follows the CONNACK and the drain of the
outgoing store, both I/O, while `init()` reaches `onModuleInit` through
promises alone, so the listener is registered first. As a fallback,
`onConnect` calls a listener at once when `client.connected` is already
true, so a missed first `connect` still announces the runner.

## Plan

1. `src/dto/notify.dto.ts`: `time` becomes `string | null`, and
   `offlineNotification(id, time)` builds the offline notice.
1. `src/mqtt/mqtt.config.ts`: a pure `presenceWill(base, id)`, and
   `clientOptions(options, id)` moved from `mqtt.service.ts`, which
   adds the will.
1. `src/notify/changes.ts`: its comment covers any signal.
1. `src/mqtt/mqtt.service.ts`: `start` passes `config.getId()` to
   `clientOptions`; a `connects` `Changes` field, `onConnect`, and an
   emit in the `connect` handler; `beforeApplicationShutdown` follows
   the sequence of the Spec through `this.notify('presence', ..., true)`,
   which resolves on success and on failure, split into a leave and an
   end step, with `settles(promise, ms)` (now `src/mqtt/settles.ts`).
1. `src/notify/webhook.client.ts`: `attempt` takes its signal, and
   `deliver` builds it and returns once the controller is aborted;
   `sendOnce` makes one attempt with `AbortSignal.timeout(2000)`, so
   the aborted controller does not stop it. `failed` no longer skips
   its log while aborted, which would hide every `sendOnce` failure;
   the catch of `attempt` treats an `AbortError` as no failure instead,
   as a timeout rejects with a `TimeoutError`.
1. `src/notify/notifier.service.ts`: `onModuleInit` subscribes
   `mqtt.onConnect`; `onApplicationBootstrap` posts the online notice;
   `beforeApplicationShutdown` sets `stopped`, then awaits `sendOnce`
   of the offline notice; a private `online()` builds the online notice
   from `describe()`.
1. Tests: the fakes of `test/unit/mqtt.fixture.ts` gain `getId` and
   `stream.destroy`; the old shutdown test of `mqtt.service.spec.ts`
   moves to `mqtt.presence.spec.ts`; `nextNotification` of
   `test/e2e/mqtt.util.ts` takes a data type, defaulting to
   `StateDocumentDto`.
1. Documents: `README.md` (MQTT API, Notifications, Webhook),
   `DOCKER.md` (up to 4 s of the stop grace period), the
   `notifications` request of `api/dev.mqtt.http`, and a decision in
   `docs/state-machine-design.md` with A4's amendment extended.

## Tasks

- [x] `presenceWill` gives a retained QoS 1 will on
      `<base>/notify/presence` with `online: false` and `time: null`;
      `clientOptions` carries it. Check: `test/unit/mqtt.config.spec.ts`
      and the options test of `test/unit/mqtt.service.spec.ts`.
- [x] `onConnect` listeners run on each `connect`. Shutdown publishes
      the offline notice retained with the current time (fake clock)
      and then calls `endAsync()` without `true`; without MQTT it does
      nothing. Check: `test/unit/mqtt.presence.spec.ts`.
- [x] With fake timers, a `publishAsync` returning
      `new Promise(() => {})`, then `jest.advanceTimersByTimeAsync(2000)`,
      leads to `endAsync(true)` and a warning; an `endAsync()` that
      never settles leads, 2 s later, to `stream.destroy()`. Check:
      `test/unit/mqtt.presence.spec.ts`.
- [x] `sendOnce` posts once, does not retry a failure, logs it even
      after `beforeApplicationShutdown`, and posts nothing without a
      webhook; the existing retry and abort tests pass unchanged.
      Check: `test/unit/webhook.once.spec.ts` and
      `test/unit/webhook.client.spec.ts`.
- [x] The notifier publishes the online notice with the descriptor,
      retained, on each connect and posts nothing then; posts it at
      startup; awaits `sendOnce` with the offline notice at shutdown;
      and publishes nothing on a connect after shutdown. Check:
      `test/unit/notifier.service.spec.ts`, its fakes extended with
      `onConnect` and `sendOnce`.
- [x] A late subscriber receives the retained online notice; after
      `app.close()`, it receives the offline one with a time. `afterEach`
      also deletes the retained presence topic, as it does the state
      topic, since the public broker is shared. Check:
      `test/e2e/mqtt.broker.spec.ts`, `lateSubscriber` unchanged; it
      runs in CI only, as port 1883 is blocked on the development host.
      The same two checks run locally against aedes in
      `test/e2e/mqtt.presence.spec.ts`.
- [x] Destroying the runner's socket makes the broker publish the will
      (`time: null`), and the reconnect publishes the online notice
      again. The test subscribes to the presence topic before the
      destroy, destroys the stream through a helper rather than bracket
      access to a private member, which SonarCloud flags, and waits
      across the 1 s `reconnectPeriod` of mqtt.js, with a timeout above
      Jest's default 5 s. Check: `test/e2e/mqtt.presence.spec.ts`
      (local aedes broker).
- [x] `received()` of the test webhook first filters by `kind`, as a
      presence post has no `machine` and would pass the startup check;
      then the webhook receives one online post at startup and, after
      `app.close()` in the test, one offline post with a time. Check:
      `test/e2e/webhook.spec.ts`.
- [x] README, `DOCKER.md`, design document and request file updated.
      Check: from the repository root,
      `npx markdownlint-cli -c .markdownlint.yaml` on them.
- [x] `yarn syntax`, `yarn build` and `yarn test` pass; eslint lints no
      `.ts` file, so
      `npx tsc --noEmit --noUnusedLocals --noUnusedParameters` is
      clean; every changed file stays under 250 lines and every
      function under 25. Check: their output and `wc -l`.

## Learnings

- With `settles` module-level, `mqtt.service.ts` reached 249 lines, not
  well under 250 as planned: the shutdown sequence and `onConnect`
  outweigh the moved `clientOptions`. `settles` moved to
  `src/mqtt/settles.ts` in review, which leaves the service at 240
  lines for 05, 06 and 08.
- The will-and-reconnect test cuts the runner's connection on the
  broker's side, through the typed `conn` of the aedes `Client` that
  the `clientReady` event hands over. That needs neither bracket access
  nor an accessor on `MqttService` for its private client, and the
  runner sees what a network failure gives it. With local copies of
  the retained-notice and leave checks beside it, the presence tests
  would have taken `mqtt.spec.ts` (203 lines) past 250, so they went to
  `test/e2e/mqtt.presence.spec.ts`, with `startBroker` and `stopBroker`
  moved to `mqtt.util.ts`.
- aedes publishes the will on a forced end: replacing the graceful
  `endAsync()` with `endAsync(true)` made the local leave test fail,
  as the will replaced the retained offline notice. The local test
  guards the graceful end; the Mosquitto test runs only in CI.
- New tests spy on `Logger.prototype` instead of `service['logger']`.
  The webhook test helpers moved into `test/unit/webhook.fixture.ts`
  for `webhook.once.spec.ts`, so they count as new code for SonarCloud
  and use the prototype spy.
- The webhook e2e test closes the runner inside the test to see the
  offline post, so `app` became optional, as in the broker test.
- The presence decision is D26: 08 took D23, and 05 and 06 claim D24
  and D25. It is worded to fit the existing column widths of the
  decision table, so prettier does not realign every row and conflict
  with 05 and 06, which add decisions in parallel.
- 08 (PR #81) keeps `start()` before `app.listen()`, so the order the
  Ownership paragraph relies on holds; were `start()` ever moved after
  `listen()`, `onConnect` registers the listener before the client
  exists and the first `connect` still announces the runner.
- The version stays at 0.6.0, as the Spec says: presence adds a kind
  and a topic and breaks no route.
