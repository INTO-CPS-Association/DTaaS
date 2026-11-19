# 16 React to Peer State

## Spec

In decentralised adaptation the DTs coordinate their adaptation
through peer-to-peer communication and adapt on the collective
knowledge of the network, rather than on a Manager's decisions (see the
[Concepts][dtn-concepts]). Comparing a centralised Manager with such variants needs
a mechanism for both. The runner
already has a vocabulary for what moves a DT: events. This feature
turns a change at a peer into an event of the DT, declared by the DT
author, so that peer-to-peer coordination needs no new channel and no
logic in scripts.

The peers are the positive list of [13](13-peers.md): the operator
names each peer in `runner.yaml`, and [13](13-peers.md) watches each
enabled peer's `notify/presence` and `notify/state` and keeps the last
document of each. There is no discovery, so the shared base topic that
discovery would need (item [13](13-peers.md) of [DT Networks][dtn])
does not arise. The event is raised by the runner itself, from a
document [13](13-peers.md) has accepted, not by a script over HTTP, so
the risk of a script flooding the machine with events (open question 6
of DT Networks) does not arise either;
edge triggering, below, bounds the events to one per change of
interest, which is the rate limit item 16 asked for.

### The section

A top-level `subscriptions` list in the state machine file, the DT
author's file (S4):

```yaml
subscriptions:
  - peer: hospital-2
    when:
      state: full
    event: neighbour-full
```

- `peer` is the `id` of a peer listed in `runner.yaml`, enabled or
  not. It is checked at load against the configuration, as states are
  checked against `commands`.
- `when` holds exactly one of `state: <name>`, which holds when the
  peer's latest state document has that `machine.state`, and
  `online: true` or `online: false`, which holds when the peer's latest
  presence notice has that `online`. `<name>` follows the name pattern;
  it is the peer's state, so it is not checked against this file's
  states.
- `event` is an event under `events`. Completion events can not be
  named, as the name pattern has no `$`.
- The section is optional; without it, nothing changes.

The runner refuses the file, and does not start, when an entry has
another key or misses one, `when` has no key, both keys or another one,
`peer` is not listed under `peers` in `runner.yaml`, `event` is not
under `events`, or two entries have the same `peer`, `when` and
`event`. The same `peer` and `when` with different events is allowed:
both events are raised, in file order. Each problem is one line of the
error, as for the other sections.

### When the event is raised

The runner keeps, per subscription, whether its condition held in the
last document seen from that peer: `true`, `false` or unknown. It
raises `event` only when the condition turns from not holding, or
unknown, to holding. The first document after subscribing counts as a
change, so the retained `full` of a peer that is already full fires at
startup.

- A state condition reads state documents only, and an `online`
  condition presence notices only; a document of the other kind leaves
  the record as it is.
- A peer whose machine is `null`, or which has no state machine, holds
  no state condition.
- A presence notice does not touch the record of a state condition: a
  peer that restarts and reports `full` again raises nothing, as it was
  `full` before.
- The will of [07](07-presence.md), `online: false` with `time: null`,
  and the offline notice of a graceful shutdown both hold
  `online: false`; whichever comes first raises the event, and the
  second changes nothing.
- One document can raise several events; they are raised in file
  order, each against the state the previous one produced, as the
  events of a parameter change are (D22).
- A duplicate delivery (MQTT QoS 1) changes nothing, as the condition
  already holds.

### Worked example

`hospital-1` lists `hospital-2` as a peer, and its file has, apart
from the sections and transitions of the demo today:

```yaml
events:
  - full
  - beds-free
  - scope-changed
  - close
  - reopen
  - neighbour-full
  - neighbour-down
subscriptions:
  - peer: hospital-2
    when: { state: full }
    event: neighbour-full
  - peer: hospital-2
    when: { online: false }
    event: neighbour-down
states:
  open:
    transitions:
      neighbour-full: { state: open, stop: true }
```

`hospital-2` publishes these state documents, and one presence notice:

| #   | What happened at `hospital-2`  | `machine.state`   | `command`                 | `hospital-1` raises |
| :-- | :----------------------------- | :---------------- | :------------------------ | :------------------ |
| 1   | enters `open`                  | `open`            | `open`, running           | nothing             |
| 2   | admits `p-1`                   | `open`            | `admit`, running          | nothing             |
| 3   | `admit` finishes               | `open`            | `admit`, valid            | nothing             |
| 4   | admits `p-2`, finishes         | `open`            | `admit`, valid            | nothing             |
| 5   | last bed taken, enters `full`  | `full`            | `full`, running           | `neighbour-full`    |
| 6   | script of `full` finishes      | `full`            | `full`, valid             | nothing             |
| 7   | Manager discharges `p-1`       | `full`            | `discharge`, running      | nothing             |
| 8   | `beds-free`, enters `open`     | `open`            | `open`, running           | nothing             |
| 9   | runner of hospital-2 is killed | (presence notice) | `online: false`, the will | `neighbour-down`    |

