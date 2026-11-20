# The Runner in Digital Twin Networks

Digital twins (DTs) adapt themselves to changes in their physical
twins, and in a digital twin network (DTN) they must also coordinate
those adaptations with each other. This page explains the concepts of
a DTN that matter to the runner, derives from them the features that
turn the runner into a stateful DT manager able to take part in a DTN,
and records what the runner offered before those features.

## Concepts

### Digital Twin Networks

A DTN is an ensemble of interconnected DTs that exchange information
to address tasks beyond the scope of any single DT. It is typically
operated by a single organisation. This page writes a DTN as
\(N = (P, D, R, I, C)\):

- \(P\), the physical twins (PTs);
- \(D\), the DTs, one per PT;
- \(R \subseteq D \times D\), the relationships between DTs, which capture the
  dependencies and interactions among DTs that mirror those of the
  physical world;
- \(I\), the communication infrastructure, assumed reliable;
- \(C\), the computational resources the DTs share.

DTs join and leave the network at runtime, as PTs come and go. To stay
interoperable, all DTs expose a common communication interface. They
also compete for the shared resources \(C\), so the adaptation of one DT
can degrade the quality of service of others. This is why adaptation is
needed at the level of the network and not only inside each DT.

### Adaptation of a Single DT

A DT \(d_i = (M_i, s_i, K_i, \alpha_i)\) has models \(M_i\), a state \(s_i\), a
set of commands \(K_i\) it can issue to its PT, and an adaptation policy
\(\alpha_i\). It adapts in three ways:

- **model adaptation** recalibrates a model or replaces it;
- **resource adaptation** trades accuracy for computational cost, for
  example by switching between models of different fidelity;
- **application-policy adaptation** changes the rules through which
  the DT decides how to act on its PT.

Adaptation is commonly structured as a MAPE-K loop: Monitor, Analyse,
Plan and Execute over shared Knowledge. In a DT the Monitor step
collects data from the linked PT and from other DTs, and the Execute
step adapts the DT itself rather than controlling the PT. The loop can
itself serve as the adaptation policy \(\alpha_i\).

The state of a DT is \(s_i = (x_i, \lambda_i, \theta_i)\):

- \(x_i\), the state mirrored from the PT;
- \(\lambda_i\), the active local policy, chosen from the DT's _local
  adaptation space_ \(\Lambda_i\);
- \(\theta_i\), the parameters of the shared policy (below) that the DT
  applies.

A local goal \(\gamma_i\) says whether a policy is good enough for the DT. A
DT is _exhausted_ when no policy in \(\Lambda_i\) satisfies \(\gamma_i\). The
adaptation policy maps the state to a _proposal_ \((\lambda', \theta')\):
the local policy and the shared parameters the DT would like next.

### Shared Policies and the Manager

In a DTN, an application policy is often _shared_: its effects, and
often its parameters, span several DTs. The shared policy is
\(\sigma = (\theta_1, \ldots, \theta_n)\). A DT that adapts for its own
good may relieve its own PT at the cost of shifting load onto its
neighbours, so shared policies need coordination. Coordination takes
one of three forms:

- **decentralised**: the DTs coordinate through peer-to-peer
  communication and adapt on the collective knowledge of the network;
- **centralised**: a _Manager_ coordinates the DTs;
- **hybrid**: the Manager gives high-level guidance and the DTs keep
  the low-level adaptation.

The Manager runs a second MAPE-K loop on top of the local loops of the
DTs. It knows the network state \(O = (s_1, \ldots, s_n, R)\), the network
goals \(G\) and the shared policy \(\sigma\). Its Monitor collects the states
and escalations of the DTs, Analyse evaluates \(G\), Plan computes a
_network-level adaptation_ \(u\), and Execute applies it. An adaptation
\(u\) assigns shared-policy parameters from the subset \(\Theta_i^c\) that each
DT exposes, and submits commands from the subset \(K_i^c\) that each DT
exposes. An update writes no local policy. The Manager also keeps a
database of the addresses, locations and identifiers of the DTs.

The Manager is not the _Orchestrator_. An Orchestrator deploys DTs at
runtime, adds and removes them as PTs come and go, negotiates the
limited resources among DTs, and adjusts the fidelity of DTs to the
current load. In DTaaS that role belongs to the platform; the runner is
what it deploys.

