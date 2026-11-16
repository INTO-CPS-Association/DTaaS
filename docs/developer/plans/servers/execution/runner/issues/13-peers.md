# 13 Peer List and Relationships

## Spec

The Manager of a DT network sees the network state
`O = (s_1, …, s_n, R)`, where `R ⊆ D × D` relates DTs and mirrors the
relationships of the physical world; in the hospital example `R` is
the distances between hospitals (see the
[Concepts][dtn-concepts]). The runner knows
no other runner (A1), so neither a Manager nor the DT itself can read
`R` from it. Here a DT positively lists the peers it is willing to
interact with, and nothing else is a peer. The list is a deployment
fact, as `mqtt.topic` is, so it goes in `runner.yaml`, the operator's
file (S4).

### Configuration

```yaml
id: hospital-1
mqtt:
  url: 'mqtt://127.0.0.1:18830'
  topic: 'dtaas/hospital-1'
peers:
  - id: hospital-2
    topic: 'dtaas/hospital-2'
    url: 'http://localhost:5200'
    attributes:
      distance: 12.4
```

- `peers` is optional and strict. `id` follows the name pattern, is
  unique, and is not the runner's own `id`.
- `topic` is the peer's MQTT base topic on the runner's own broker,
  with the rules of `mqtt.topic`; `url` is its HTTP base URL. A peer
  has at least one. A `topic` equal to the runner's own, or listed
  twice, is refused (this plan's call: peers are followed by topic).
- `attributes` has the schema and meaning of the DT's own: an opaque
  flat map of strings, numbers and booleans, no `__proto__`. A
  relationship such as `distance` is an attribute, which the runner
  never reads. This answers open question 8.
- `enabled` defaults to `true`; `publicKey` is the peer's 15b key in
  15a's encoding.

### Following Peers

With an `mqtt` section, the runner subscribes with QoS 1, over its
existing client, to `<peer topic>/notify/presence` and
`<peer topic>/notify/state` of every enabled peer with a `topic`. Every
runner publishes both retained since 03 and 07, so they arrive on
subscribe and the runner knows at once whether the peer is online, its
descriptor and its last state document. Per peer it remembers `online`,
`descriptor` (of the last online notice; an offline notice keeps it)
and `state` (the `data` of the last state notice). mqtt.js subscribes
again on reconnect.

A payload counts only as an envelope (S7) of the topic's kind whose
`id` is the peer's (this plan's call); anything else is logged as a
warning and dropped. An empty payload, which clears a retained notice,
sets that part back to `null` (this plan's call). For a peer with a
`publicKey`, a signed (JWS) payload is verified and unwrapped and an
unsigned one dropped. A peer without one is taken as is, so a signed
payload does not parse and is dropped (this plan's call: taken
unverified, it would look verified). Without `mqtt`, peers are listed
but never observed. A peer's notice raises no event and sends no
notification; 16 adds reactions.

### API

`GET /peers` (MQTT `peers`) answers `200` with a map from peer id to
its entry, `{}` without peers. `online` is `null` when unknown: without
MQTT, for a disabled peer or one without `topic`, and before a notice.
`descriptor` and `state` are `null` until received; an absent `topic`
or `url` is `null`; `publicKey` is not shown (this plan's call). With
`hospital-2` online in state `full`:

```json
{
  "hospital-2": {
    "topic": "dtaas/hospital-2",
    "url": "http://localhost:5200",
    "attributes": { "distance": 12.4 },
    "enabled": true,
    "online": true,
    "descriptor": {
      "id": "hospital-2",
      "attributes": { "name": "Hospital 2", "city": "Aarhus" },
      "commands": ["open", "full", "closed", "admit", "discharge"],
      "stateMachine": true,
      "manager": { "commands": ["admit", "discharge"] },
      "peers": ["hospital-1"]
    },
    "state": {
      "id": "hospital-2",
      "time": "2026-10-26T14:56:02.410Z",
      "machine": {
        "state": "full",
        "status": "running",
        "entry": 3,
        "events": ["beds-free", "close", "full", "reopen", "scope-changed"]
      },
      "parameters": { "scope": "single", "capacity": 2 },
      "command": null
    }
  }
}
```

`PUT /peers` (MQTT `set-peers`), for 15a's roles `manager` and
`client`, enables and disables listed peers. The body maps ids to
booleans; one that is not an object is `400 Validation Failed`. The
whole body is checked first; an unknown id or a non-boolean is refused
with `400` and every problem in `message`, as `PUT /parameters` does:

```bash
curl -s -X PUT http://localhost:5100/peers \
  --json '{"hospital-9":false,"hospital-2":"off"}'
```

```json
{
  "message": ["unknown peer hospital-9", "peer hospital-2 takes a boolean"],
  "error": "Bad Request",
  "statusCode": 400
}
```

`{"hospital-2": false}` is `200` with the body of `GET /peers`, where
`hospital-2` has `"enabled": false` and `online`, `descriptor` and
`state` `null`. A body is applied atomically and stored in a `peers`
table of `Queue` (`id`, `enabled`, `changed_at`; the latest row wins),
which overrides the file's `enabled` at the next start. Disabling
unsubscribes and forgets what was received; enabling subscribes again,
and the retained notices fill the entry shortly after the reply. An
equal value changes nothing; `{}` is `200`. No notification is sent and
no event is raised. The Manager can enable and disable only what the
operator listed, never add a peer: the DT, through its operator,
remains the party that positively lists whom it interacts with.

### Descriptor, Scripts and 16

`GET /dt`, and so the presence notice, gains `peers`: the enabled ids
in file order, `[]` without any, so a Manager learns `R` from the DTs.
The state document does not change. As `PUT /peers` notifies nothing,
the retained presence notice keeps the list of the last connect;
`GET /dt` is current (this plan's call). Scripts read the list through
`GET $RUNNER_URL/peers` (D23) with 15a's `script` role.

16 builds on what 13 remembers: `subscriptions` in the state machine
file, with `when` on a peer's `state` or `online`, raise local events
edge-triggered, and a document from a peer with a `publicKey` counts
only when it verifies, which 13 already enforces. New routes, an
optional key and a descriptor field break no route, so the version
stays where 15a leaves it (the delivery rules bump only for a break).

### Considered and Set Aside

- Discovery by wildcard under a shared base topic: anything on the
  broker would become a peer, against the positive list, and base
  topics are per user today.
- A `DT_PEERS` file or variable for scripts: D23 has scripts use the
  HTTP API, and a file is stale after a `PUT /peers`.
- The state machine file as the home of the list: addresses are the
  operator's deployment facts (S4); the DT author's reactions go there
  in 16.
- A Manager that adds peers: it would decide the DT's trust for it.

## Plan

1. `src/config/attributes.ts`: `attributesSchema` and `Attributes`
   move out of `src/config/config.schema.ts:8-13`, so that
   `config.schema.ts` and `src/peers/peers.config.ts` share them without
   an import cycle (04's lesson); `baseTopic`
   (`src/mqtt/mqtt.config.ts:7-12`) is exported.
1. `src/peers/peers.config.ts`: the strict `peerSchema` (`topic` or
   `url`; `publicKey` with 15a's key schema), `peersSchema` (unique ids
   and topics) and `PeerConfig`. `config.schema.ts` adds
   `peers: peersSchema.default([])` and a refinement against the own
   `id` and `mqtt.topic`.
1. `src/config/configuration.service.ts`: `getPeers()`; `parseConfig`
   (`:33-43`) calls a `protoProblem(content)` helper that also checks
   each peer's `attributes`, so its complexity stays at 3.
1. `src/queue.peers.ts`: the `peers` table (latest row by `rowid`), its
   SQL and `toSwitches(rows)`, as `src/queue.machine.ts` does for the
   machine. `src/queue.service.ts` (245 lines) gains `setPeers(changes)`
   and `peerSwitches()`, modelled on `setParameters` and
   `parameterValues` (`:199-229`); to make room, `RECORD`,
   `RECORD_BY_KEY` and `toRecord` (`:49-58`, `:76-93`) move to
   `src/queue.record.ts`, with an `inTransaction(db, work)` that both
   setters share.
1. `src/dto/peers.dto.ts`: `PeerDto`, `PeersDto` and `peersBodySchema`,
   a record of `z.unknown()` so the check can name a non-boolean.
   `src/dto/descriptor.dto.ts` gains `peers`.
1. `src/peers/peers.ts`: a plain class `Peers` with the list, the
   switches and what was received: `load(list, store)`, `enabledIds()`,
   `document()`, `set(body): string[]` (check all, store, apply,
   signal), `observe(id, kind, data)` and `onEnabled(listener)`, the
   name 16 expects; `load` signals each enabled peer. 16 adds
   `onDocument`.
1. `src/peers/peer-notice.ts`: `readNotice(peer, kind, payload)` gives
   the data, `null` for an empty payload, or a reason to drop. It
   reuses 15a's `src/auth/jws.ts` (Ed25519 through `node:crypto`), with
   `kid` the peer's id as 15b signs: this plan's call, as 15a verifies
   JWS already and 15b may not be merged.
1. `src/mqtt/follows.ts`: a plain topic-to-listener map, `Follows`.
   `src/mqtt/mqtt.service.ts` (constructor unchanged) gains
   `follow(topics, listener)` and `unfollow(topics)`, which subscribe
   and unsubscribe when the client exists; `start` (`:75-79`) also
   subscribes the topics followed before it; the `message` listener
   (`:97-99`) gives a followed topic to its listener and any other to
   `respond`, whose `routes.get` (`:161-164`) still ignores unknown
   topics. A map rather than a listener per peer: one dispatch keeps
   notices apart from requests, and `unfollow` needs no listener
   references. The room comes from 15a, which moves `requestKey` and
   `publishOptions` (`:225-238`) to `src/mqtt/mqtt-request.ts`; if 15b
   has not yet moved `responseTopic` (`:211-223`) there, 13 does.
1. `src/peers/peer-watch.ts`: an injectable `PeerWatch`
   (`DescriptorService`, `MqttService`) that registers `onEnabled` in
   its constructor, so the order of `onModuleInit` hooks does not
   matter; follows or unfollows a peer's two topics on each signal;
   and passes each message through `readNotice` to `observe`, logging
   drops.
1. `src/descriptor.service.ts` owns `Peers`. It and
   `MqttRequestHandler` (`src/mqtt/mqtt-request.handler.ts:45-49`)
   have three constructor parameters each, so a `PeersService` would be
   a fourth in both. It loads `Peers` in `onModuleInit` from
   `config.getPeers()` and `Queue`, which `src/main.ts:28` opens before
   `listen`, and adds `peers()` and the `peers` field of `describe()`.
1. `src/peers/peers.controller.ts` (only `DescriptorService`): `GET` and
   `PUT /peers` after `src/parameters.controller.ts`; the `peers` and
   `set-peers` routes in `mqtt.config.ts` and `mqtt-request.handler.ts`
   through `this.descriptor.peers()`; rows `peers` (every role) and
   `set-peers` (`client`, `manager`) in 15a's `ROUTE_ROLES`
   (`src/auth/roles.ts`), with `@AccessRoute` on both handlers;
   `src/app.module.ts` registers the controller and `PeerWatch`.
1. `demo/hospital/runner.yaml` lists `hospital-2` as in the Spec; the
   demo runs one runner, so it stays `online: null` (this plan's call).

## Tasks

- [x] The schema accepts the example and refuses a peer without `topic`
      and `url`, a duplicate id or topic, the own id or topic, an
      invalid topic or url, nested attributes and an unknown key, each
      with a message. Check: `test/unit/peers.schema.spec.ts`.
- [x] `Config` returns the peers and refuses a `__proto__` attribute of
      a peer. Check: `test/integration/options.service.spec.ts`.
- [x] `Queue` stores switches in one transaction and returns the
      latest per id, also within a second. Check:
      `test/integration/queue.peers.spec.ts`.
- [x] `Peers` lists every problem without applying any, stores before
      applying, ignores an equal value, signals each change, forgets a
      disabled peer, and lets a stored switch override the file. Check:
      `test/unit/peers.spec.ts`.
- [x] `readNotice` drops bad JSON, a wrong kind or id, an unsigned
      payload of a keyed peer, a signed payload of a keyless peer and a
      bad signature; unwraps a good one; maps an empty payload to
      `null`. Check: `test/unit/peer-notice.spec.ts`.
- [x] `follow` and `unfollow` subscribe and unsubscribe, a followed
      message never reaches the handler, `start` subscribes earlier
      follows, and nothing happens without MQTT. Check:
      `test/unit/mqtt.follow.spec.ts`, fakes of `mqtt.fixture.ts` gain
      `unsubscribe`.
- [x] `PeerWatch` follows enabled peers with a topic and unfollows on a
      signal. Check: `test/unit/peer-watch.spec.ts`.
- [x] The descriptor lists enabled peers; `GET /dt` and the presence
      notice carry it. Check: `test/unit/descriptor.service.spec.ts`,
      `test/e2e/descriptor.spec.ts`; grep `test/e2e/mqtt.broker.spec.ts`
      for descriptor shapes.
- [x] `GET` and `PUT /peers` as specified, including `{}`, `400` with
      every problem, and a switch kept across a restart. Check:
      `test/e2e/peers.spec.ts`.
- [x] The MQTT routes give the same bodies and 15a's roles hold. Check:
      `test/unit/mqtt-request.peers.spec.ts`, the route list of
      `test/unit/mqtt.config.spec.ts`, 15a's role tests.
- [x] Against aedes, retained notices published before the start show
      in `GET /peers`, a second runner started by `startRunner` (with
      its `getId` spied) is seen online with its state, and disabling
      then enabling forgets and refills the entry. Check:
      `test/e2e/mqtt.peers.spec.ts`.
- [x] Sweeps: `README.md` (Configure, Digital Twin, Peers requests,
      MQTT API), `api/API.md` (Routes, GET /dt, a Peers section, Request
      Topics, Presence), `api/dev.api.http`, `api/dev.mqtt.http`,
      `config/runner.yaml.sample`, `DEVELOPER.md` (MQTT Tests), and
      `docs/state-machine-design.md`: a decision for the peer list at
      the next free D number when the PR is opened, D16 amended (the
      runner also follows its peers' notify topics), A1 amended (the
      runner knows the peers its operator lists, and still never
      manages them), A4 amended (a peer notice raises no event). Check:
      `npx markdownlint-cli -c .markdownlint.yaml` on them from the
      repository root, and `npx prettier --check` from the runner.
- [x] `yarn syntax`, `yarn build` and `yarn test --maxWorkers=2` pass,
      `npx tsc --noEmit --noUnusedLocals --noUnusedParameters` is
      clean, and every changed file stays under 250 lines and every
      function under 25 and under Qlty's limits. Check: their output
      and `wc -l`.

## Learnings

- **Drift.** `nameSchema` lives in `src/fsm/name.ts` since 15a, so
  `src/config/attributes.ts` imports it from there. `src/queue.service.ts`
  had 211 lines, not 245: `RECORD`, `RECORD_BY_KEY` and `toRecord` stay
  where they are, as 11 moves them to `src/queue.history.ts` and a
  second move to `src/queue.record.ts` would only conflict, and
  `inTransaction` is a function of `queue.service.ts`, which ends at 233
  lines. `src/mqtt/mqtt.service.ts` had 232 lines; 13 moved
  `responseTopic` to `src/mqtt/mqtt-request.ts`, where it takes a
  predicate for the request topics, and the service ends at 246.
  `mqttRoutes` sits at `src/mqtt/mqtt.config.ts:26-40`. The other line
  numbers held.
- **No `Follows` class.** A `Map<string, FollowListener>` field of
  `MqttService` is the whole of it, so `src/mqtt/follows.ts` was not
  written. `follow(topic, listener)` and `unfollow(topic)` take one
  topic each rather than a list: `PeerWatch` calls them once per kind,
  so each listener knows its kind without parsing the topic. `start`
  subscribes the request topics and the followed ones in one call.
- **Hook order.** `PeerWatch` registers `onEnabled` in its constructor
  and `DescriptorService.onModuleInit` loads `Peers`, which signals each
  enabled peer; Nest builds every provider before it runs any
  `onModuleInit`, so the follows are in place whatever the order of the
  hooks. In `main.ts` they run inside `listen`, after `start`, so
  `follow` subscribes at once.
- **Late notices.** `observe` ignores a peer that is not enabled: a
  message in flight when `PUT /peers` unsubscribes would otherwise
  refill an entry that the reply showed empty.
- **Readings this plan left open.** An empty presence payload clears
  both `online` and `descriptor`. A presence notice counts only with a
  boolean `online`; the envelope is not strict, and its `time` may be
  `null`, as in the will. `PUT /peers` stores and applies the changes
  in file order, and stores before it applies, so a failing database
  applies nothing and the reply is a 500.
- **Switches are a `Map`.** `Queue.peerSwitches()` and the switches of
  `Peers` are maps, so that a peer id such as `constructor`, which the
  name pattern allows, never meets a property of `Object.prototype`.
- **Tests.** `startRunner` of `test/e2e/mqtt.util.ts` gained a
  `prepare` hook; two runners in one process, `hospital-1` and
  `hospital-2`, follow each other on one aedes broker, and the retained
  notices refill an entry after a disable and an enable. A test spies
  `Logger.prototype.warn` rather than reading a private `logger`, which
  SonarCloud reports.
- **Tooling.** In this session's shell, a heredoc fed to Python lost
  the backslash of `\n`, which put a raw line break into a template
  literal; prettier did not object, and only the diff showed it. Edit
  such strings with an editor rather than through a shell. The Qlty
  CLI was not installed on the host, so the complexity of the new
  functions was checked by hand against the limits of the lessons.
- **Qlty on the PR** found one smell that the hand count missed:
  `refuseSelf` at complexity 5, as the two `if`s and the `&&` inside its
  `forEach` callback count towards it. It now loops over the keys `id`
  and `topic` with an `indexesOf` helper, like `repeats`.
- **Version and decision.** The version stays where 11 left it, 0.10.0,
  as the Spec says: new routes, an optional key and a descriptor field
  break no route. 11 took D30, so the peer list is D31.
- **Rebase onto 11.** 11 merged first (#91), and the rebase conflicted
  in five places. `queue.service.ts`: 11 had moved `RECORD` and
  `toRecord` to `queue.history.ts`, so only `inTransaction` stays above
  `Queue` and the file ends at 226 lines.
  `DescriptorService.onModuleInit` now starts the metrics and then
  loads the peers. `mqttRoutes` and the subscription list of
  `mqtt.service.spec.ts` keep `metrics` before `peers` and `set-peers`.
  In `README.md`, `api/API.md` and the design document, 11's text was
  kept and 13's edits applied again on top, the decision renumbered
  to D31. Both descriptor unit tests needed new fakes: 11's
  `onModuleInit` calls `fsm.onChange` and `fsm.onAnswer`, and 13's
  calls `config.getPeers` and `queue.peerSwitches`.
- **Left for later.** `hospital.cast` was not recorded again, so its
  `GET /dt` shows no `peers`; API.md shows `"peers": ["hospital-2"]`,
  which the demo's `runner.yaml` now gives, and 16 re-captures the
  examples. `docs/developer/codebase/runner.md`, whose class diagram
  lacks `DescriptorService` already, does not show `Peers`,
  `PeerWatch` or `PeersController`; that is for a separate change.

[dtn-concepts]: ../../../../../system/servers/execution/runner/DT-networks.md#concepts
