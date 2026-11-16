# Hospital Bed Management Demo

A terminal recording of the features of the runner, told as a
hospital bed-management example of a digital twin network: each
hospital's DT allocates patients to beds with its own local policy, and
a DT Manager coordinates the hospitals through a shared allocation
scope, `single` ward or `multi` ward, trying other hospitals by
distance when one cannot admit a patient.
Two runners manage the digital twins (DTs) of two hospitals,
`hospital-1` and `hospital-2`, which are peers of each other; the
person at the terminal plays the DT Manager of the network.

The recording is two [asciicast v2](https://docs.asciinema.org/manual/asciicast/v2/)
files on one clock, which end together:

- [demo-windows-manager.cast](demo-windows-manager.cast), the
  Manager's terminal, which types to both runners;
- [demo-windows-network.cast](demo-windows-network.cast), the
  notifications of both DTs as an MQTT subscriber to
  `dtaas/+/notify/+` receives them, one line each.

Each is about 6 min 23 s long; the Manager's has about 88 kB, the
network's about 9 kB. [demo-windows.mp4](demo-windows.mp4) shows the
two side by side, the Manager on the left (H.264, 1966×918, about
5 MB, stored in Git LFS). Both were recorded on Windows against runner
version 0.10.0 (`feature/distributed-demo` at `0885d759`), with access
control and signed notifications on. The same story recorded on Linux, with the
scripts running as a second account (`scripts.user`), is to follow as
`demo-linux-*`.

## Play

Open `demo-windows.mp4` in any video player, or play a cast in a
terminal, the two in two terminals side by side:

```bash
asciinema play demo-windows-manager.cast
asciinema play demo-windows-network.cast
```

Or in a web page, with
[asciinema-player](https://docs.asciinema.org/manual/player/):

```html
<div id="manager"></div>
<div id="network"></div>
<script src="asciinema-player.min.js"></script>
<script>
  for (const pane of ['manager', 'network']) {
    AsciinemaPlayer.create(
      `demo-windows-${pane}.cast`,
      document.getElementById(pane),
    );
  }
</script>
```

Each cast has a marker at each section, so the player can jump between
them.

## Scenario

`hospital-1` and `hospital-2`, both in Aarhus and 12.4 km apart, have
two wards each, cardiology and maternity. Each runner reads its own
configuration, [runner.yaml](runner.yaml) and
[runner-2.yaml](runner-2.yaml), which list the other hospital under
`peers` with a `distance` attribute. Their state machines,
[hospital.fsm.yaml](hospital.fsm.yaml) and
[hospital-2.fsm.yaml](hospital-2.fsm.yaml), have three states, each
running the script of the same name in [scripts](scripts):

| State    | Script       | Meaning                                                                                      |
| :------- | :----------- | :------------------------------------------------------------------------------------------- |
| `open`   | `open.ps1`   | Admits patients; logs where overflow goes, samples the beds and raises `full` when none free |
| `full`   | `full.ps1`   | No free bed; succeeds when a peer is open to take overflow, else fails, which escalates      |
| `closed` | `closed.ps1` | Admits nobody                                                                                |

The two files differ in two places only: `hospital-2` has `capacity` 1,
one bed per ward, so two admissions fill it, and only `hospital-1` has
`subscriptions`. These raise `neighbour-full` when `hospital-2`
reports state `full`, and `neighbour-down` when it goes offline. Both
events are `stop: true` self-transitions of `open`, so its script
starts again and logs the new place for overflow. `open` and `full`
read that place from `GET $RUNNER_URL/peers`: the nearest peer that is
online and in state `open`, or none.

The Manager submits two commands, declared under `manager.commands`:

- `admit` with input `{"patient": "p-1", "ward": "cardiology"}` on
  stdin. Under scope `single` the patient goes to the requested ward
  only; under `multi`, to any ward with a free bed. Without a bed the
  script escalates with a proposal of scope `multi` and exits 3.
- `discharge` with input `{"patient": "p-1"}`, which frees the bed and
  raises `beds-free`.

Three parameters are declared:

- `scope` is the shared-policy parameter θ ∈ {single, multi} of the
  network, controllable by the Manager; changing it raises
  `scope-changed`, a `stop: true` self-transition that restarts `open`.
- `capacity`, the beds per ward, is declared but not controllable.
- `fidelity`, of values `low`, `medium` and `high`, follows the
  [fidelity convention](../../STATE-MACHINE.md#pattern-fidelity):
  `open` samples the beds every `POLL_MS` milliseconds times 4, 1 or
  0.2, and `fidelity-changed` restarts it, so the Manager trades the
  freshness of the DT against the CPU time that the runner reports.

## Sections

The times are those of the casts and of the video.

| Time | Section                                       | Features                                                                                                         |
| ---: | :-------------------------------------------- | :--------------------------------------------------------------------------------------------------------------- |
| 0:00 | Setup                                         | `runner.yaml` with `peers`, the keys and `auth` that `record.mjs` adds, both state machines, shell helpers       |
| 0:37 | Presence: online                              | Both runners start; signed online notices and first state documents, verified by the subscriber (right)          |
| 0:56 | Descriptor, health and access control         | `GET /dt` with `peers` and `publicKey`; `GET /health` with `scripts: null`; `401` unsigned; `403` by role        |
| 1:16 | Signed output                                 | MQTT `dt` response verified with the runner's public key                                                         |
| 1:23 | State machine and script context              | `POST /fsm/transition`; `DT_*`, `RUNNER_URL`, declared `env`, fidelity; `GET /peers` from a script; `GET /state` |
| 1:46 | Peers                                         | `GET /peers` with the peer's descriptor and state; `PUT /peers` refused                                          |
| 1:59 | Command input and request keys                | `POST /` with input on stdin; replayed key; `409` for input to a running command                                 |
| 2:29 | Failed command and explicit escalation        | `failed` with exit code 3; `POST /escalate` from a script; `GET /` with `resources`                              |
| 2:57 | Parameters and fidelity                       | `GET`/`PUT /parameters`, MQTT `set-parameters`; refused non-controllable; `fidelity` restart; history figures    |
| 3:36 | Peer event: neighbour full                    | `hospital-2` fills up over MQTT and HTTP; its `full` succeeds; `neighbour-full` restarts `open`                  |
| 4:03 | Script raises an event; escalation on failure | `full` raised over HTTP; `full` finds no open peer; `$failure` without a transition escalates                    |
| 4:29 | Escalation on no transition                   | `409 no transition`, escalated once per entry                                                                    |
| 4:46 | MQTT request/response with input              | MQTT `execute` and `fsm`, verified                                                                               |
| 4:59 | Disable and enable a peer                     | `PUT /peers`; the retained `full` counts again after the enable                                                  |
| 5:20 | Peer event: neighbour down                    | The runner of `hospital-2` is killed; its will raises `neighbour-down`                                           |
| 5:36 | History and metrics                           | `GET /history` with `since` and `limit`, `by` of each record; `GET /metrics` with `resources`                    |
| 5:52 | Stop                                          | `POST /stop`; `stopGrace`; `$stopped` transition                                                                 |
| 6:08 | Webhook                                       | Every notification of both DTs also posted to the webhook, verified                                              |
| 6:13 | Presence: offline                             | Graceful shutdown; the retained state and presence of both DTs, the will among them                              |

## Assumptions

- Two hospital DTs; the other DTs of the network and the Manager's
  allocation algorithm are out of scope. The terminal user acts as the
  Manager and as the operator of both runners.
- Each hospital keeps its beds in `run/<id>/ward.json`, a stand-in for
  the hospital's information system, and its scripts log to
  `run/<id>/ward.log`.
- A patient the hospital cannot take is refused by `admit` (exit 3)
  rather than queued; the escalation carries the proposal a managed
  DT sends when it needs a shared parameter changed (scope `multi`).
- The broker is a local aedes broker on port 18830 (MQTT 3.1.1), and the
  webhook is a local receiver on port 18080; both only log what they
  receive. Both runners use them.

## Record Again

From `servers/execution/runner`, after `yarn install` and `yarn build`:

```bash
node demo/hospital/tools/record.mjs
node demo/hospital/tools/check-cast.mjs
```

`record.mjs` starts the broker, subscriber and webhook receiver
([tools/services.mjs](tools/services.mjs)) and both runners
([tools/runner.mjs](tools/runner.mjs)), plays the steps of
[tools/steps.mjs](tools/steps.mjs) and
[tools/steps-peers.mjs](tools/steps-peers.mjs) in Git Bash (`DEMO_BASH`
overrides the shell) with real output and simulated typing, and writes
`demo-windows-manager.cast` and `demo-windows-network.cast`, or
`demo-linux-*` on Linux. A recording takes about three minutes on
Windows, as each PowerShell script needs seconds to start. Everything
the run writes goes to `run/`, which git ignores; `run/transcript.txt`
has each command with its output, and `run/notify.jsonl` each
notification as it came. `check-cast.mjs` checks every pair of casts
in the folder: valid asciicast v2, times that never go back, and the
same height and end time for the two casts of a pair.

The casts share one clock ([tools/clock.mjs](tools/clock.mjs)).
Typing and narration move it by set amounts, and commands and waits by
the real time they took. The subscriber writes the real time at which
each notification arrived, which the clock turns into a time of the
network cast. Gaps longer than 2 s are then shortened in both casts
together, so that they stay in step and end at the same time.

On Linux the runner starts the state scripts by their bare names, so it
needs shell versions of the `.ps1` scripts in `scripts/`, which the
Linux recording adds.

### Keys, Access Control and Signatures

`record.mjs` writes new key pairs into `run/keys/` with
[tools/keygen.mjs](tools/keygen.mjs), so that no private key is
committed: `alice` (role `client`), `manager-1` (role `manager`), and
one key of each runner. It then writes `runner.auth.yaml` and
`runner-2.auth.yaml`, git-ignored, which are `runner.yaml` and
`runner-2.yaml` with the peer's `publicKey` appended to the peer's
entry, which is last in each file, and an `auth` section: `key`, the
runner's signing key, and `principals`, alice and manager-1.

[tools/sign.mjs](tools/sign.mjs) signs each request: `dt1`, `dt2` and
the waits as `alice`, `mq1` and `mq2` as `manager-1`; `DT_AS` names
another principal, and one without a key file, such as `DT_AS=nobody`,
sends the request unsigned. `DT_ID` names the runner, and
[tools/settings.mjs](tools/settings.mjs) gives its address and base
topic.

The subscriber and webhook receiver of
[tools/services.mjs](tools/services.mjs) and `mq` mark each message
with [tools/jws.mjs](tools/jws.mjs): `verified` for a JWS that the
public key of its DT, `run/keys/<id>.pub`, checks, `UNSIGNED` for plain
JSON, and `INVALID` for one that fails or that no public key can check.
An `INVALID` line gives the reason (no key file, unreadable key file,
malformed, wrong `alg` or `kid`, bad signature) and the payload as it
came, marked unverified, instead of the summary
([tools/summary.mjs](tools/summary.mjs)).

To try a runner by hand after a recording, start the services and the
runners from this folder; `run/keys/` and the two `*.auth.yaml` files
stay until the next recording:

```bash
node tools/services.mjs &
node tools/runner.mjs -c runner.auth.yaml &
node tools/runner.mjs -c runner-2.auth.yaml &
source tools/shell.sh
dt1 /peers
```

`touch run/shutdown` shuts down gracefully the runners that watch for
it, as Ctrl+C would; the first runner that sees the file removes it.

## Convert to MP4

asciinema has no video output, so [tools/to-mp4.sh](tools/to-mp4.sh)
renders each cast as a GIF with [agg](https://github.com/asciinema/agg)
and joins the two side by side with ffmpeg's `hstack`. It runs on
Linux or in WSL. Install the tools once; the release binaries of
asciinema and agg need no root:

```bash
mkdir -p ~/.local/bin && cd ~/.local/bin
base=https://github.com/asciinema
musl=x86_64-unknown-linux-musl
curl -fsSL -o asciinema \
  "$base/asciinema/releases/download/v3.2.1/asciinema-$musl"
curl -fsSL -o agg "$base/agg/releases/download/v1.9.0/agg-$musl"
chmod +x asciinema agg
sudo apt-get install ffmpeg # or any ffmpeg build with libx264
```

The script looks in `~/.local/bin` before the `PATH`. Then, from this
folder (in WSL, under `/mnt/c/...`):

```bash
bash tools/to-mp4.sh windows # or linux
```

It checks each cast with `asciinema convert`, writing its plain-text
transcript to `run/demo-windows-*.txt`, renders `run/demo-windows-*.gif`
at font size 16 with an idle limit of 60 s, so that agg keeps the gaps
as `record.mjs` set them, and writes `demo-windows.mp4` with libx264 at
CRF 32. The conversion took 14 minutes in WSL under `/mnt/c`, most of it in
agg.