### Requirements on a Managed DT

Centralised coordination places four requirements on each DT:

| Requirement             | Statement                                                                                                                                                         |
| :---------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1 Policy observability | Each DT exposes its state, its local policy and the shared-policy parameters it applies; the Manager also knows the relationships among DTs.                      |
| R2 Controllability      | Each DT declares which shared-policy parameters may be changed and which commands the Manager may submit; commands run through the DT's own local policy.         |
| R3 Escalation criterion | An explicit condition decides what is handled at network level, triggered either _endogenously_ or _exogenously_ (below).                                         |
| R4 Preserved autonomy   | Adaptations that are not escalated stay with the DT; the Manager only changes exposed parameters and submits exposed commands, and never replaces a local policy. |

The two triggers of R3 are:

- **endogenous** (\(e_i\)): the DT signals the Manager when it is
  exhausted, or when its proposal needs shared parameters other than
  the ones it has;
- **exogenous** (\(e_M(O)\)): the Manager sees a network goal violated
  in \(O\), or in a forecast of \(O\) within a horizon \(H\), and takes
  responsibility for the adaptation.

Consistent enactment of policy changes across DTs, and stability under
repeated adaptations, are outside these requirements.

### Example: Hospital Bed Management

Several hospitals each have a DT whose state includes the pending
requests to allocate a patient to a bed. The relationships \(R\) are the
distances between hospitals. The shared-policy parameter is the
allocation scope, `single` ward or `multi` ward. The only command
exposed to the Manager is `admit(p)`, which asks a hospital's DT to
allocate patient \(p\) with its own local policy; a hospital may fail to
allocate \(p\), in which case the Manager tries the next one.

On a request, the Manager:

1. submits `admit(p)` to the receiving hospital and then to the others
   by distance, in single-ward scope;
1. if all fail, sets the receiving hospital to multi-ward scope and
   retries;
1. if that fails, does the same for the next hospitals by distance.