- 1 to 4: `open` is not `full`; the first document sets the record to
  `false`.
- 5: `open` became `full`. `open` of `hospital-1` restarts at its next
  entry, so its script stops forwarding overflow to `hospital-2`.
- 6 and 7: still `full`; the command changed, not the state.
- 8: `hospital-2` left `full`; no subscription asks for that. A DT
  author who wants it adds `when: { state: open }` with its own event.
- 9: the will holds `online: false`; the online notice that
  `hospital-1` saw when it subscribed did not, so the record turns
  from `false` to `true`.

One event per change of interest, with a name that says what happened;
the script of `open` needs no comparison logic.

### What the event does

The event takes the path of `POST /fsm/event` from an internal caller:
`FsmService.event(event)` without a request key
(`src/fsm/fsm.service.ts:165-185`, with `move`).

- The current state's transition is taken, including `stop: true` and
  self-transitions, as in the example.
- No transition is logged at debug level and, with
  `escalation.onNoTransition`, escalates once per entry and event
  (D25), as a client's event does (`firstTime`,
  `src/fsm/escalation.ts:98-109`). The escalation's `reason` is the
  usual `no transition for neighbour-full in state closed`.
- The request-key machinery is not involved, and nothing replies.
- Before the first transition (state `null`) the event is refused with
  `no transition`, as today, logged and not escalated. The record still
  turns `true`, so the event is not raised again for that change: a
  state that must know the neighbour's current state at entry reads
  `GET $RUNNER_URL/peers` (this plan's call: no replay at the first
  transition).
- During shutdown the event is refused `stopping` and logged as a
  warning, as `Requests.answer` does today
  (`src/fsm/requests.ts:33-42`, `53-62`); no script starts.