A multi-ward placement is a _fallback_. The network goals are to
allocate every patient, avoid fallbacks and keep travel short. A
network is judged by the number of fallbacks, the distribution of
patients over hospitals, the travel distance and a placement score.
The hospital example of the runner's
[state machine guide](../../../../../user/servers/execution/runner/state-machine.md#example-hospital-bed-management)
plays this example with two hospitals.

### Vocabulary Against the Runner

| Symbol or term                           | Meaning                                                       | Runner before these features                                                           |
| :--------------------------------------- | :------------------------------------------------------------ | :------------------------------------------------------------------------------------- |
| \(P\), PT                                | physical twins                                                | Unknown to the runner; scripts talk to the PT.                                         |
| \(D\), DT                                | one DT per PT                                                 | One runner per DT (`docs/state-machine-design.md:192`).                                |
| \(R\)                                    | relationships between DTs                                     | None.                                                                                  |
| \(I\)                                    | communication infrastructure                                  | HTTP, and an MQTT broker when configured.                                              |
| \(C\)                                    | shared compute                                                | The host; placement is the platform's.                                                 |
| \(M_i\)                                  | models                                                        | _Inference_: the scripts and files in `location`.                                      |
| \(s_i\), \(x_i\)                         | state; mirrored PT state                                      | Command history and machine state; no \(x_i\).                                         |
| \(\lambda_i\), \(\Lambda_i\)             | active local policy; local adaptation space                   | _Inference_: the current state; the set of states.                                     |
| \(\theta_i\), \(\Theta_i^c\)             | shared parameters; controllable subset                        | None.                                                                                  |
| \(K_i\), \(K_i^c\)                       | controls; commands the Manager may submit                     | `commands` allowlist; anyone may run any of them.                                      |
| \(\alpha_i\)                             | adaptation policy                                             | `state-machine.yaml` transitions, driven by client events and script exit.             |
| \(\gamma_i\), exhausted, \(e_i\)         | local goal; no policy meets it; endogenous trigger            | None; `no transition` and `$failure` are the nearest observable signals.               |
| \(O\), \(G\), \(\sigma\), \(e_M\), \(u\) | Manager-side knowledge, goals, shared policy, trigger, update | Not the runner's concern, except that \(u\) arrives as parameter updates and commands. |
| MAPE-K                                   | the loop of a DT and of the Manager                           | No loop in the runner; a script may implement one.                                     |
| Orchestrator                             | deploys and removes DTs, allocates resources                  | The DTaaS platform; the runner is what it would deploy.                                |

## Suggestions at a Glance

| #   | Suggestion                               | Group                      | Rationale                                                                   |
| :-- | :--------------------------------------- | :------------------------- | :-------------------------------------------------------------------------- |
| 1   | DT identity and descriptor               | DT-level state & lifecycle | A Manager and peers must name and locate each DT.                           |
| 2   | One state document                       | DTN: centralised           | Each DT exposes its state, policy and shared parameters (R1).               |
| 3   | State change notifications               | Observability              | The Manager's Monitor collects DT states without polling.                   |
| 4   | Declared parameters, controllable subset | DTN: centralised           | A DT declares which shared-policy parameters may be changed (R2).           |
| 5   | Command input, outcome and exposure      | DTN: centralised           | The Manager submits `admit(p)` and needs to know whether it succeeded (R2). |
| 6   | Escalation signal                        | DTN: centralised           | The DT signals the Manager when it is exhausted (R3).                       |
| 7   | Presence: join and leave                 | DTN: decentralised         | DTs join and leave the network at runtime.                                  |
| 8   | Runner context and events for scripts    | Self-adaptation loop       | Lets a script act as the DT's own MAPE-K loop and raise events.             |
| 9   | Persist the machine across restarts      | DT-level state & lifecycle | A DT must remember its policy after a restart.                              |
| 10  | Stop a running script                    | DT-level state & lifecycle | Parameter updates and DT removal need a way to end the current script.      |
| 11  | Richer history and metrics               | Observability              | A Manager judges the network from the outcomes of commands over time.       |
| 12  | Health endpoint                          | Observability              | Liveness for the Manager and the platform.                                  |
| 13  | Peer list and relationships              | DTN: decentralised         | Models the relationships \(R\) between DTs; the runner knew none.           |
| 14  | Machine-readable API description         | API/protocol               | DTs expose a common communication interface; `api/` had request files only. |
| 15  | Access control by role                   | API/protocol               | Define roles for clients and identify Manager-submitted commands.           |
| 16  | React to peer state                      | DTN: decentralised         | Peer-to-peer coordination of DTs, as events raised by peer notifications.   |
| 17  | Resource and fidelity reporting          | Platform/orchestrator      | The Orchestrator trades fidelity for shared compute; needs process metrics. |

## Detailed Suggestions

### 1. DT Identity and Descriptor

**Add.** An `id` in `runner.yaml`, matching the name pattern of states,
and an optional `attributes` map of opaque values (for example the
coordinates of a hospital).

**Why.** The Manager keeps a database of the addresses, locations and
identifiers of the DTs. Several runners can be active at once on one
machine, so a distinct `id` is needed to tell them apart.

### 2. One State Document

**Add.** `GET /state` and `<topic>/state` returning one document for
the whole DT: `id`, the machine's `state`, `status` and `entry`, the
declared parameters (item 4), the last command and its result, and a
timestamp. Let a DT declare an optional `state` script in
`state-machine.yaml` whose JSON on stdout is merged into the document
as the state mirrored from the physical twin (_inference_: the runner
does not know the physical twin, only the scripts do).

**Why.** R1 asks each DT to make its state, its active local policy
and the shared-policy parameters it applies observable to the Manager:
\(s_i = (x_i, \lambda_i, \theta_i)\). Before this feature, `GET /fsm` returned the
machine state, script status and events, and `GET /` the last command
(`src/execa-manager.service.ts:132-142`): the runner knew something
like \(\lambda_i\), but had no \(\theta_i\) and no \(x_i\).

**Size.** M.

### 3. State Change Notifications

**Add.** A notification whenever the machine enters a state or a
script completes, on a notification topic apart from the request
topics, for example `<topic>/notify/state`, retained, so that a Manager
that connects later sees the current state. For HTTP-only deployments,
offer an optional `notify.url` webhook or a server-sent events stream
(decision below).

**Why.** The Manager's Monitor collects the states of the DTs and
reacts to new requests appearing in them. Without notifications it can
only poll every DT.

### 4. Declared Parameters With a Controllable Subset

**Add.** A `parameters` section in `state-machine.yaml`: each parameter
has a type or an enumeration, a default and `controllable: true` or
`false`. Answer `GET /parameters`; accept `PUT /parameters` for
controllable ones only, validated against the declaration; record each
change in the database; hand the current values to every script as
environment variables. Optionally let a parameter declare an event to
raise when it changes, so the machine can react.

**Why.** R2 asks each DT to declare which of its shared-policy
parameters may be changed: each DT exposes a subset
\(\Theta_i^c \subseteq \Theta_i\) that the Manager may assign. R4 says
the Manager never replaces a local policy, so a parameter update must
not rewrite `state-machine.yaml`.

### 5. Command Input, Outcome and Exposure

**Add.** Let `POST /` carry an optional `input` object, validated
against a per-command schema declared in the configuration (or capped
free-form JSON), delivered to the script on stdin rather than as
arguments, and recorded in the history. Return the script's result in
the reply, for example `stdout` or a `result` field, since the caller
of a command needs to know its outcome and not only that it ran. Mark
each command with who may submit it: a `manager` list in the
descriptor names the commands \(K_i^c\) (enforcement needs item 15).

**Why.** R2 lets the Manager submit a subset \(K_i^c \subseteq K_i\) of
commands, which the DT carries out through its active local policy;
the policy fixes any detail the command leaves open. In the hospital
example \(K_i^c = \{\mathit{admit}(p)\}\), which asks the DT to allocate patient
\(p\); a hospital may fail to allocate \(p\), and the Manager then tries
the next one. The Manager therefore depends on the outcome of each
command and on its input, the patient.

### 6. Escalation Signal

**Add.** An outbound escalation, published on `<topic>/notify/escalation`
(QoS 1, not retained) and, for HTTP-only deployments, posted to the
webhook of item 3. Triggers, declared per DT rather than hard coded:
the `$failure` of a state's script; an event for which the current
state has `no transition`, which is the runner's observable form of an
exhausted local adaptation space (_inference_); and an explicit request
from a script (item 8) that may carry a proposal, such as a wanted
parameter value. The payload names the DT, state, event, reason,
proposal and time.

**Why.** R3's endogenous trigger: the DT signals the Manager when its
local adaptation space is exhausted, or when its proposal needs a
change to shared-policy parameters.

### 7. Presence: Join and Leave

**Add.** On connecting to the broker, publish a retained
`<topic>/notify/presence` message with `id`, `online`, the descriptor
and the runner version; register an MQTT Last Will that publishes
`offline` on the same topic; publish `offline` in
`beforeApplicationShutdown` before the client ends.

**Why.** A DTN is an open system: DTs join and leave the network at
runtime while remaining interoperable, and the adaptation process must
handle these changes. Presence messages tell the Manager and the peers
when that happens, and populate the Manager's database of DT addresses.

### 8. Runner Context and Events for Scripts

**Add.** Pass environment variables to every script. Document that a
script may call `POST /fsm/event` on `RUNNER_URL` to raise a declared
event, and `POST /escalate` to escalate. Optionally recognise a line
protocol on stdout, such as `@event stop`, for scripts that cannot make
HTTP calls. A long-running state, say `monitor`, then becomes the
Monitor and Analyse steps of the DT's own loop, and its events the Plan.

**Why.** A DT adapts through its own MAPE-K loop, whose Monitor step
collects data from the PT and from other DTs, and whose Execute step
adapts the DT rather than controlling the PT. In the runner, a script
is the only place such a loop can live. The design document's
assumption A4 read "Events come from clients over HTTP or MQTT. Script
exit is the only event the runner raises by itself"
(`docs/state-machine-design.md:196-197`), and scripts received no
environment (`src/execa-runner.ts:23`). A script could already call the
HTTP API if it knew the port; this item makes the contract explicit
and testable.

**Size.** S; the stdout protocol would make it M.

### 9. Persist the Machine Across Restarts

**Add.** Store the current state, entry number, script status and
parameter values in the SQLite database on each entry and completion,
and load them at startup. Decide the recovery policy: report the state
with status `interrupted` and wait for a transition, or re-enter a
declared `recover` state (open question). Record transitions in the
history as well.

**Why.** R1 makes the DT's policy observable; a DT that forgets \(\lambda_i\)
on restart reports a wrong state. DTs are connected over a network
that may be volatile, so they face intermittent connections, and the
Orchestrator moves and restarts DTs at runtime. The design document's
D12 kept "The machine lives in memory" because "Nothing asks for
recovery after a restart" (`docs/state-machine-design.md:184`); a DTN
does ask for it. `README.md:198-199` documented the loss.

**Size.** M.

### 10. Stop a Running Script

**Add.** Keep the execa subprocess of each run in `ExecaManager` and
add a way to end it: `POST /stop` for the current command, and a
`stop: true` option on a transition that first stops the script of the
current state. Decide whether a stopped script raises `$failure` or a
new completion event such as `$stopped` (open question).

**Why.** A network-level update sets \(\theta_j := \theta_j'\) and makes the DT
carry out commands through its active local policy, which may require
the policy's script to restart with the new value. The Orchestrator
removes DTs and adjusts their fidelity, and a multi-fidelity DT
switches between models of different fidelity; each of these ends a
running computation. The design document's D10 said "The runner can
not cancel a script" (`docs/state-machine-design.md:182`),
`ExecaRunner.run` awaited execa and kept no handle
(`src/execa-runner.ts:20-32`), and `README.md:187-196` asked each DT to
give long states an event out, with a restart as the only other way.

**Size.** M.

### 11. Richer History and Metrics

**Add.** Return the status, the received and finished times, the
duration and (item 5) the input of each command from `GET /history`,
with `since` and `limit` query parameters. Add `GET /metrics` with
counts of commands by status, transitions, completion events and
escalations, and the time spent in each state, in Prometheus text
format or JSON (open question).

**Why.** A network is judged by measures such as the fallbacks,
patient distribution, travel distance and placement score of the
hospital example. Such measures come from the outcomes of DT commands
over time, which a Manager can only compute if each DT keeps them with
timestamps. Anomaly monitoring and system state estimation are also
common functions of a DTN. The runner's table already stored
`received_at` and `finished_at` (`src/queue.service.ts:18-19`), but the
history returned names only (`src/queue.service.ts:111-116`,
`README.md:314-331`).

**Size.** S for the history, M for metrics.

### 12. Health Endpoint

**Add.** `GET /health` with the runner status, uptime, whether the MQTT
client is connected, whether a state machine is loaded and whether the
database is open; `<topic>/health` over MQTT.

**Why.** The Manager's Monitor must distinguish a silent DT from a
dead one. Robustness is a concern of every DTN, since DTs share a
possibly volatile network and a centralised Manager is a single point
of failure. The Orchestrator, which deploys DTs at runtime, needs a
liveness check for the same reason. The runner had none.

**Size.** S.

### 13. Peer List and Relationships (R)

**Add.** A `peers` section in the configuration: each peer has an `id`,
an HTTP `url` or an MQTT `topic`, and an `attributes` map (for example
`distance`). Answer `GET /peers`, and give the list to scripts as a
JSON file named in `DT_PEERS`. Later, discover peers from their
presence messages (item 7), which needs a shared base topic convention.

**Why.** The Manager sees the network state \(O = (s_1, \ldots, s_n, R)\),
and R1 says it knows the relationships among DTs. In the hospital
example \(R\) is the distances between hospitals, which drive the order
in which the Manager tries them. More generally, \(R \subseteq D \times D\) captures
the dependencies and interactions among DTs that mirror those of the
physical world. In decentralised coordination the DTs talk to each
other directly to share data and coordinate their adaptation. The
runner had no notion of another runner; assumption A1 is "One runner
serves one DT" (`docs/state-machine-design.md:192`).

**Size.** M.

### 14. Machine-Readable API Description

**Add.** An OpenAPI 3 document for the HTTP API and an AsyncAPI document
for the MQTT topics in `api/`, kept in step with the controllers by a
test, and served at `GET /openapi.json`. The descriptor of item 1 links
to them.

**Why.** All DTs of a DTN expose a common communication interface over
standard data and protocol interfaces (W3C standards, RFCs), and
standards such as the Digital Twins Definition Language can form a
basis for standardised adaptation. DT ecosystems offer external
consumers an interface to interact with DTs and discover their
relationships. The runner's `api/` directory held httpYac request files
and a README (`api/README.md:1-9`); there was no OpenAPI or AsyncAPI
document, although the API was documented in prose in
`README.md:233-486`.

**Size.** M.

### 15. Access Control by Role

**Add.** Optional bearer tokens (or mutual TLS) for HTTP with two roles,
`manager` and `client`, and a documented mapping to broker ACLs for
MQTT. The `manager` role alone may call `PUT /parameters` (item 4) and
the commands listed as \(K_i^c\) (item 5).

**Why.** An open network of DTs needs protection against external
malevolent parties and against malevolent DTs introduced into the
network, and trust between DTs. R2 separates the commands and
parameters open to the Manager from the rest, which needs the runner to
know who is calling. The design document's A8 read "Anyone who can call
the API can drive the machine" (`docs/state-machine-design.md:205-207`),
and `README.md:482-486` left access control to the network and the
broker.

**Size.** M.

### 16. React to Peer State

**Add.** A `subscriptions` section in `state-machine.yaml` that maps a
peer notification to a local event, for example "when peer `hospital-2`
reports state `full`, raise `neighbour-full`". The runner subscribes to
the `notify/state` topic of each named peer (items 3 and 13) and raises
the event through the existing `event` path, with rate limiting against
notification storms.

**Why.** In decentralised coordination the DTs coordinate their
adaptation through peer-to-peer communication, adapting on the
collective knowledge of the network rather than on a Manager's
decisions. Comparing the centralised Manager with decentralised and
hybrid variants needs both to be possible. Events are what already
moves a DT in the runner, so a peer's change raised as an event is
one way to express peer-to-peer coordination without a new channel
(_inference_). The runner subscribed only to its own request topics
(`src/mqtt/mqtt.service.ts:52-54`, `62`).

**Size.** L.

### 17. Resource and Fidelity Reporting

**Add.** Measure the CPU time, memory and duration of each script run
and include them in the history and metrics; let a DT declare a
`fidelity` parameter that scripts read. Child process metrics need a
dependency or platform-specific reads, so this is a design of its own.

**Why.** DTs compete for the computational resources of the shared
infrastructure, which is one reason a DTN adapts at the network level.
Resource adaptation trades accuracy for computational cost by
switching between models of different fidelity, and the Orchestrator
adjusts the fidelity of DTs to the current needs and constraints of the
network. Both need to see what each DT uses. Placement and scheduling
of DTs are the platform's, not the Manager's, so this is the lowest
priority.

**Size.** L.

## The Runner Before These Features

Before the features above, the runner was a NestJS service that ran the
permitted scripts of one `location` folder, kept their history in SQLite and
served one API over HTTP and, optionally, MQTT (`README.md:3-11`). It was
version `0.4.0` (`src/config/commander.ts:7`, `package.json:3`) and described
itself as "Remote code execution for humans" (`src/config/commander.ts:19`).

### API Surface

| HTTP                   | MQTT request topic   | Body                  | Handler                           |
| :--------------------- | :------------------- | :-------------------- | :-------------------------------- |
| `POST /`               | `<topic>/execute`    | `{"name": "create"}`  | `src/app.controller.ts:31-45`     |
| `GET /`                | `<topic>/status`     | ignored               | `src/app.controller.ts:47-50`     |
| `GET /history`         | `<topic>/history`    | ignored               | `src/app.controller.ts:26-29`     |
| `POST /fsm/transition` | `<topic>/transition` | `{"state": "create"}` | `src/fsm/fsm.controller.ts:40-50` |
| `POST /fsm/event`      | `<topic>/event`      | `{"event": "stop"}`   | `src/fsm/fsm.controller.ts:52-62` |
| `GET /fsm`             | `<topic>/fsm`        | ignored               | `src/fsm/fsm.controller.ts:30-38` |

The MQTT routes are listed in `src/mqtt/mqtt.config.ts:24-31` and
answered by `src/mqtt/mqtt-request.handler.ts:35-52` with the same JSON
as HTTP. Replies go to the MQTT 5 response topic of the request or to
`<topic>/<route>/response` (`src/mqtt/mqtt.service.ts:140-150`).
Retained requests are ignored (`src/mqtt/mqtt.service.ts:118-121`). An
`Idempotency-Key` header or MQTT 5 user property makes a repeated
request return the earlier reply (`src/execa-manager.service.ts:40-62`;
`src/fsm/fsm.service.ts:89-105`, with the last 256 keys,
`src/fsm/recent-replies.ts:11`). Nothing is published without a
request.

### State Machine Today

`state-machine.yaml` in `location` declares `events` and `states`, each
state a permitted script with a map of event to next state
(`src/fsm/definition.ts:38-47`). Names match
`^[A-Za-z0-9][\w.-]{0,63}$` (`src/fsm/definition.ts:23`). Validation
refuses an unpermitted state, an undeclared target or event, and a
cycle of `$success`/`$failure` transitions
(`src/fsm/definition.ts:85-131`). The machine is a current state and an
entry counter in memory (`src/fsm/state-machine.ts:7-9`). A transition
request is accepted only when idle (`src/fsm/fsm.service.ts:61-71`);
an event follows the current state's transition
(`src/fsm/fsm.service.ts:73-84`); entering a state starts its script
and replies `accepted` at once (`src/fsm/fsm.service.ts:119-127`); on
exit the runner raises `$success` or `$failure` for the same entry only
(`src/fsm/fsm.service.ts:129-140`). Leaving a state does not stop its
script, and a running target state is refused
(`src/fsm/fsm.service.ts:120-122`). Reply statuses and HTTP codes are in
`src/dto/fsm.dto.ts:14-24`. Requests stop in `beforeApplicationShutdown`
(`src/fsm/fsm.service.ts:45-47`).

### Execution and History

`ExecaManager.newCommand` refuses or joins repeated requests, then
`execute` checks the allowlist and runs `join(location, name)` through
`RunnerFactory` (`src/execa-manager.service.ts:98-106`). On Windows the
factory runs `powershell.exe -File <name>.ps1`
(`src/runner-factory.service.ts:8-22`). `ExecaRunner.run` awaits
`execa(command, args)` with no arguments, environment, stdin or
timeout, and turns any error into `false` (`src/execa-runner.ts:20-32`).
The result is `[success, logs]` (`src/interfaces/command.interface.ts:4`).
`Queue` keeps a `commands` table with status, logs and timestamps and a
`request_keys` table (`src/queue.service.ts:11-26`), in memory unless
`database` names a file (`src/queue.service.ts:54-62`); the history is
the list of names (`src/queue.service.ts:111-116`) and the status is the
latest row (`src/queue.service.ts:118-122`).

### Configuration Today

`runner.yaml` has `port`, `location`, `commands`, and optional
`database` and `mqtt` (`src/config/config.interface.ts:9-21`,
`config/runner.yaml.sample`). Only `mqtt` is schema-checked
(`src/config/configuration.service.ts:27-40`, schema in
`src/mqtt/mqtt.config.ts:12-20`). Startup order: configuration, state
machine, database, shutdown hooks, MQTT, HTTP (`src/main.ts:22-31`).

### Single DT, and What Is Missing for a Network

The runner serves one DT: one script folder, one machine
(`docs/state-machine-design.md:192`, `README.md:9`). Measured against the
[requirements on a managed DT](#requirements-on-a-managed-dt) and the other
concepts above, it lacked: an identity; a state document with mirrored state and
shared parameters (R1); declared, settable parameters and commands with input
(R2); any outbound signal, so no escalation (R3), no state notifications and no
presence; knowledge of peers or relationships; a way to stop a script;
persistence of the machine; metrics beyond the command names; and a
machine-readable interface description.

## Open Questions and Design Decisions

1. **Effect of a parameter change.** Apply at the next script start,
   raise a declared event, or stop and restart the current script.
   Consistent enactment of policy changes across DTs is outside the
   requirements.
1. **What "exhausted" means for a script-based DT.** It is defined
   through the local goal \(\gamma_i\), which the runner cannot evaluate.
   Candidates: an event with no transition, `$failure` with no
   transition, or an explicit call from the script.
1. **Trust and multi-tenancy.** How a Manager authenticates to many
   runners of many users, and whether the DTaaS gateway or the runner
   enforces roles.
1. **Command input delivery.** stdin JSON, environment variables or
   both; size limits; PowerShell parity on Windows.
1. **Recovery after restart.** Resume the stored state, mark it
   `interrupted`, or run a declared recovery state.
1. **Script-raised events.** A stdout protocol lets any script flood
   the machine with events; the HTTP path can be rate limited and, with
   item 15, authenticated.