- An accepted event is logged at `log` level with the peer, the
  condition and the event, so that `runner.log` shows why the machine
  moved (this plan's call).

### Disabled, signed and silent peers

- A peer that a Manager disables with `PUT /peers` ([13](13-peers.md))
  makes its subscriptions inert: [13](13-peers.md) unfollows a disabled
  peer's topics, so no notice of it arrives. The records of its
  subscriptions are forgotten on disable (this plan's call), so when it
  is enabled again, the first document counts as a change, as at
  startup. A peer listed with `enabled: false` is inert
  from the start.
- Documents [13](13-peers.md) drops, unsigned or invalid from a peer
  that has a `publicKey` ([15b](15b-signed-output.md)), or unparsable,
  never reach 16, so a forged `full` raises nothing. A peer without a
  key is taken as is; a DT author whose subscriptions steer the machine
  asks the operator for the peer's key.
- A peer that sends nothing raises nothing; a subscription is a
  reaction to documents, not a timeout. `online: false` covers a peer
  that vanishes, through its will.

### Demo

The hospital demo becomes a network of two DTs:

- `hospital-2`: port 5200, base topic `dtaas/hospital-2`, its own
  configuration `runner-2.yaml` and state machine file
  `hospital-2.fsm.yaml` next to the files of `hospital-1`, and the same
  scripts in `scripts/` (this plan's call). Its file is `hospital-1`'s
  without `subscriptions`, with `capacity` 1, so two admissions fill
  it. Each hospital lists the other under `peers` with a `distance`
  attribute in km.
- The scripts keep their beds and log per DT, in `run/$DT_ID/`, so two
  runners share `scripts/` (this plan's call).
- `hospital-1`'s `open` reacts to `neighbour-full` and
  `neighbour-down` with a `stop: true` self-transition. At entry,
  `open` reads `GET $RUNNER_URL/peers` and logs where overflow goes:
  the nearest peer online in state `open`, or none. `full` reads the
  same list and succeeds when such a peer exists, else fails as today
  (this plan's call), which gives row 6 of the example its `valid` and
  keeps the `failure` escalation of `hospital-1`, whose neighbour is
  then `full`.
- The scripts send `Authorization: Bearer $RUNNER_TOKEN`
  ([15a](15a-access-control.md)); each runner signs its notifications
  with its `auth.key`, and each lists the other's `publicKey`
  ([15b](15b-signed-output.md)). Keys are generated by `record.mjs` into
  `run/` where [15b](15b-signed-output.md)'s form allows it, so no
  private key is committed (this plan's call).
- Shell twins of the PowerShell scripts, as `test/data/scripts` has:
  `admit`, `closed`, `discharge`, `full` and `open`, executable
  (`git update-index --chmod=+x`), and `ward.sh` for the helpers. The
  factory runs `name` on Linux and `name.ps1` on Windows
  (`src/runner-factory.service.ts:13-20`). They parse JSON with `node`,
  which every runner host has, rather than `jq` (this plan's call).

The recording becomes two synchronised windows. `record.mjs` writes two
casts on one clock: on the left the Manager's terminal, typing to both
runners (`dt1` and `dt2`, `mq1` and `mq2` in `tools/shell.sh`, with the
Manager's `Authorization` header); on the right the notification stream
of both DTs, one line per notification from a subscriber to
`dtaas/+/notify/+`. A viewer sees `hospital-1` restart `open` when
`hospital-2` goes `full`, and raise `neighbour-down` when `hospital-2`
is killed. `to-mp4.sh` renders each cast with agg and joins them side
by side with ffmpeg `hstack` into one video.

It is recorded on Windows and on Linux: `demo-windows.mp4` and
`demo-linux.mp4` replace `hospital.mp4`, with the casts
`demo-windows-manager.cast`, `demo-windows-network.cast` and their
`demo-linux-*` twins replacing `hospital.cast`. The root
`.gitattributes` already stores `*.mp4` in Git LFS. The Linux recording
runs in WSL or the `developer/devenv` container. The broker is aedes,
in `tools/services.mjs`, so it runs wherever node runs; the Linux
recording would be dropped only if the devenv could not run it, which
is not expected. `api/API.md`'s examples are re-captured from the new
recording, with the `Authorization` header of
[15a](15a-access-control.md) and the signed notifications of
[15b](15b-signed-output.md) where they show.

### Version

A new optional section breaks no file and no route, so 16 needs no
version bump of its own; the version is whatever [13](13-peers.md) and
[15](README.md#status) left. The internal signature of `loadDefinition`
changes, which no consumer sees.

### Considered and set aside

The owner weighed two other designs against the example above:

- **B, no `when`**: every document of the peer raises the event. The
  sequence gives eight events for one change of interest; a
  `stop: true` self-transition restarts the script of `open` on every
  admission at the neighbour; and the script must fetch the documents
  and compare them itself to know what changed.
- **C, `on: state | presence` without `when`**: change-triggered on
  one field. The sequence gives three events instead of one (rows 5, 8
  and 9), and the file can not say "only when the neighbour becomes
  full"; the script decides.

Design A was chosen because policy expressed in the file keeps scripts
quiet, and `when` can grow more fields later, such as a parameter
value, without breaking a file.

## Plan

1. Review this plan against the merged [13](13-peers.md) and
   [15b](15b-signed-output.md). [13](13-peers.md)'s plan has a plain
   class `Peers` (`src/peers/peers.ts`) owned by
   `DescriptorService` and reached through `descriptor.peers()`, with
   `observe(id, kind, data)` for each notice that `PeerWatch` accepted
   and `onEnabled(listener)` for enable and disable, and
   `config.getPeers()`. `Peers` has no listener for notices, so this
   pull request adds `onNotice(listener)`, called from `observe` after
   it stores the data (this plan's call). Use [13](13-peers.md)'s names
   as merged.
1. Add `src/fsm/subscriptions.ts`, the pattern of `parameters.ts`:
   - `subscriptionsSchema`: a list of strict entries, `when` a union
     of two strict objects (`{ state: nameSchema }`,
     `{ online: z.boolean() }`), with `.default([])`;
   - `Subscription` and `subscriptionProblems(definition, peers)`:
     unknown peer, undeclared event, duplicates by a key of `peer`,
     `when` and `event`;
   - `known(config)`, which returns `{ commands, peers }` (the ids of
     `config.getPeers()`) for `loadDefinition`, so that
     `FsmService.load()` does not grow;
   - a plain class `PeerEvents(raise)` with `declare(subscriptions)`,
     `see(peer, kind, data)` and `forget(peer)`. The records are a
     `Map` by subscription index; `holds(when, kind, data)` returns
     `true`, `false` or `undefined` for the other kind, split by
     kind to keep each function under complexity 5. The `null` data of
     an empty payload (`readNotice` of [13](13-peers.md)) holds nothing.
1. `src/fsm/definition.ts` (227 lines): add the section to
   `fileSchema` (`:56-69`), `Definition` (`:29-38`) and `toDefinition`
   (`:89-106`). `parseDefinition` would reach four parameters, so
   `permitted` becomes `known: { commands, peers }` in
   `parseDefinition(text, file, known)`, `loadDefinition(file, known)`
   and `crossCheck` (`:134-152`), which adds `subscriptionProblems`.
   About eight lines; `hasProtoKey` needs no change, as strict objects
   refuse `__proto__` (a test checks it).
1. `src/fsm/fsm.service.ts` (248 lines) does not grow: `load()`
   (`:70-80`) passes `known(this.config)`, and `managerCommands()`
   (`:125-128`) becomes `declared(): Definition | undefined`, read by
   `DescriptorService` (`declared()?.managerCommands ?? []`) and by the
   new service.
   `StateMachine.managerCommands` (`src/fsm/state-machine.ts:27`) goes
   if nothing else reads it.
1. Add `src/fsm/peer-events.service.ts`: `PeerEventsService`, with
   `FsmService` and `DescriptorService` (two constructor parameters),
   which no other class receives. Its constructor registers `onNotice`
   to `see` and `onEnabled` to `forget` a disabled peer, as `PeerWatch`
   registers `onEnabled`, so the order of the `onModuleInit` hooks does
   not matter. `onModuleInit` declares `PeerEvents` from
   `declared()?.subscriptions` (`main.ts` loads the definition before
   `listen`); no notice arrives before it, as a notice needs I/O and
   the hooks only yield microtasks. It raises with
   `logStay(logger, fsm.event(event), event)` from
   `src/fsm/requests.ts`, logging an accepted event. Register it in
   `src/app.module.ts`. Nothing changes in `src/mqtt/mqtt.service.ts`.
1. Tests and test data: a state machine file with `subscriptions`
   whose states are test scripts (`loop` with a `stop: true`
   self-transition), and a configuration with two peers, one with a
   key, or a spy on `getPeers` as [06](06-escalation.md) spied on
   `getMqtt`.
   `test/unit/fsm.definition.spec.ts` is at 239 lines, so the section's
   tests get their own file.
1. Documents of the runner part: `README.md` (a Peer Events section
   under State Machine, after Escalation), `STATE-MACHINE.md` (a
   Subscriptions section under Write the State Machine File, the
   refusals, and a paragraph under Run the Machine),
   `docs/state-machine-design.md` (the file example list, Validation,
   a new decision with the next free D number when the pull request is
   opened, Components, and A4), `api/dev.mqtt.http` (publish a
   retained peer state to try a subscription), `api/dev.api.http`
   (`GET /fsm` after it), `DEVELOPER.md` (only if it names test data
   or files that change) and `docs/issues/README.md` (16 leaves
   Deferred and gets a row).
1. The demo, last, once [13](13-peers.md), [15b](15b-signed-output.md)
   and the runner part are merged:
   `demo/hospital/runner.yaml`, new `runner-2.yaml` and
   `hospital-2.fsm.yaml`, `hospital.fsm.yaml` with the subscriptions,
   `scripts/*.ps1` with `run/$DT_ID/`, peers and the token, their shell
   twins, and in `tools/`: `settings.mjs` (both bases and URLs),
   `shell.sh`, `mq.mjs`, `services.mjs` (`dtaas/+/notify/+`),
   `steps.mjs`, a new `clock.mjs` shared by two `Cast`s (the gap cap
   applied once on the shared clock), `record.mjs` (two runners, an
   asynchronous `run`, as `spawnSync` blocks the subscriber, and a
   `kill` step), `check-cast.mjs` (both casts, one end time) and
   `to-mp4.sh` (an agg idle limit above any gap, so that agg does not
   compress the casts differently; `hstack`). Then `api/API.md`,
   `demo/hospital/README.md` and the hospital example of
   `STATE-MACHINE.md`, which link `hospital.cast` and `hospital.mp4`.

## Tasks

Size L. The runner part is one pull request on `runner/16-peer-events`;
the demo is the last task, a second pull request once [13](13-peers.md),
[15b](15b-signed-output.md) and the runner part are merged (this plan's
call).

### Runner Feature

- [x] The section accepts the example and an empty list, and rejects
      an unknown key, `__proto__` in an entry or in `when`, a `when`
      with no key or both, a non-boolean `online`, an unlisted peer,
      an undeclared event and a duplicate, each with a message; the
      same `when` with two events loads. Check:
      `test/unit/fsm.subscriptions.spec.ts` (new).
- [x] `parseDefinition` and `loadDefinition` take `known`, and every
      existing refusal still names its problem. Check:
      `test/unit/fsm.definition.spec.ts`,
      `test/unit/fsm.parameters.spec.ts`,
      `test/unit/fsm.declared-env.spec.ts`.
- [x] `PeerEvents` replays the worked example and raises exactly
      `neighbour-full` at 5 and `neighbour-down` at 9; a first document
      that holds raises; a duplicate does not; a presence notice leaves
      a state record alone; a `null` machine holds nothing; two
      subscriptions on one document raise in file order; after
      `forget`, the next document counts as first. Check:
      `test/unit/fsm.peer-events.spec.ts` (new).
- [x] Through `FsmService`: a peer event takes a `stop: true`
      self-transition and restarts the script; without a transition it
      escalates once per entry with `onNoTransition`; before the first
      transition it is refused and not escalated; during shutdown it
      is refused `stopping`. Check:
      `test/unit/fsm.service.peer-events.spec.ts` (new).
- [x] `PeerEventsService` declares the subscriptions after `load()`,
      forwards documents and disables, and logs each reply at its
      level; `Peers.onNotice` fires after `observe` stores the data.
      Check: `test/unit/peer-events.service.spec.ts` (new),
      `test/unit/peers.spec.ts`, and
      `test/unit/descriptor.service.spec.ts` for `declared()`.
- [x] End to end on the local aedes broker: a retained `full` of a
      peer without a key, published before the runner starts, raises
      the event at startup; a later `full` after `open` raises it once;
      a will raises the `online: false` event; an unsigned document of
      a peer with a key raises nothing; a disabled peer raises nothing
      until enabled. Check: `test/e2e/peer-events.spec.ts` (new), with
      `startBroker` of `test/e2e/mqtt.util.ts`.
- [x] `test/e2e/mqtt.broker.spec.ts` asserts no shape that 16 changes.
      Check: grep it, and its CI run against Mosquitto.
- [x] README, `STATE-MACHINE.md`, the design document (the next free
      D number when the pull request is opened; A4 amended: "Amended
      by issue 16: the runner also raises an event by itself when the
      condition of a subscription to a listed peer turns true; the
      event takes the path of a client's event"), `api/dev.api.http`,
      `api/dev.mqtt.http`, `DEVELOPER.md` and the index. Check: from
      the repository root, `npx markdownlint-cli -c .markdownlint.yaml`
      on them, and each request file run once against a runner.
- [x] `yarn syntax`, `yarn build`, `yarn test --maxWorkers=2` and
      `npx tsc --noEmit --noUnusedLocals --noUnusedParameters` pass;
      no file passes 250 lines; no function reaches complexity 5, four
      parameters or four returns. Check: their output, and
      `qlty metrics --functions`.

### Demo Recording

- [x] Both runners start from their configurations on Windows, list
      each other on `GET /peers`, and `hospital-1` restarts `open` when
      `hospital-2` goes `full`. Check: `node tools/record.mjs` on
      Windows and the `runner.log` of each.
- [ ] The shell twins run on Linux, and `git ls-files -s` shows them
      at mode `100755`. Check: `node tools/record.mjs` in WSL or the
      devenv container. Recorded from WSL later.
- [x] Two casts on Windows on one clock, ending together. Check:
      `node tools/check-cast.mjs`.
- [ ] Two casts on Linux on one clock, ending together. Check:
      `node tools/check-cast.mjs`. Recorded from WSL later.
- [x] `demo-windows.mp4`, side by side, replaces `hospital.mp4`, stored
      in Git LFS. Check: `bash tools/to-mp4.sh` and `git lfs ls-files`.
- [ ] `demo-linux.mp4`, side by side, stored in Git LFS. Check:
      `bash tools/to-mp4.sh linux` and `git lfs ls-files`. Recorded
      from WSL later.
- [x] `api/API.md` re-captured from the new recording, with the
      `Authorization` header and signed notifications where they show;
      `demo/hospital/README.md` (scenario, sections, play, record and
      convert) and the hospital example of `STATE-MACHINE.md`. Check:
      `npx markdownlint-cli -c .markdownlint.yaml` on them, and
      `npx prettier --check`.
- [x] `yarn syntax`, `yarn build`, `yarn test --maxWorkers=2` and
      `npx tsc --noEmit --noUnusedLocals --noUnusedParameters` pass.
      Check: their output.

## Learnings

- **Recording in two sessions** (owner's decision, 2026-10-27). The
  recording waits until [17b](17b-process-tree.md),
  [17c](17c-fidelity.md) and [18](18-script-user.md) are merged, so that
  one capture shows the `processes` figure, the fidelity convention and the script
  account. The Windows pair is recorded first, from this checkout. The
  Linux pair is recorded afterwards from a clone of the branch inside
  the WSL filesystem, not under `/mnt/c`, where file modes are not real
  and [18](18-script-user.md)'s layout check would refuse the key: the
  shell twins are
  written there, each runner is started by hand under `setpriv` with
  the script account on, and the casts and MP4s are pushed from there.
- **Drift.** `FsmService.managerCommands()`
  (`src/fsm/fsm.service.ts:129-132`, not `:125-128`) had two more
  readers since 15a: `AccessGuard.check` (`src/auth/access.guard.ts:64`)
  and `MqttRequestHandler.authorize`
  (`src/mqtt/mqtt-request.handler.ts:105`). Both read
  `declared()?.managerCommands ?? []` now, as the descriptor does. The
  service already had a private field `declared`, the `Parameters`
  (`src/fsm/fsm.service.ts:37`), which became `params` to free the
  name. The refusal during shutdown is in `Requests.compute`
  (`src/fsm/requests.ts:76-85`), not `:33-42` and `:53-62`.
  `FsmService.event` is at `:165-173` and `move` at `:175-185`. The
  other references held: [13](13-peers.md)'s `readNotice` in
  `src/peers/peer-notice.ts`, the follows as a map of `MqttService`
  with `follow` and `unfollow` per topic, `PeerWatch` in
  `src/peers/peer-watch.ts`, the switches in `src/queue.peers.ts`, and
  [15b](15b-signed-output.md)'s `kid` of the DT id, verified through
  `src/auth/jws.ts`.
  `fsm.service.ts` stays at 247 lines and `definition.ts` grows to 237.
- **`PeerEvents` lives in `subscriptions.ts`**, as the plan says, beside
  the schema and the checks; the file has 155 lines. `holds` is split
  into `stateHolds` and `onlineHolds`, each parsing the notice with a
  zod schema, so that a state document of any shape holds no state
  rather than throwing.
- **zod's union errors.** For a `when` that matches neither branch,
  zod 4 reports the issue of the branch it came closest to: a
  `__proto__` beside `online` is `Unrecognized key: "__proto__"` at
  `subscriptions[0].when`, and a bad state name the message of the
  name rule at `when.state`. The union's own message, "must hold
  exactly one of state: <name> and online: <boolean>", shows for no
  key, both keys, another key and a non-boolean `online`. Every case is
  refused with its path; the tests assert the message zod gives.
- **The log.** An accepted event is logged at `log` level as
  `Raised neighbour-full on state full of peer hospital-2: entered
open`; a refused one goes through `logStay`, at debug level for `no
transition` and as a warning otherwise, without the peer, as the
  spec asks the peer only of an accepted one.
- **End to end.** Closing a runner while `loop` runs waits for the
  script, and a stop transition chains a new run after the stop, so a
  test that ends in `loop` hangs in `app.close`; the disable test
  moves `create` instead, which exits at once. The will is a real one:
  a client connects with it and its stream is destroyed. The event
  that a retained `full` raises before the first transition shows only
  in `GET /metrics`, as `events.noTransition`. Each test waits for the
  runner's subscription on the broker before it publishes, so the
  order of the notices is the order of publishing.
- **Request files.** The test state machine subscribes to the state
  `full` of `hospital-2`, which `config/runner.test.yaml.sample` now
  lists, so a configuration copied from the older sample stops the
  runner. Against a runner on a local aedes broker (MQTT 3.1.1, so
  `protocolVersion: 4`), `dev.mqtt.http` sent all 25 requests, and
  `peerFull` took `execute` to `create` with the log line above;
  `dev.api.http` sent 32, and httpYac counts one as errored: the
  `{{@request}}` script of [15a](15a-access-control.md) throws
  `keyFile is not defined` while `@keyFile` is commented out, which
  predates this issue.
- **Tests and checks.** The whole suite passed on Windows with
  `--maxWorkers=2`: 105 suites and 953 tests (9 skipped) before the
  merge with [17a](17a-script-resources.md), 110 suites and 997 tests
  (10 skipped) after it. On
  the merge base, two suites had failed on the same host with 5 s
  timeouts (`options.spec.ts`, `auth.mqtt.spec.ts`), which passed on
  the runs with this branch. `mqtt.broker.spec.ts` passed in CI against
  Mosquitto, and asserts no shape that 16 changes (grep). The Qlty CLI
  is not installed here, so the complexity of the new functions was
  counted by hand; CI's Qlty reported no blocking issue, SonarCloud no
  new issue, and Codecov every changed line covered.
- **Version and decision.** The version stays at 0.10.0, as the Spec
  says: an optional section breaks no file and no route.
  [17a](17a-script-resources.md), in progress at the same time, may bump
  it; whichever merges second keeps the other's version.
  [17a](17a-script-resources.md) takes D33, so peer subscriptions are
  D34.
- **Merging [17a](17a-script-resources.md).**
  [17a](17a-script-resources.md) merged first (#94), with `resources` in
  the
  execute, status and history replies, a `resources` total in
  `GET /metrics`, two history columns and D33. This branch merged
  `feature/distributed-demo` rather than rebasing, as its pull request
  was open. Four files conflicted: the README (the `GET /` and history
  paragraphs, which now say both the running status and the
  resources), `api/API.md` (the version line names the resources, the
  peers and the subscriptions), the design document (`queue.peers.ts`
  and `resources/*`, the `commands` row with both resources and `by`,
  D33 before D34) and the index ([15b](15b-signed-output.md) and
  [17a](17a-script-resources.md) done). The sweep then covered
  [17a](17a-script-resources.md): the summaries of `STATE-MACHINE.md`
  and `DOCKER.md`,
  the version lines, the design document's list of issues and
  [DT Networks][dtn]. One claim of the sweep was wrong and is corrected:
  `by` is never `script`, as the role `script` may not call
  `POST /`.
- **The demo is not in this pull request.** The Tasks make the demo a
  second pull request once the runner part is merged, so its boxes
  stay open; `hospital.cast` and the examples of `api/API.md` are not
  re-captured yet, and API.md now says which of its replies follow the
  code rather than the recording.
- **Documentation sweep.** On the owner's request, this pull request
  also brings the runner's documents up to date with
  [11](11-history-metrics.md), [13](13-peers.md) and
  [15b](15b-signed-output.md), in separate commits: `auth.principals`
  where the text said `auth`, the routes, the error table, the design
  document's components,
  tables and tests, a broken link of `DEVELOPER.md`, and a status
  column in DT Networks.
- **Security model.** Also on the owner's request, `SECURITY-MODEL.md`
  records the threat model and the chosen separation of the runner
  from its scripts (B3 and C1), which issue [18](18-script-user.md) is
  to implement. Writing
  it showed that a script spawned with Node's `uid` and `gid` options
  alone would keep the runner's ambient capabilities, as a change
  between two non-zero uids clears none; the guide asks issue
  [18](18-script-user.md) to clear them in the spawn, for example
  through `setpriv`.
- **The Windows recording** (#98). The demo became the network of the
  Spec: `runner-2.yaml` and `hospital-2.fsm.yaml` beside the files of
  `hospital-1`, the subscriptions in `hospital.fsm.yaml`, the scripts
  keeping their beds and log in `run/<id>/`, and `open` and `full`
  reading `GET $RUNNER_URL/peers` for the nearest open peer. Beyond
  the Plan's demo, so that one recording shows every feature:
  - `fidelity` is declared on `hospital-1`'s machine as
    [17c](17c-fidelity.md)'s guide has it, with a `stop: true`
    self-transition of `open`, whose script samples the beds every
    `POLL_MS` times 4, 1 or 0.2; the Manager
    sets `high` once, and `GET /history?limit=2` shows the run at the
    old value `stopped` with its figures.
  - Access control is on, as are signatures: `record.mjs` writes the
    keys of `alice`, `manager-1` and both runners into `run/keys/` and
    appends the peer's `publicKey` and an `auth` section to each
    configuration (`tools/configs.mjs`), so no private key is
    committed. `dt1` and `dt2` sign as `alice`, `mq1` and `mq2` as
    `manager-1`; an unsigned request gets `401` and a manager starting
    `open` `403`. `jws.mjs` verifies with the key of the `kid`'s DT.
  - A chapter disables and enables `hospital-2` with `PUT /peers`: the
    retained `full` counts as a change after the enable, as the Spec
    says, and restarts `open` once more.
  - `hospital-2` is opened before `hospital-1`, so that `open` of
    `hospital-1` finds it open at its first entry; the first take, in
    the other order, logged overflow to none, as `hospital-2` was
    still before its first transition.
- **The clock.** The subscriber runs in `services.mjs`, its own
  process, and writes the real time at which each notification
  arrived to `run/notify.jsonl`; `tools/clock.mjs` remembers each real
  wait of the recorder and turns that time into a time on the clock,
  so `run` keeps `spawnSync` and needs no asynchronous rewrite. After
  the story, `capGaps` shortens every gap over 2 s of the merged events
  of both casts and ends both with one event at the same time. A gap of
  one cast alone may thus reach 4 s, where the other cast has an event
  between; `to-mp4.sh` gives agg an idle limit of 60 s, so that agg
  changes no gap.
- **Timings.** A take ran for 3 min 10 s on this host; the casts last
  6 min 23 s, 19 chapters, 88 kB for the Manager and 9 kB for the
  network. agg and ffmpeg in WSL took 14 minutes under `/mnt/c`, for
  GIFs of 15 MB and 1 MB, and the MP4 has 1966×918 and 5.1 MB. agg
  drops the last event, which changes nothing on screen, so the GIFs
  last 385.9 s and 380.2 s; `hstack` holds the last frame of the
  shorter one, and the panes stay in step, as frames at 233 s and 380 s
  showed.
- **What does not show on Windows.** The stop grace: the runner ends
  `powershell.exe` at once, so the Stop chapter only names `stopGrace`.
  Resources of short scripts: `admit`, `discharge`, `full` and
  `closed` end before the Windows sampler, a PowerShell of its own,
  takes its first sample, so only the runs of `open` report figures,
  1.7 to 2 CPU seconds for runs of four to six seconds, about 100 MB and
  `processes` 2. `scripts` of `GET /health` is `null`, as
  [18](18-script-user.md) refuses `scripts.user` on Windows; the Linux
  pair shows the account. No feature needed a change of the runner's
  code.
- **Smaller findings.** `format.mjs` compared the width of a value
  without its key, so lines of the descriptor wrapped in the pane; it
  now counts the key. The webhook lines of the Webhook chapter still
  wrap by their `POST` prefix, which is cosmetic. `steps.mjs` passed
  250 lines once prettier split the narration, so the second half
  moved to `steps-peers.mjs`. A heredoc in this session's shell lost
  the backslash of `\\`, as [13](13-peers.md)'s Learnings say, so the
  scripts that
  edited the documents were written with an editor. The state diagram
  of `STATE-MACHINE.md` changed only in its notes and was not rendered,
  as mermaid-cli is not installed here. Both runners watch the one
  `run/shutdown`, and the first to see it removes it; the demo shuts
  down `hospital-1` only, after `hospital-2` was killed.
- **Re-captured documents.** `api/API.md`: the setup with two runners
  and the `Authorization` header in every `curl` but `/health`, the
  descriptor with its `publicKey`, `GET /state`, `GET /health` with
  `scripts: null`, `GET /metrics`, `POST /`, `GET /`, `GET /history`
  with `since` and `limit`, `GET /fsm`, the parameters with `fidelity`,
  `GET /peers` and `PUT /peers`, the MQTT example with `verified`
  responses, every notification decoded from the signed payload of the
  run, the JWS figures (502 characters of payload, 638 bytes in all),
  the will, `mq retained`, the webhook log, the script environment and
  the Example Session. The claims of MQTT Access Control stay
  illustrative, as the recorder keeps no request token. The README's
  examples use `my-dt` and `create` rather than the demo, and none was
  deferred to this recording, so it is unchanged.
- **Checks of the Windows half.** On this host, `yarn syntax`,
  `yarn build` and
  `npx tsc --noEmit --noUnusedLocals --noUnusedParameters` passed, and
  `yarn test --maxWorkers=2` ran 126 suites, 124 passed and 2 skipped,
  and 1173 tests, 1159 passed and 14 skipped, in 255 s. markdownlint
  with `.markdownlint.yaml` and prettier pass on every changed document.
  No stray `node` or `powershell` process outlived a take: the hospital
  of the killed runner was `full` with its script finished, so no
  script was orphaned.

[dtn-concepts]: ../../../../../system/servers/execution/runner/DT-networks.md#concepts
[dtn]: ../../../../../system/servers/execution/runner/DT-networks.md
