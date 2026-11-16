# Runner API

The runner serves one digital twin (DT) and answers the same requests
over HTTP and over MQTT. This document lists every route of both, with
the request, the reply and the status of each outcome, and the
notifications that the runner sends on its own. It is the reference for
a DT Manager, a script or any other client of the runner.

The examples come from the
[hospital bed-management demo](../demo/hospital/README.md). Most are
requests typed in its recording on Windows against version 0.10.0,
with the replies that the runner gave, so the values fit together from
one example to the next; the notifications are those that its MQTT
subscriber received in the same run, decoded. The text says where an
example comes from elsewhere. The
[Example Session](#example-session) at the end retells the recording as
one story.

## The Demo Setup

The demo runs two runners, of the hospitals `hospital-1` and
`hospital-2` in Aarhus, which are [peers](#peers) of each other. Each
has two wards, cardiology and maternity, of two beds at `hospital-1`
and one at `hospital-2`. Most examples ask `hospital-1`, whose
configuration, [demo/hospital/runner.yaml](../demo/hospital/runner.yaml),
gives the addresses that the examples use:

| Setting            | `hospital-1`                                   | `hospital-2`               |
| :----------------- | :--------------------------------------------- | :------------------------- |
| HTTP base URL      | `http://localhost:5100`                        | `http://localhost:5200`    |
| MQTT broker        | `mqtt://127.0.0.1:18830`, MQTT 3.1.1           | the same                   |
| MQTT base topic    | `dtaas/hospital-1`                             | `dtaas/hospital-2`         |
| Webhook            | `http://127.0.0.1:18080/dt-events`             | the same                   |
| Permitted commands | `open`, `full`, `closed`, `admit`, `discharge` | the same                   |
| Manager commands   | `admit`, `discharge`                           | the same                   |
| Peers              | `hospital-2`, 12.4 km away                     | `hospital-1`, 12.4 km away |

The state machine,
[demo/hospital/hospital.fsm.yaml](../demo/hospital/hospital.fsm.yaml), has
three states, `open`, `full` and `closed`, each running the script of
the same name. It declares the events `full`, `beds-free`,
`scope-changed`, `fidelity-changed`, `close`, `reopen`,
`neighbour-full` and `neighbour-down`, and three parameters: `scope`,
of values `single` and `multi`, which the Manager controls; `capacity`,
which the Manager may read only; and `fidelity`, of values `low`,
`medium` and `high`, which sets how often `open` samples the beds. Its
subscriptions raise `neighbour-full` when `hospital-2` is `full` and
`neighbour-down` when it goes offline. The scripts run on Windows in
PowerShell, so their output ends lines with `\r\n`.

The demo runs with [access control](#access-control) and
[signatures](#signatures): each runner lists the principals `alice`
(role `client`) and `manager-1` (role `manager`), signs its output with
its own key, and lists the other's public key with the peer. In the
recording, `dt1 PATH [CURL OPTIONS]` is `curl -s` against
`http://localhost:5100`, signed as `alice`, which prints the reply and
then its HTTP status; `dt2` is the same for `hospital-2`. The examples
below show the plain `curl` command instead, with
`-H "Authorization: Bearer $JWS"`, where `$JWS` is a token for that
request, which the demo's
[tools/sign.mjs](../demo/hospital/tools/sign.mjs) makes (see
[Token](#token)). `--json` (curl 7.82 or later) sends a POST with the
given body as `application/json`; with an older curl, write
`-H 'Content-Type: application/json' -d '<body>'`, and add `-X PUT` for
a PUT. `mq1 ROUTE [JSON]` and `mq2` publish an MQTT request, signed as
`manager-1`, and print the response, as described in [MQTT](#mqtt).

## Routes

Every HTTP route has an MQTT route of the same meaning. An MQTT request
is published on `<topic>/<route>`, where `<topic>` is the `mqtt.topic`
of the configuration.

| HTTP                   | MQTT route       | Request body                        | Success |
| :--------------------- | :--------------- | :---------------------------------- | :------ |
| `GET /dt`              | `dt`             |                                     | 200     |
| `GET /state`           | `state`          |                                     | 200     |
| `GET /health`          | `health`         |                                     | 200     |
| `GET /metrics`         | `metrics`        |                                     | 200     |
| `POST /`               | `execute`        | `{"name": "admit", "input": {...}}` | 200     |
| `GET /`                | `status`         |                                     | 200     |
| `GET /history`         | `history`        | none; query `since`, `limit`        | 200     |
| `POST /stop`           | `stop`           | `{"name": "open"}` or none          | 200     |
| `POST /fsm/transition` | `transition`     | `{"state": "open"}`                 | 202     |
| `POST /fsm/event`      | `event`          | `{"event": "close"}`                | 202     |
| `GET /fsm`             | `fsm`            |                                     | 200     |
| `GET /parameters`      | `parameters`     |                                     | 200     |
| `PUT /parameters`      | `set-parameters` | `{"scope": "multi"}`                | 200     |
| `POST /escalate`       | `escalate`       | `{"reason": "...", "proposal": {}}` | 202     |
| `GET /peers`           | `peers`          |                                     | 200     |
| `PUT /peers`           | `set-peers`      | `{"hospital-2": false}`             | 200     |

With access control, each route is open to some roles only; see
[Roles](#roles).

The runner also sends [notifications](#notifications): its state
document whenever it changes, escalations to the Manager, and its
presence when it joins and leaves. They go to MQTT and to a webhook,
when the configuration has them.

## Conventions

These rules hold for every route.

- **Bodies.** Requests and replies are JSON. A request with a body
  sends `Content-Type: application/json`. A body over 100 kB is refused
  with HTTP status 413 by the JSON parser of the HTTP server, before
  any other check.
- **Validation error.** A body that does not fit the route, such as a
  `POST /` without a `name`, gets HTTP status 400 and this reply:

  ```json
  {
    "message": "Validation Failed",
    "error": "Bad Request",
    "statusCode": 400
  }
  ```

- **Outcome in the body.** A reply that reports an outcome names it in
  a `status` field, such as `{"status": "command running"}`, as well as
  in the HTTP status, since MQTT has no status codes. An error reply
  carries `statusCode` instead.
- **Request keys.** `POST /`, `POST /fsm/transition`,
  `POST /fsm/event` and `POST /escalate` take an optional
  `Idempotency-Key` header, of up to 255 characters, so that a repeated
  request does not act twice. See
  [Repeated Requests](#repeated-requests). A longer key gets the
  validation error.
- **Times.** Times are ISO 8601 in UTC, such as
  `2026-10-27T19:19:50.732Z`. The times of commands are stored to the
  second, so their milliseconds are `000`.
- **Unexpected errors.** An unexpected failure gets HTTP status 500
  with `{"statusCode": 500, "message": "Internal server error"}`, over
  MQTT too.
- **Credentials.** With `auth.principals` in the configuration, a
  request without a valid credential gets 401 and a caller whose role
  may not call the route 403, before the body is validated; see
  [Access Control](#access-control). Without it, the runner ignores any
  `Authorization` header.

## Digital Twin

Four routes tell who the DT is, what state it is in, whether the
runner is alive, and what it did since it started.

### GET /dt

Describes the DT from the configuration. MQTT route: `dt`.

```bash
curl -s http://localhost:5100/dt -H "Authorization: Bearer $JWS"
```

`200`:

```json
{
  "id": "hospital-1",
  "attributes": {
    "name": "Hospital 1",
    "city": "Aarhus",
    "latitude": 56.19,
    "longitude": 10.17,
    "wards": 2
  },
  "commands": ["open", "full", "closed", "admit", "discharge"],
  "stateMachine": true,
  "manager": { "commands": ["admit", "discharge"] },
  "peers": ["hospital-2"],
  "publicKey": "NC6o1XrrDbF0Kta1gISss-R6v1IgC8zg0OUOWy7Jr3Y"
}
```

| Field          | Meaning                                                                                                      |
| :------------- | :----------------------------------------------------------------------------------------------------------- |
| `id`           | the identity of the DT, `id` in the configuration                                                            |
| `attributes`   | the `attributes` of the configuration; `{}` without any                                                      |
| `commands`     | the permitted commands, which `POST /` may run                                                               |
| `stateMachine` | whether a state machine file is loaded                                                                       |
| `manager`      | the `manager.commands` of the state machine file; the commands meant for the Manager, a subset of `commands` |
| `peers`        | the ids of the enabled [peers](#peers), in the order of the configuration; `[]` without any                  |
| `publicKey`    | the public key that verifies the runner's [signatures](#signatures); `null` without `auth.key`               |

### GET /state

Returns the whole state of the DT in one document, with status 200
whether or not a state machine is loaded. MQTT route: `state`. This is
the document of the [state notifications](#state-notifications).

After the first transition of the demo, into `open`:

```bash
curl -s http://localhost:5100/state -H "Authorization: Bearer $JWS"
```

`200`:

```json
{
  "id": "hospital-1",
  "time": "2026-10-27T19:19:50.732Z",
  "machine": {
    "state": "open",
    "status": "running",
    "entry": 1,
    "events": [
      "beds-free",
      "close",
      "fidelity-changed",
      "full",
      "neighbour-down",
      "neighbour-full",
      "reopen",
      "scope-changed"
    ]
  },
  "parameters": { "scope": "single", "capacity": 2, "fidelity": "medium" },
  "command": {
    "name": "open",
    "status": "running",
    "receivedAt": "2026-10-27T19:19:44.000Z",
    "finishedAt": null
  }
}
```

Before the first transition, `machine` is
`{"state": null, "status": "none", "entry": 0, "events": [...]}` and
`command` is `null`, as in the first
[state notification](#state-notifications).

| Field        | Meaning                                                                  |
| :----------- | :----------------------------------------------------------------------- |
| `id`         | the identity of the DT                                                   |
| `time`       | the time the document was built                                          |
| `machine`    | the reply of [GET /fsm](#get-fsm), or `null` without a state machine     |
| `parameters` | the value of each [parameter](#parameters); `{}` without a state machine |
| `command`    | the latest command, or `null` before the first one                       |

`command` has the `name` of the command, its `status`, `receivedAt` and
`finishedAt`. Its status is `running` until the script finishes, then
`valid`, `failed`, `invalid`, `stopped` or `interrupted`, as in
[GET /](#get-). `finishedAt` is `null` while it runs. While `admit`
runs in state `open`, for example, the document has:

```json
{
  "machine": { "state": "open", "status": "running", "entry": 1 },
  "command": {
    "name": "admit",
    "status": "running",
    "receivedAt": "2026-10-27T19:19:58.000Z",
    "finishedAt": null
  }
}
```

The latest command may be one of `POST /` while the script of the state
machine runs, as here; `machine.status` tells the status of the script
of the state. The logs of a command are on [GET /](#get-) only.

### GET /health

Tells whether the runner answers and whether its connections are up.
It is a liveness check only: it does not tell whether the DT does its
job. MQTT route: `health`.

```bash
curl -s http://localhost:5100/health
```

`200`:

```json
{
  "status": "ok",
  "uptime": 13,
  "mqtt": "connected",
  "database": "file",
  "scripts": null
}
```

The demo runs on Windows, where the runner refuses `scripts.user`, so
`scripts` is `null`; a Linux runner with that setting answers
`"scripts": { "user": "dt-script" }`.

| Field      | Values                                                                                      |
| :--------- | :------------------------------------------------------------------------------------------ |
| `status`   | `degraded` while `mqtt` is `disconnected`, else `ok`                                        |
| `uptime`   | whole seconds since the runner started                                                      |
| `mqtt`     | `connected`; `disconnected`, also while it reconnects; `disabled` without an `mqtt` section |
| `database` | `file` with a `database` file in the configuration, else `memory`                           |
| `scripts`  | `{ "user": <name> }` with `scripts.user`, the script account's name; else `null`            |

The reply is `200` in both cases. The runner connects to the broker
after it starts, so the first replies may say `degraded`. Over MQTT the
runner answers only while it is connected, so the reply always says
`connected`; that a reply arrives at all tells that the runner is
alive.

### GET /metrics

Counts what the runner did since it started. MQTT route: `metrics`.

```bash
curl -s http://localhost:5100/metrics -H "Authorization: Bearer $JWS"
```

`200`, in the section History and Metrics of the demo, after
`hospital-2` went offline (see the [Example Session](#example-session)):

```json
{
  "since": "2026-10-27T19:19:12.448Z",
  "uptime": 166,
  "commands": {
    "valid": 6,
    "failed": 2,
    "stopped": 5,
    "invalid": 0,
    "interrupted": 0,
    "running": 1
  },
  "resources": {
    "open": { "cpuSeconds": 13.546, "peakRssBytes": 105103360, "processes": 2 }
  },
  "machine": {
    "entries": { "open": 7, "full": 1 },
    "seconds": { "open": 118.519, "full": 15.093 },
    "completions": { "$success": 0, "$failure": 1, "$stopped": 0 },
    "transitions": { "requested": 1, "accepted": 1 },
    "events": { "requested": 9, "accepted": 7, "noTransition": 2 }
  },
  "escalations": { "request": 1, "failure": 1, "no-transition": 1 }
}
```

The fourteen commands are seven runs of `open`, five of `admit`, one
of `discharge` and one of `full`. Only the runs of `open` were
measured: on Windows the other scripts ended before their first sample,
as in [POST /](#post-).

- `since` is when the runner process started, and `uptime` the whole
  seconds since then, as on [GET /health](#get-health). A restart sets
  every counter back to zero, which `since` shows.
- `commands` counts the records of [GET /history](#get-history) that
  arrived since the start, by status, with `running` for unfinished
  ones; `interrupted` counts the commands that this start found
  unfinished (see [Restarts](../README.md#restarts)). Every key is
  always present.
- `resources` has a key for each command with a measured run among the
  same records: `cpuSeconds` sums its runs, to the millisecond,
  `peakRssBytes` is the largest peak of one run, and `processes` the
  largest tree of one run. A `null` figure adds
  nothing, so the object is `{}` before any measured run. The figures
  are those of [POST /](#post-).
- `machine` is `null` without a state machine. `entries` and `seconds`
  have a key for each state entered since the start, and for the state
  that a restored machine starts in, which counts from `since` without
  an entry. `seconds` counts the current state up to the request, to the
  millisecond.
- `completions` counts the scripts of the current entry that finished,
  by the event that their outcome raises: six of the seven entries
  into `open` were left before their scripts ended, so their ends count
  nothing. A
  [stop transition](../STATE-MACHINE.md#stop-transitions)
  (`stop: true`) likewise enters its next state before the stopped
  script ends, so that stop counts nothing; only a
  [POST /stop](#post-stop), which keeps the entry, counts as
  `$stopped`. A DT whose only stops are stop transitions keeps
  `$stopped` at zero.
- `transitions` and `events` count the requests that reached the
  machine; a [repeated request](#repeated-requests) that gets its
  stored reply counts once. `events` includes the events that a
  parameter change raises, such as `scope-changed` above, and those of
  the [peer subscriptions](#peers), such as `neighbour-full`.
- `escalations` counts the [escalations](#escalation) by trigger, with
  or without a state machine.

The counters live in memory and change no state document, so a change
of a counter sends no notification. Analysis over a longer time is the
Manager's, from the history and the notifications.

## Commands

A command is a script in the `location` directory whose name is listed
under `commands` in the configuration. The runner runs at most one
instance of each command at a time.

### POST /

Runs a command and answers once it has finished. MQTT route: `execute`.

| Field   | Required | Meaning                                                              |
| :------ | :------- | :------------------------------------------------------------------- |
| `name`  | yes      | the command to run                                                   |
| `input` | no       | a JSON object, which the script reads from stdin as one line of JSON |

`input` may be `{}`, but not a list, a string or `null`, nor have a
`__proto__` key, and its JSON may be at most 64 KiB (65 536 bytes). Any
other `input` gets the [validation error](#conventions).

The Manager admits patient `p-1` to cardiology, with a request key:

```bash
curl -s http://localhost:5100/ -H "Authorization: Bearer $JWS" \
  -H 'Idempotency-Key: admit-p-1' \
  --json '{"name":"admit","input":{"patient":"p-1","ward":"cardiology"}}'
```

`200`:

```json
{
  "status": "success",
  "result": {
    "exitCode": 0,
    "stdout": "hospital-1 in state open#1, scope single\r\np-1 admitted to cardiology",
    "stderr": "",
    "resources": { "cpuSeconds": null, "peakRssBytes": null, "processes": null }
  }
}
```

`admit.ps1` read `{"patient":"p-1","ward":"cardiology"}` from stdin.
Its first line of output comes from the
[script environment](#script-environment).

The reply tells how the command ended:

| `status`          | HTTP | Meaning                                                                   |
| :---------------- | :--- | :------------------------------------------------------------------------ |
| `success`         | 200  | the script exited with 0                                                  |
| `failed`          | 200  | a permitted script exited with another code, was killed, or did not start |
| `stopped`         | 200  | a [stop request](#post-stop) stopped the script                           |
| `invalid command` | 400  | the command is not permitted, or the request key is of another command    |
| `command running` | 409  | the request has `input` and the command is already running                |

`result` comes with `success`, `failed` and `stopped`, and holds the
logs of the script whatever its outcome. `exitCode` is `null` for a
stopped script. On Linux it is also `null` for a script that could not
start or was killed by a signal. On Windows, a missing script is
reported with the exit code of `powershell.exe`, and a script killed
from outside with 1. A refused request has no `result`.

`resources` holds what the script used, as the runner sampled it while
it ran; the [README](../README.md#resources) tells how each platform
measures. `cpuSeconds` is user plus system CPU time in seconds, to the
millisecond, `peakRssBytes` the peak resident memory in bytes, and
`processes` the most processes seen at once. They cover the process
tree of the run: the process that the runner starts and every process
below it, sampled every half second or so. The figures are lower
bounds, and `null` when not measured: on a platform other than Linux
and Windows, or for a script that ended before its first sample. On
Windows the sampler is a `powershell.exe` of its own, which needs a
second or more to start, so a short script such as `admit.ps1` above
ends unmeasured. A run of `open` in the demo, which lasted five
seconds, reports its tree: `powershell.exe`, which ran `open.ps1`, and
its `conhost.exe`, most of the 100 MB being PowerShell's own:

```json
{ "cpuSeconds": 1.656, "peakRssBytes": 103395328, "processes": 2 }
```

Both wards hold two beds and `scope` is `single`, so after `p-2`, a
third cardiology patient fails with exit code 3:

```bash
curl -s http://localhost:5100/ -H "Authorization: Bearer $JWS" \
  --json '{"name":"admit","input":{"patient":"p-3","ward":"cardiology"}}'
```

`200`:

```json
{
  "status": "failed",
  "result": {
    "exitCode": 3,
    "stdout": "hospital-1 in state open#1, scope single",
    "stderr": "no free bed for p-3; escalated: 202",
    "resources": { "cpuSeconds": null, "peakRssBytes": null, "processes": null }
  }
}
```

Before it failed, the script [escalated](#post-escalate) to the
Manager.

Input to a command that is running is refused, since the run in
progress did not get that input. `open` is the script of the current
state, so it is running:

```bash
curl -s http://localhost:5100/ -H "Authorization: Bearer $JWS" \
  --json '{"name":"open","input":{}}'
```

`409`:

```json
{ "status": "command running" }
```

A request without `input` for a running command does not start it a
second time either; it waits for that run and gets its result.

### GET /

Shows the latest command received, with its logs and exit code. MQTT
route: `status`. After the failed admission of `p-3`:

```bash
curl -s http://localhost:5100/ -H "Authorization: Bearer $JWS"
```

`200`:

```json
{
  "name": "admit",
  "status": "failed",
  "logs": {
    "stdout": "hospital-1 in state open#1, scope single",
    "stderr": "no free bed for p-3; escalated: 202"
  },
  "exitCode": 3,
  "resources": { "cpuSeconds": null, "peakRssBytes": null, "processes": null }
}
```

| `status`      | Meaning                                                                   |
| :------------ | :------------------------------------------------------------------------ |
| `valid`       | the script succeeded                                                      |
| `failed`      | the script failed                                                         |
| `stopped`     | a stop request stopped the script                                         |
| `interrupted` | the script was running when the runner stopped                            |
| `invalid`     | the command is not permitted; the logs are empty and `exitCode` is `null` |

Before the first command, `name` is `none` and `status` is `invalid`.
While the latest command runs, its `status` is `invalid` too, with
empty logs, `exitCode` `null` and every `resources` figure `null`, until it
finishes;
[GET /state](#get-state) shows it as `running`. These names differ from
those of `POST /`: `valid` here is `success` there.

### GET /history

Lists the command requests received, oldest first: those of `POST /`,
of MQTT `execute`, and the scripts that the state machine ran. Commands
that are not permitted appear too. A repeated request and a request
refused with `command running` do not. MQTT route: `history`.

```bash
curl -s http://localhost:5100/history -H "Authorization: Bearer $JWS"
```

`200`, after the change of `fidelity` in the demo, the newest two of
six records, with `limit=2` (see below):

```json
[
  {
    "id": 5,
    "name": "open",
    "status": "stopped",
    "exitCode": null,
    "receivedAt": "2026-10-27T19:20:31.000Z",
    "finishedAt": "2026-10-27T19:20:36.000Z",
    "by": null,
    "resources": {
      "cpuSeconds": 1.656,
      "peakRssBytes": 103395328,
      "processes": 2
    }
  },
  {
    "id": 6,
    "name": "open",
    "status": "running",
    "exitCode": null,
    "receivedAt": "2026-10-27T19:20:36.000Z",
    "finishedAt": null,
    "by": null,
    "resources": { "cpuSeconds": null, "peakRssBytes": null, "processes": null }
  }
]
```

| Field        | Value                                                                                           |
| :----------- | :---------------------------------------------------------------------------------------------- |
| `id`         | the number of the request, which grows with each one                                            |
| `name`       | the command                                                                                     |
| `status`     | `running` while unfinished, then as [GET /state](#get-state) reports it                         |
| `exitCode`   | as on [GET /](#get-); `null` while running                                                      |
| `receivedAt` | when the request arrived                                                                        |
| `finishedAt` | when the command finished; `null` while running                                                 |
| `by`         | the [principal](#access-control) that sent it, or `null` without `auth` or for a state's script |
| `resources`  | as on [POST /](#post-); `null` while running, and for refused, interrupted and older commands   |

Record 5 is the run of `open` at entry 2, which the change of
`fidelity` stopped with its figures; record 6 is the run at entry 3,
whose figures come when it ends. The six records are the first two
entries into `open`, the admissions of `p-1`, `p-2` and `p-3`, which
`alice` sent and which ended before their first sample, and this run.
The repeat of `p-1` and the refused input to `open` are missing.
Neither the logs, which stay on [GET /](#get-), nor the input are part
of the history. The duration of a command is
`finishedAt - receivedAt`.

At the end of the demo, `GET /history` had fourteen records: five sent
by `alice`, the `discharge` that `manager-1` sent over MQTT, and eight
scripts of states, whose `by` is `null`.

Two query parameters, both optional, select the records; over MQTT they
are the payload, as a JSON object such as `{"since": "...", "limit": 2}`,
and an empty payload takes the defaults.

| Parameter | Value                                                                                        |
| :-------- | :------------------------------------------------------------------------------------------- |
| `since`   | ISO 8601 with `Z` or an offset; the records received at that second or later                 |
| `limit`   | an integer from 1 to 1000, by default 100; the newest records of the selection, oldest first |

The demo asked for the records of the last 90 seconds, at most two:

```bash
since=$(date -u -d '-90 sec' +%FT%TZ)
curl -s "http://localhost:5100/history?since=$since&limit=2" \
  -H "Authorization: Bearer $JWS"
```

and got records 13 and 14, the runs of `open` that `neighbour-down`
stopped and started. The signature covers the path without the query,
so the token of `GET /history` serves any query. As times are stored to
the second, `since` is compared to the second too, and the records of
that second come again: a Manager that polls with the last `receivedAt`
it holds drops the repeats by `id`. A value that fails, such as
`limit=0`, `limit=1001`, `limit=1.5`, a `since` that is not ISO 8601, a
parameter given twice, or an MQTT payload that is not a JSON object,
gets the validation error of the [Conventions](#conventions). Unknown
parameters are ignored.

In a URL, the `+` of an offset must be percent-encoded as `%2B`, as in
`since=2026-10-26T16:56:00%2B02:00`: a plain `+` arrives as a space, and
the request is refused with `400`.

### POST /stop

Stops the running command of the given name, or every running command
without a `name` or without a body. MQTT route: `stop`, with an empty
payload or `{}` to stop every command.

The runner sends the script `SIGTERM`, and `SIGKILL` if it still runs
after `stopGrace` milliseconds of the configuration. On Windows, as in
the demo, it ends `powershell.exe` at once. It answers once the scripts
have exited, which can take the grace period and more. Only the
script's own process is signalled; on Windows the processes that the
script started keep running. The stopped run reports the `resources`
of its tree up to the last sample before that process exited, and the
processes that survive the stop are not measured:

```bash
curl -s http://localhost:5100/stop -H "Authorization: Bearer $JWS" \
  --json '{"name":"open"}'
```

`200`:

```json
{ "stopped": ["open"] }
```

`stopped` lists the commands that were stopped; it is empty when
nothing of that name was running. A request waiting on a stopped run
gets `stopped`. When the stopped script is that of the current state,
the state machine follows its `$stopped` transition. In the demo that
leads from `open` to `closed`. The reply does not wait for that, so
`GET /fsm` straight after it may still show the old state for a
moment. A stop takes no request key: a repeat finds nothing running.

## State Machine

These routes need a `stateMachine` in the configuration; without one,
they answer `404` with `{"status": "no state machine", "state": null}`.

The machine is idle before its first transition and whenever the
script of its current state has finished. On entering a state, the
runner starts the script of that state and answers as soon as the
script has started.

### POST /fsm/transition

Moves an idle machine to a state. MQTT route: `transition`.

```bash
curl -s http://localhost:5100/fsm/transition -H "Authorization: Bearer $JWS" \
  --json '{"state":"open"}'
```

`202`:

```json
{ "status": "accepted", "state": "open" }
```

`state` is the state of the machine after the request, `null` before
the first transition. The machine refuses a transition while the
script of its state runs, with `busy`.

### POST /fsm/event

Sends an event to the machine, which follows the transition of its
current state for that event, even while the script of that state
runs. MQTT route: `event`. Scripts raise events this way too, as in
[Calls From Scripts](#calls-from-scripts), and the runner raises the
events of [peer subscriptions](#peers) the same way.

The state `full` has no transition for `close`:

```bash
curl -s http://localhost:5100/fsm/event -H "Authorization: Bearer $JWS" \
  --json '{"event":"close"}'
```

`409`:

```json
{ "status": "no transition", "state": "full" }
```

With `escalation.onNoTransition` set, as in the demo, the runner also
[escalates](#escalation-notifications), once per entry into the state.
The same request again gets the same reply and escalates nothing.

### Replies of Transitions and Events

| `status`              | HTTP | Meaning                                                 |
| :-------------------- | :--- | :------------------------------------------------------ |
| `accepted`            | 202  | the machine entered the state and started its script    |
| `invalid state`       | 400  | the state is not in the state machine file              |
| `invalid event`       | 400  | the event is not under `events`                         |
| `invalid request key` | 400  | the request key belongs to another request              |
| `busy`                | 409  | a transition request while the script of the state runs |
| `no transition`       | 409  | the current state has no transition for the event       |
| `script running`      | 409  | the script of the next state is still running           |
| `no state machine`    | 404  | the configuration has no `stateMachine`                 |
| `stopping`            | 503  | the runner is shutting down                             |

A body without a `state` or an `event` gets the
[validation error](#conventions) before any other check.

### GET /fsm

Returns the state of the machine. MQTT route: `fsm`. After the stop of
`open`:

```bash
curl -s http://localhost:5100/fsm -H "Authorization: Bearer $JWS"
```

`200`:

```json
{
  "state": "closed",
  "status": "valid",
  "entry": 9,
  "events": [
    "beds-free",
    "close",
    "fidelity-changed",
    "full",
    "neighbour-down",
    "neighbour-full",
    "reopen",
    "scope-changed"
  ]
}
```

| Field    | Meaning                                                        |
| :------- | :------------------------------------------------------------- |
| `state`  | the current state, `null` before the first transition          |
| `status` | the status of the script of the state, below                   |
| `entry`  | the number of entries into states so far; `0` before the first |
| `events` | the events of the state machine file, in alphabetical order    |

`entry` tells two entries into the same state apart, such as the
restart of `open` when `scope` changes.

| `status`      | Meaning                                                         |
| :------------ | :-------------------------------------------------------------- |
| `none`        | no state yet                                                    |
| `running`     | the script of the state runs                                    |
| `valid`       | the script succeeded                                            |
| `invalid`     | the script failed                                               |
| `stopped`     | a stop request stopped the script                               |
| `interrupted` | the script was running when the runner stopped; after a restart |

## Parameters

Parameters are named values of the DT, declared in the state machine
file. The scripts see them as `DT_PARAM_<NAME>` environment variables.
No name has a meaning to the runner: a `fidelity` parameter, by which a
Manager trades a DT's accuracy for computing power, is a convention
between DT authors and Managers
([Pattern: Fidelity](../STATE-MACHINE.md#pattern-fidelity)).
Without a state machine, both routes answer `404` with
`{"status": "no state machine", "state": null}`.

### GET /parameters

Returns the value and the declaration of each parameter, without its
`event`. MQTT route: `parameters`.

```bash
curl -s http://localhost:5100/parameters -H "Authorization: Bearer $JWS"
```

`200`:

```json
{
  "scope": {
    "value": "single",
    "type": "enum",
    "values": ["single", "multi"],
    "default": "single",
    "controllable": true
  },
  "capacity": {
    "value": 2,
    "type": "number",
    "default": 2,
    "controllable": false
  },
  "fidelity": {
    "value": "medium",
    "type": "enum",
    "values": ["low", "medium", "high"],
    "default": "medium",
    "controllable": true
  }
}
```

### PUT /parameters

Sets the values of controllable parameters. The body maps parameter
names to new values, which are strings, numbers or booleans. MQTT
route: `set-parameters`.

The runner applies the whole body or none of it:

1. It checks every entry. An unknown name, a parameter that is not
   controllable or a value of the wrong type is refused with `400`,
   and `message` lists every problem.
1. It stores the new values, so that a script that starts afterwards
   sees them. If the database fails, it stores none.
1. It raises the `event` of each changed parameter, in the order of
   the declarations. An event that two changed parameters declare is
   raised once.

`capacity` is not controllable:

```bash
curl -s -X PUT http://localhost:5100/parameters -H "Authorization: Bearer $JWS" \
  --json '{"capacity":3}'
```

`400`:

```json
{
  "message": ["parameter capacity is not controllable"],
  "error": "Bad Request",
  "statusCode": 400
}
```

The Manager sets `scope` to `multi`, which raises `scope-changed`. In
`open` that is a `stop: true` self-transition, so the runner stops the
script of `open` and starts it again, at entry 2. The demo sent it over
MQTT, as `manager-1` (see [MQTT](#mqtt)); over HTTP it is:

```bash
curl -s -X PUT http://localhost:5100/parameters -H "Authorization: Bearer $JWS" \
  --json '{"scope":"multi"}'
```

The reply is the body of `GET /parameters`, now with `"value": "multi"`
for `scope`. The reply is the same whatever the events did; an event
that the machine refuses is logged. `GET /state` tells where the
machine went. A value equal to the current one changes nothing and
raises no event, so a repeat of the request and `{}` change nothing.
The route takes no request key for that reason.

`{"fidelity": "high"}` then raised `fidelity-changed`, another
`stop: true` self-transition of `open`, which started again at entry 3
and samples the beds every 100 ms instead of 500 ms; the run at entry
2 ended `stopped` with its figures, as [GET /history](#get-history)
shows.

## Peers

The configuration's `peers` section lists the DTs that this one is
willing to interact with; nothing else is a peer. With MQTT, the runner
subscribes to the presence and state notifications of each enabled
peer with a `topic`, on its own broker, and remembers what they told.
A notification counts only as an [envelope](#notifications) of its
topic's kind and of the peer's `id`; for a peer with a `publicKey`,
only as a JWS of the envelope that the key signed, with the peer's `id`
as `kid`. The runner logs and drops any other, and an empty payload,
which clears a retained notification, sets its part back to `null`. A
peer's notification sends no notification. It raises an event only
through a `subscriptions` entry of the state machine file, when the
entry's condition on the peer's `state` or `online` turns true; the
event then takes the path of [POST /fsm/event](#post-fsmevent) without
a request key, and nothing replies
([README](../README.md#peer-events)). In the demo, `hospital-1`
subscribes to the state `full` and to `online: false` of `hospital-2`,
and the runner logs each event it raises:

```text
Raised neighbour-full on state full of peer hospital-2: entered open
Raised neighbour-down on online false of peer hospital-2: entered open
```

### GET /peers

Maps each peer's id to its entry; `{}` without peers. MQTT route:
`peers`.

```bash
curl -s http://localhost:5100/peers -H "Authorization: Bearer $JWS"
```

`200`, with `hospital-2` online in state `open`, after the first
transition of both hospitals:

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
      "attributes": {
        "name": "Hospital 2",
        "city": "Aarhus",
        "latitude": 56.2,
        "longitude": 10.18,
        "wards": 2
      },
      "commands": ["open", "full", "closed", "admit", "discharge"],
      "stateMachine": true,
      "manager": { "commands": ["admit", "discharge"] },
      "peers": ["hospital-1"],
      "publicKey": "h484L5GHC1Fm1u-zlUFvxmaZy4me2A2mKuIoRFY57XU"
    },
    "state": {
      "id": "hospital-2",
      "time": "2026-10-27T19:19:40.394Z",
      "machine": {
        "state": "open",
        "status": "running",
        "entry": 1,
        "events": [
          "beds-free",
          "close",
          "fidelity-changed",
          "full",
          "neighbour-down",
          "neighbour-full",
          "reopen",
          "scope-changed"
        ]
      },
      "parameters": { "scope": "single", "capacity": 1, "fidelity": "medium" },
      "command": {
        "name": "open",
        "status": "running",
        "receivedAt": "2026-10-27T19:19:40.000Z",
        "finishedAt": null
      }
    }
  }
}
```

| Field        | Meaning                                                                            |
| :----------- | :--------------------------------------------------------------------------------- |
| `topic`      | the peer's MQTT base topic; `null` without one                                     |
| `url`        | the peer's HTTP base URL; `null` without one                                       |
| `attributes` | the peer's `attributes` in the configuration, such as a distance; `{}` without any |
| `enabled`    | whether the runner follows the peer and lists it in [GET /dt](#get-dt)             |
| `online`     | the `online` of the peer's last presence notice                                    |
| `descriptor` | the descriptor of the peer's last online notice; an offline notice keeps it        |
| `state`      | the `data` of the peer's last state notification                                   |

`online`, `descriptor` and `state` are `null` until a notification
tells them, and stay `null` without MQTT, for a disabled peer and for
one without `topic`. When the runner of `hospital-2` was killed, its
will set `online` to `false` and kept the descriptor and the last
state, `full` at entry 2. `publicKey` of the configuration is not
shown; the `publicKey` of the descriptor is the one that the peer
announced.

### PUT /peers

Enables and disables peers of the configuration. The body maps peer ids
to booleans. MQTT route: `set-peers`.

The runner checks the whole body first. An unknown id or a value that
is not a boolean is refused with `400`, and `message` lists every
problem:

```bash
curl -s -X PUT http://localhost:5100/peers -H "Authorization: Bearer $JWS" \
  --json '{"hospital-9":false,"hospital-2":"off"}'
```

`400`:

```json
{
  "message": ["unknown peer hospital-9", "peer hospital-2 takes a boolean"],
  "error": "Bad Request",
  "statusCode": 400
}
```

A body that is not an object gets the [validation error](#conventions).
`{"hospital-2": false}` is `200` with the body of `GET /peers`:

```json
{
  "hospital-2": {
    "topic": "dtaas/hospital-2",
    "url": "http://localhost:5200",
    "attributes": { "distance": 12.4 },
    "enabled": false,
    "online": null,
    "descriptor": null,
    "state": null
  }
}
```

In the demo, `{"hospital-2": true}` then brought back the retained
state `full` of `hospital-2`, which counted as a change for the
subscription of `hospital-1`, so `neighbour-full` restarted `open`
once more. The runner stores the changes of a body together, or
none of them; a stored change overrides the `enabled` of the
configuration at the next start. Disabling a peer unsubscribes and
forgets what it told; enabling it subscribes again, and the retained
notifications fill the entry shortly after the reply. A value equal to
the current one changes nothing, so `{}` changes nothing and the route
takes no request key. No notification is sent: the retained presence
notice keeps the peers of the last connection, while `GET /dt` is
current. The Manager can enable and disable only the peers that the
operator listed, never add one.

## Escalation

An escalation tells the Manager that the DT can not cope on its own.
The runner sends it as an
[escalation notification](#escalation-notifications). It escalates on
its own when the script of a state fails (`escalation.onFailure`) and
when an event has no transition (`escalation.onNoTransition`); a
script or a client escalates with `POST /escalate`.

### POST /escalate

Sends an escalation to the Manager. MQTT route: `escalate`.

| Field      | Required | Meaning                                                                            |
| :--------- | :------- | :--------------------------------------------------------------------------------- |
| `reason`   | yes      | a non-empty string of up to 1 KiB                                                  |
| `proposal` | no       | a JSON object of up to 4 KiB, by convention the parameter values the DT would like |

Each size is that of the value as JSON text, in bytes of UTF-8, quotes
included. The runner passes `proposal` on as it was received and does
not read it. In the demo, `admit.ps1` escalates when it finds no bed,
with this body:

```bash
curl -s http://localhost:5100/escalate -H "Authorization: Bearer $JWS" \
  --json '{"reason":"no cardiology bed for p-3","proposal":{"scope":"multi"}}'
```

`202`:

```json
{ "status": "accepted" }
```

The reply is the same with or without a state machine, so that a DT
without one can escalate too. Once the runner has begun to stop, it
still answers `202` but sends nothing. Any other body gets the
[validation error](#conventions).

## Repeated Requests

A client that is not sure its request arrived, such as one that lost
its connection while waiting, can send it again safely with a request
key.

- `POST /` and `execute` with a key that the runner has seen give the
  reply to the first request, and the command does not run again,
  whatever the `input` of the repeat. A key of another command is
  refused with `invalid command`. The runner keeps these keys in its
  database without a time limit.
- `POST /fsm/transition`, `POST /fsm/event`, `transition` and `event`
  give a repeat of an accepted request the reply to the first one. A
  refused request changed nothing, so its repeat is checked again. A
  key of another request gets `invalid request key`. The runner keeps
  the latest 256 keys in memory.
- `POST /escalate` and `escalate` give a repeat the first reply and
  escalate nothing, even with another body. These keys are kept apart
  from the others, the latest 256 in memory.

The demo sends the admission of `p-1` twice with the key `admit-p-1`.
Both replies are the `success` shown under [POST /](#post-), and the
runner log shows that `admit` ran once:

```text
Discarded a repeated request for "admit"
```

A repeated request is not added to the history. A command that was
running when the runner stopped is `interrupted` after the restart,
and a repeat of its request gets `failed` with `exitCode` `null`.

Without a key, a request for a command that is running joins that run
and gets its result. With `input`, it is refused with `command running`
instead, is not added to the history, and its key is not kept.

## Access Control

Without `auth.principals` in the configuration, every route is open
to anyone who reaches the port or the request topics, also with an
`auth` section that holds only a [key](#signatures). With principals,
the runner answers only the principals it lists, each in a role, and its
own scripts:

```yaml
auth:
  principals:
    - name: manager-1
      role: manager
      publicKey: 'mCpoaytWvGJ9K0lxNlSNw6sjUG7UezRWtxPvL1pyxKA'
    - name: alice
      role: client
      publicKey: 'o-YAagcjoyUxT2xcgULS22sCK6N_cJ-op8Jh7yukXMk'
```

`publicKey` is an Ed25519 public key as the base64url of its 32 raw
bytes, the `x` of its JWK (RFC 8037); the caller keeps the private key.
The demo's [tools/keygen.mjs](../demo/hospital/tools/keygen.mjs) writes
a key pair, `NAME.key` in PKCS#8 PEM and `NAME.pub` in this encoding.
`GET /health` and MQTT `health` stay open. The runner logs each
accepted request with its principal at `debug` level, and stores the
principal of each command in its history database: the name, `script`,
or nothing without `auth`, also for the script of a state.

The same section may hold a `key` instead of, or besides, the
principals: the private key with which the runner signs its output
(see [Signatures](#signatures)). The section needs one of the two.

### Token

An HTTP request carries `Authorization: Bearer <token>`, a compact JWS
(RFC 7515) that the caller signs for that one request:

- Header: `{"alg":"Ed25519","kid":"<principal>"}`. `alg` is the fully
  specified name of RFC 9864; any other, `EdDSA` and `none` included,
  is refused.
- `aud`: the DT's `id`. `iat` and `exp`: seconds, `exp` after `iat` by
  60 s at most; the runner allows 30 s of clock skew either way.
- `jti`: random, of 16 to 64 characters. The runner refuses a `jti` it
  accepted before, until the token can no longer be valid, and forgets
  them at a restart.
- `htm`: the method. `htu`: the path, without host or query, as the
  runner receives it, or behind a prefix that a gateway strips, such
  as `/user1/runner/fsm/event` for `/fsm/event`.
- `bh`: the base64url SHA-256 of the exact body bytes sent; of the
  empty string without a body.

`alice` raising `close` sends these claims:

```json
{
  "aud": "hospital-1",
  "iat": 1793005516,
  "exp": 1793005546,
  "jti": "4Yprdk_SIrCcAYAPD-gPtQ",
  "htm": "POST",
  "htu": "/fsm/event",
  "bh": "vMxsLojiWijWYxqt3cB8LD75hzg-qHd9LKzoVarHsRg"
}
```

`bh` hashes the bytes of the body, here `{"event":"close"}`:

```bash
printf '%s' '{"event":"close"}' | openssl dgst -sha256 -binary |
  basenc --base64url | tr -d '='
```

In Node, with `node:crypto` alone:

```js
import { createHash, createPrivateKey, randomBytes, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';

const key = createPrivateKey(readFileSync('alice.key'));
const part = (value) =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

export function authorization(method, path, body = '') {
  const iat = Math.floor(Date.now() / 1000);
  const claims = {
    aud: 'hospital-1',
    iat,
    exp: iat + 30,
    jti: randomBytes(16).toString('base64url'),
    htm: method,
    htu: path,
    bh: createHash('sha256').update(body).digest('base64url'),
  };
  const input = `${part({ alg: 'Ed25519', kid: 'alice' })}.${part(claims)}`;
  const signature = sign(null, Buffer.from(input), key).toString('base64url');
  return `Bearer ${input}.${signature}`;
}
```

The `Idempotency-Key` header is not signed, as `jti` already stops a
replay. Over MQTT the token is the request payload itself; see
[MQTT Access Control](#mqtt-access-control).

### Roles

A `client` may call every route, and a `manager` reads, sets
parameters, enables and disables peers and runs the `manager.commands`
of the state machine file.
The runner's own scripts send `Authorization: Bearer $RUNNER_TOKEN`
(see [Calls From Scripts](#calls-from-scripts)) and act in the role
`script`. A principal's token is accepted from a script too, in the
principal's role.

| HTTP                   | MQTT route       | client | manager            | script |
| :--------------------- | :--------------- | :----- | :----------------- | :----- |
| `GET /health`          | `health`         | open   | open               | open   |
| `GET /dt`              | `dt`             | yes    | yes                | yes    |
| `GET /state`           | `state`          | yes    | yes                | yes    |
| `GET /`                | `status`         | yes    | yes                | yes    |
| `GET /history`         | `history`        | yes    | yes                | yes    |
| `GET /metrics`         | `metrics`        | yes    | yes                | yes    |
| `GET /fsm`             | `fsm`            | yes    | yes                | yes    |
| `GET /parameters`      | `parameters`     | yes    | yes                | yes    |
| `POST /`               | `execute`        | yes    | `manager.commands` | no     |
| `POST /stop`           | `stop`           | yes    | no                 | no     |
| `POST /fsm/transition` | `transition`     | yes    | no                 | no     |
| `POST /fsm/event`      | `event`          | yes    | no                 | yes    |
| `POST /escalate`       | `escalate`       | yes    | no                 | yes    |
| `PUT /parameters`      | `set-parameters` | yes    | yes                | no     |
| `GET /peers`           | `peers`          | yes    | yes                | yes    |
| `PUT /peers`           | `set-peers`      | yes    | yes                | no     |

### Errors

A refusal has the body of a Nest error, over MQTT too. No message
before the signature check tells whether a name is listed.

| Case                                                    | Status | `message`                               |
| :------------------------------------------------------ | :----- | :-------------------------------------- |
| No header, or an empty MQTT payload or one with `{`     | 401    | `missing credential`                    |
| Not `Bearer`, not three base64url parts, not JSON       | 401    | `malformed credential`                  |
| `alg` not `Ed25519`, unknown `kid`, bad signature/token | 401    | `invalid credential`                    |
| `aud` not this DT, claims missing or of the wrong type  | 401    | `invalid claims`                        |
| Expired, issued in the future, or `exp - iat` over 60 s | 401    | `expired credential`                    |
| `htm`, `htu`, `bh` or `topic` differs from the request  | 401    | `credential does not match the request` |
| `jti` seen before                                       | 401    | `replayed credential`                   |
| Role refused, or a manager command not listed           | 403    | `<role> may not call <route>`           |

A bearer without a dot is taken for the script token, so a wrong one
is `invalid credential`; an MQTT payload that is neither empty nor
starts with `{` is read as a JWS, and is `malformed credential` if it
is not one.

A manager that runs `open` of the demo gets:

```json
{
  "message": "manager may not call execute",
  "error": "Forbidden",
  "statusCode": 403
}
```

The 413 of an oversized body comes first; 401 and 403 come before the
validation error.

## MQTT

With an `mqtt` section in the configuration, the runner connects to the
broker, subscribes with QoS 1 to one request topic per route and to
the notifications of its [peers](#peers), and publishes the
[notifications](#notifications).

### Request Topics

A request is published on `<topic>/<route>`, with the JSON of the
matching HTTP request body as payload. The routes that read take no
payload, and the runner ignores any, except `history`, whose payload is
its query.

| Request topic            | HTTP                   | Payload                               |
| :----------------------- | :--------------------- | :------------------------------------ |
| `<topic>/execute`        | `POST /`               | `{"name": "<command>", "input": {}}`  |
| `<topic>/status`         | `GET /`                | none                                  |
| `<topic>/history`        | `GET /history`         | `{"since": "<time>", "limit": 10}`    |
| `<topic>/stop`           | `POST /stop`           | `{"name": "<command>"}`, `{}` or none |
| `<topic>/transition`     | `POST /fsm/transition` | `{"state": "<state>"}`                |
| `<topic>/event`          | `POST /fsm/event`      | `{"event": "<event>"}`                |
| `<topic>/fsm`            | `GET /fsm`             | none                                  |
| `<topic>/dt`             | `GET /dt`              | none                                  |
| `<topic>/state`          | `GET /state`           | none                                  |
| `<topic>/health`         | `GET /health`          | none                                  |
| `<topic>/parameters`     | `GET /parameters`      | none                                  |
| `<topic>/set-parameters` | `PUT /parameters`      | `{"<name>": <value>}`                 |
| `<topic>/escalate`       | `POST /escalate`       | `{"reason": "<reason>"}`              |
| `<topic>/peers`          | `GET /peers`           | none                                  |
| `<topic>/set-peers`      | `PUT /peers`           | `{"<peer id>": <boolean>}`            |
| `<topic>/metrics`        | `GET /metrics`         | none                                  |

### Responses

The response payload is the JSON body of the matching HTTP reply, or
with `auth.key` a JWS of it (see [Signatures](#signatures)). MQTT
has no status codes, so the payload alone tells the outcome, through
its `status` field or the `statusCode` of an error. The runner
publishes each response with QoS 1:

- to the response topic of an MQTT 5 request, with its correlation
  data, when the request has a response topic;
- otherwise to the request topic followed by `/response`, such as
  `<topic>/execute/response`.

The runner uses the default response topic instead when the requested
one is empty, holds a wildcard, starts with `$`, or is one of its
request topics. Every client subscribed to a default response topic
receives every response on it; a client that must tell its own
responses apart connects with MQTT 5 and gives a response topic of its
own.

A payload that is not a JSON object fitting the route gets the
[validation error](#conventions). An `execute` payload has no 100 kB
limit, but its `input` has the 64 KiB limit of `POST /`.

### Example: Descriptor and Discharge

In the demo, `mq1 dt` subscribes to `dtaas/hospital-1/dt/response`,
publishes a signed payload on `dtaas/hospital-1/dt`, and prints the
response topic, whether the payload is `verified`, `UNSIGNED` or
`INVALID` (see [Signatures](#signatures)), and the payload, here the
body of [GET /dt](#get-dt). The demo shows the line of its `publicKey`
beside the key file with which the tools verified the response:

```text
dtaas/hospital-1/dt/response (verified)
  "publicKey": "NC6o1XrrDbF0Kta1gISss-R6v1IgC8zg0OUOWy7Jr3Y"
NC6o1XrrDbF0Kta1gISss-R6v1IgC8zg0OUOWy7Jr3Y
```

The Manager discharges `p-1` over MQTT, with input:

```bash
mq1 execute '{"name":"discharge","input":{"patient":"p-1"}}'
```

```text
dtaas/hospital-1/execute/response (verified)
{
  "status": "success",
  "result": {
    "exitCode": 0,
    "stdout": "p-1 left cardiology\r\nraised event beds-free, reply 202",
    "stderr": "",
    "resources": { "cpuSeconds": null, "peakRssBytes": null, "processes": null }
  }
}
```

`discharge.ps1` raised `beds-free`, which moved the machine from `full`
back to `open`, as `mq1 fsm` shows:

```text
dtaas/hospital-1/fsm/response (verified)
{
  "state": "open",
  "status": "running",
  "entry": 6,
  "events": [
    "beds-free",
    "close",
    "fidelity-changed",
    "full",
    "neighbour-down",
    "neighbour-full",
    "reopen",
    "scope-changed"
  ]
}
```

The same requests with the
[Mosquitto clients](https://mosquitto.org/download/), for a runner
without `auth.principals`; with them, each payload is the JWS that
`node tools/sign.mjs mqtt ROUTE JSON` prints (see
[MQTT Access Control](#mqtt-access-control)):

```bash
mosquitto_sub -h 127.0.0.1 -p 18830 -t 'dtaas/hospital-1/+/response' &
mosquitto_pub -h 127.0.0.1 -p 18830 -t 'dtaas/hospital-1/dt' -n
mosquitto_pub -h 127.0.0.1 -p 18830 -t 'dtaas/hospital-1/execute' \
  -m '{"name":"discharge","input":{"patient":"p-1"}}'
```

### Request Keys and Delivery

The broker may deliver a request twice, as the runner subscribes with
QoS 1. An MQTT 5 request with an `idempotency-key` user property acts
once, as in [Repeated Requests](#repeated-requests); MQTT 3.1.1, which
the demo broker speaks, has no user properties. With an MQTT 5 broker:

```bash
mosquitto_pub -h localhost -V mqttv5 -t 'dtaas/hospital-1/execute' \
  -D publish user-property idempotency-key admit-p-1 \
  -m '{"name":"admit","input":{"patient":"p-1","ward":"cardiology"}}'
```

Requests published while the runner is disconnected are lost. The
runner ignores retained requests, so that a command does not run again
each time the runner connects.

### MQTT Access Control

With `auth.principals`, the payload of every request but `health` is a
compact JWS, signed as for HTTP (see [Token](#token)), whose claims are
`aud`, `iat`, `exp`, `jti`, `topic`, the request topic, and `body`, the
JSON of the plain request, absent for a route without one. The runner
verifies the token, compares `topic` with the topic the request came
on, and handles `body` as it handles a plain payload. This works over
MQTT 3.1.1 and MQTT 5 alike. The Manager's `execute` of the demo, as
claims:

```json
{
  "aud": "hospital-1",
  "iat": 1793005596,
  "exp": 1793005626,
  "jti": "Zq0m3Xb7c9WkLr2PfYt8sQ",
  "topic": "dtaas/hospital-1/execute",
  "body": { "name": "discharge", "input": { "patient": "p-1" } }
}
```

A plain payload gets the `401` body `missing credential`, and a refused
credential or role its [error](#errors) body, on the response topic as
any response. The request key stays an MQTT 5 user property. The
demo's [tools/sign.mjs](../demo/hospital/tools/sign.mjs) prints such a
payload: `node tools/sign.mjs mqtt execute '<json>'`.

The broker's access control remains the outer wall: `auth` decides who
may act, the broker who may publish on the request topics and read the
responses and notifications at all, and which topics the runner may
publish on. Without `auth.principals`, anyone who can publish on the
request topics can run the permitted commands. Use `mqtts://` or `wss://` with
a username and password when the broker is not on the same computer.

## Notifications

The runner tells what happens without being asked. Each notification
is one JSON object, or with `auth.key` a JWS of it
(see [Signatures](#signatures)):

| Field  | Meaning                                                    |
| :----- | :--------------------------------------------------------- |
| `kind` | `state`, `escalation` or `presence`                        |
| `id`   | the identity of the DT                                     |
| `time` | the time of the notification; `null` only in the MQTT will |
| `data` | the content, which depends on `kind`                       |

The payloads below are those that the subscriber of the demo received
in the recording, each a JWS that it verified with the public key of
its DT, shown decoded. The recording's network pane shows each
notification as a one-line summary only.

### State Notifications

The runner sends its [state document](#get-state) whenever the
document changes: when the machine enters a state, when the script of
a state finishes, when a command starts or finishes, when a parameter
changes, and once at startup. A document that differs from the last
one sent only in its `time` is not sent again. `data` is the document,
and `id` and `time` are its own.

The first notification of the demo, at the startup of `hospital-1`:

```json
{
  "kind": "state",
  "id": "hospital-1",
  "time": "2026-10-27T19:19:16.975Z",
  "data": {
    "id": "hospital-1",
    "time": "2026-10-27T19:19:16.975Z",
    "machine": {
      "state": null,
      "status": "none",
      "entry": 0,
      "events": [
        "beds-free",
        "close",
        "fidelity-changed",
        "full",
        "neighbour-down",
        "neighbour-full",
        "reopen",
        "scope-changed"
      ]
    },
    "parameters": { "scope": "single", "capacity": 2, "fidelity": "medium" },
    "command": null
  }
}
```

The stop of `open` gives this sequence of documents, shown here by
`machine` and `command` only:

| `machine`              | `command`           |
| :--------------------- | :------------------ |
| `open` #8, `running`   | `open`, `stopped`   |
| `open` #8, `stopped`   | `open`, `stopped`   |
| `closed` #9, `running` | `closed`, `running` |
| `closed` #9, `running` | `closed`, `valid`   |
| `closed` #9, `valid`   | `closed`, `valid`   |

### Escalation Notifications

| `data` field | Meaning                                                                                         |
| :----------- | :---------------------------------------------------------------------------------------------- |
| `trigger`    | `request` (`POST /escalate`), `failure` (`onFailure`) or `no-transition` (`onNoTransition`)     |
| `state`      | the state when the escalation happened; `null` without a machine or before its first transition |
| `entry`      | the entry of that state; `0` without a machine or before its first transition                   |
| `event`      | the event that had no transition, for `no-transition`; else `null`                              |
| `reason`     | the reason of the request, or the runner's own text                                             |
| `proposal`   | the proposal of the request, else `null`                                                        |

`hospital-1` escalates three times. `admit.ps1` asks for scope `multi`:

```json
{
  "kind": "escalation",
  "id": "hospital-1",
  "time": "2026-10-27T19:20:18.670Z",
  "data": {
    "trigger": "request",
    "state": "open",
    "entry": 1,
    "event": null,
    "reason": "no cardiology bed for p-3",
    "proposal": { "scope": "multi" }
  }
}
```

The script of `full` fails, as `hospital-2` is full too, and `full` has
no `$failure` transition:

```json
{
  "kind": "escalation",
  "id": "hospital-1",
  "time": "2026-10-27T19:21:10.496Z",
  "data": {
    "trigger": "failure",
    "state": "full",
    "entry": 5,
    "event": null,
    "reason": "script of state full failed",
    "proposal": null
  }
}
```

The event `close` has no transition in `full`:

```json
{
  "kind": "escalation",
  "id": "hospital-1",
  "time": "2026-10-27T19:21:14.605Z",
  "data": {
    "trigger": "no-transition",
    "state": "full",
    "entry": 5,
    "event": "close",
    "reason": "no transition for close in state full",
    "proposal": null
  }
}
```

### Presence

The runner announces that it joins and leaves. The online notice
carries the [descriptor](#get-dt):

```json
{
  "kind": "presence",
  "id": "hospital-1",
  "time": "2026-10-27T19:19:17.081Z",
  "data": {
    "online": true,
    "descriptor": {
      "id": "hospital-1",
      "attributes": {
        "name": "Hospital 1",
        "city": "Aarhus",
        "latitude": 56.19,
        "longitude": 10.17,
        "wards": 2
      },
      "commands": ["open", "full", "closed", "admit", "discharge"],
      "stateMachine": true,
      "manager": { "commands": ["admit", "discharge"] },
      "peers": ["hospital-2"],
      "publicKey": "NC6o1XrrDbF0Kta1gISss-R6v1IgC8zg0OUOWy7Jr3Y"
    }
  }
}
```

The offline notice, at a graceful shutdown:

```json
{
  "kind": "presence",
  "id": "hospital-1",
  "time": "2026-10-27T19:22:09.109Z",
  "data": { "online": false }
}
```

Over MQTT, the runner also connects with a will on the presence topic:
the offline notice with `"time": null`, as the will is fixed when the
runner connects. The broker publishes the will only when the runner
disappears without leaving: a crash, a kill or a lost connection. The
demo kills the runner of `hospital-2`, and the broker publishes its
will, signed when the runner connected:

```json
{
  "kind": "presence",
  "id": "hospital-2",
  "time": null,
  "data": { "online": false }
}
```

At shutdown, the runner publishes the offline notice and disconnects
gracefully, so that the broker drops the will. Each step waits at most
2 s. When the broker does not confirm, the runner closes the connection
and logs a warning; the broker may then publish the will, which still
says offline.

### Over MQTT

The runner publishes each notification with QoS 1 on
`<topic>/notify/<kind>`:

| Topic                       | Retained | Why                                                        |
| :-------------------------- | :------- | :--------------------------------------------------------- |
| `<topic>/notify/state`      | yes      | a Manager that subscribes later gets the current state     |
| `<topic>/notify/presence`   | yes      | a Manager that subscribes later knows whether the DT is up |
| `<topic>/notify/escalation` | no       | a Manager that subscribes later does not act on an old one |

The online notice is published each time the runner connects, the first
time and after each reconnect. The notification topics are two levels
under the base topic, so `<topic>/+/response` does not match them; the
demo's subscriber takes those of every DT with `dtaas/+/notify/+`:

```bash
mosquitto_sub -h 127.0.0.1 -p 18830 -v -t 'dtaas/+/notify/+'
```

While the broker is unreachable, the runner queues the notifications in
memory and publishes them in order when it connects again.

In the demo, `mq retained` subscribes after the shutdown of
`hospital-1`. It gets the retained state and presence of both DTs, the
will of `hospital-2` among them, and no escalation:

```text
retained 19:22:04 hospital-1 verified closed#9 valid | closed:valid | scope=multi fidelity=high
retained 19:22:09 hospital-1 verified offline
retained 19:20:54 hospital-2 verified full#2 valid | full:valid | scope=single fidelity=medium
retained --:--:-- hospital-2 verified offline (the will)
```

### Over a Webhook

With a `notify.url` in the configuration, the runner posts each
notification to it as `application/json`, or with `auth.key` as
`application/jose`, the media type of a compact JWS (RFC 7515), with a
5 s timeout. The `notify.token` bearer authenticates the runner to the
webhook; the signature lets the receiver check every body, including
those it stores or forwards. It
retries after 1 s, 2 s and 4 s on a network error, a timeout or a `5xx`
reply, and not on any other reply. Posts are independent, so they may
arrive out of order; a receiver that needs a strict order uses MQTT. A
failure is logged once, with the host of the webhook only, until a post
succeeds again.

The webhook gets the online notice once at startup, not on a
reconnect, and the offline notice once at shutdown; the will goes over
MQTT only. At shutdown the runner abandons the posts still in progress
or waiting for a retry. Both runners of the demo post to one receiver,
which logged the notifications other than state documents, before the
shutdown, as below, each verified with the key of the DT that the
payload names:

```text
POST 19:19:16 hospital-1 verified online, peers hospital-2
POST 19:19:21 hospital-2 verified online, peers hospital-1
POST 19:20:18 hospital-1 verified escalation request open#1: no cardiology bed for p-3 {"scope":"multi"}
POST 19:21:10 hospital-1 verified escalation failure full#5: script of state full failed
POST 19:21:14 hospital-1 verified escalation no-transition full#5: no transition for close in state full
```

### Signatures

With `key` in the `auth` section, the runner signs everything it sends
on its own or in reply with a private key of the DT, so that a
receiver that holds the public key can check origin and integrity:

```yaml
auth:
  # an Ed25519 private key, PEM PKCS#8, relative to this file
  key: 'keys/hospital-1.key'
```

The path is taken from the directory of the configuration file, and an
absolute path works too. `keygen.mjs hospital-1 keys` writes the key
and its public key, `keys/hospital-1.pub`. A file that cannot be read,
an encrypted key, or a key that is not an Ed25519 private key stops
the runner at startup with an error that names the file.

| Output                        | Without `auth.key`      | With `auth.key`                |
| :---------------------------- | :---------------------- | :----------------------------- |
| Notifications, MQTT           | JSON envelope           | JWS of the envelope            |
| Notifications, webhook        | `application/json` body | `application/jose` body, a JWS |
| MQTT responses                | JSON body of the reply  | JWS of the body                |
| MQTT will (`notify/presence`) | JSON, `time: null`      | JWS, `time: null`              |
| HTTP replies                  | JSON                    | JSON, unsigned                 |

Each is a compact JWS (RFC 7515) whose payload is exactly the JSON
without a key. Its protected header is
`{"alg":"Ed25519","kid":"<id>"}`: `alg` is the fully specified name of
RFC 9864, as in a [token](#token), and `kid` the `id` of the DT. No
claim is added: the `id` and `time` of the envelope bind it to the DT
and the moment, and there is no `exp`, as a retained notification must
stay verifiable for a Manager that connects hours later. The will
keeps `time: null`; it is signed once, when the runner connects.
Ed25519 is deterministic, so a notification gives the same JWS over
MQTT and the webhook.

The first state notification of
[State Notifications](#state-notifications) is published on
`dtaas/hospital-1/notify/state` as one line,
`<header>.<payload>.<signature>`, here broken before each dot and with
`[…]` for the omitted characters:

```text
eyJhbGciOiJFZDI1NTE5Iiwia2lkIjoiaG9zcGl0YWwtMSJ9
.eyJraW5kIjoic3RhdGUiLCJpZCI6Imhvc3BpdGFs[…]NvbW1hbmQiOm51bGx9fQ
.UufoNbhIlLc0ZHmzH1wb[…]
```

The header decodes to `{"alg":"Ed25519","kid":"hospital-1"}`, and the
payload, 502 characters, to the envelope unchanged. The signature is
86 base64url characters, the 64 bytes of Ed25519. The document grows
from 376 to 638 bytes.

A consumer verifies with the public key its operator gave it, as
`publicKey` of [GET /dt](#get-dt) gives it: the base64url of the 32 raw
bytes, the `x` of the JWK. In Node, `key` is
`createPublicKey({ key: { kty: 'OKP', crv: 'Ed25519', x }, format: 'jwk' })`:

```js
import { verify } from 'node:crypto';

const decode = (part) => JSON.parse(Buffer.from(part, 'base64url'));

export function unwrap(text, key, id) {
  const [header, payload, signature, ...rest] = text.split('.');
  const { alg, kid } = decode(header);
  const signed = Buffer.from(`${header}.${payload}`);
  const bytes = Buffer.from(signature ?? '', 'base64url');
  const ok = verify(null, signed, key, bytes);
  if (rest.length > 0 || alg !== 'Ed25519' || kid !== id || !ok) {
    throw new Error('not verified');
  }
  return decode(payload);
}
```

A payload that parses as JSON is plain JSON from a runner without a
key: a notification starts with `{`, and a response may also be an
array, such as that of `history`. A JWS never parses as JSON. Whether
to accept a plain payload is the consumer's choice. The demo's
[tools/jws.mjs](../demo/hospital/tools/jws.mjs) marks each message
`verified`, `UNSIGNED`, or `INVALID` with the reason: no key file, an
unreadable key file, a malformed JWS, a wrong `alg` or `kid`, or a bad
signature. It prints an `INVALID` payload as it came, marked
unverified, so that a refusal of a signed runner still shows.

Not signed, with the reason:

- HTTP replies: the caller chose the endpoint, TLS and the DTaaS
  gateway protect the reply, and [access control](#access-control)
  authenticates the caller.
- Freshness: a signature proves origin and integrity, not that a
  message is new. Anyone who can publish on the notification topics
  can replay an old signed document or will; the access control of the
  broker limits that, and a receiver that must not go back in time
  compares `time` with that of the last message it took.
  The will in particular has no time to compare: it keeps
  `time: null`, so a captured will stays valid for as long as the
  key does.
- More than one key: a new key is a restart, and a new public key for
  every receiver.

A plain notification retained from an earlier run without a key and a
signed one share a topic. The runner publishes its online notice on
every connect and its state document at startup, so both retained
topics are replaced as soon as it connects; a receiver that requires
signatures drops the plain one it may get first, and waits.

Without MQTT and a webhook, [GET /state](#get-state) is the only way to
observe the state, and nothing is announced.

## Calls From Scripts

Scripts are clients of the API too. The runner gives each script its
own address and the context of the DT in environment variables.

### Script Environment

| Variable          | Value in the demo, in state `open` at entry 1                              |
| :---------------- | :------------------------------------------------------------------------- |
| `RUNNER_URL`      | `http://127.0.0.1:5100`                                                    |
| `RUNNER_TOKEN`    | the bearer token, with `auth.principals` only                              |
| `DT_ID`           | `hospital-1`                                                               |
| `DT_STATE`        | `open`; empty before the first transition                                  |
| `DT_ENTRY`        | `1`                                                                        |
| `DT_PARAM_<NAME>` | `DT_PARAM_SCOPE=single`, `DT_PARAM_CAPACITY=2`, `DT_PARAM_FIDELITY=medium` |

Without a state machine, `DT_STATE` and `DT_ENTRY` are absent. The
variables under `env` in the state machine file come too, such as
`POLL_MS=500` of `open`. The script of `open` logged:

```text
19:19:46 open   DT_ID=hospital-1 DT_STATE=open DT_ENTRY=1
19:19:46 open   DT_PARAM_SCOPE=single DT_PARAM_CAPACITY=2 POLL_MS=500
19:19:46 open   HINT=hospital-1/open#1 scope=single RUNNER_URL=http://127.0.0.1:5100
19:19:46 open   fidelity medium: beds sampled every 500 ms
19:19:47 open   overflow to hospital-2 at 12.4 km
```

The last line comes from a call of `GET $RUNNER_URL/peers`: a script
may read the routes that the role `script` may call (see
[Roles](#roles)).

### Raise an Event or Escalate

A script raises an event with `POST $RUNNER_URL/fsm/event` and
escalates with `POST $RUNNER_URL/escalate`, with the header
`Authorization: Bearer $RUNNER_TOKEN`. `RUNNER_TOKEN` is drawn at each
start of the runner, and a script that sends it acts in the role
`script` (see [Roles](#roles)). Without `auth.principals` the variable is unset
and the runner ignores the header, so a script may always send it. The
token is for HTTP only. The demo scripts use this PowerShell helper,
from [scripts/ward.ps1](../demo/hospital/scripts/ward.ps1):

```powershell
# RUNNER_TOKEN is unset without access control, and the header ignored
$RunnerHeaders = @{ Authorization = "Bearer $env:RUNNER_TOKEN" }

function Send-Runner($path, $body) {
  try {
    Invoke-RestMethod -Method Post -Uri "$env:RUNNER_URL/$path" -Headers $RunnerHeaders `
      -ContentType 'application/json' -Body ($body | ConvertTo-Json -Compress) | Out-Null
    202
  } catch { [int]$_.Exception.Response.StatusCode }
}
```

`open.ps1` raises `full` once every bed is taken, and `admit.ps1`
escalates when it finds no bed:

```powershell
$code = Send-Runner 'fsm/event' @{ event = 'full' }
$code = Send-Runner 'escalate' $escalation
```

In a shell script on Linux, the same calls are:

```bash
curl -s -X POST "$RUNNER_URL/fsm/event" \
  -H "Authorization: Bearer $RUNNER_TOKEN" \
  -H 'Content-Type: application/json' -d '{"event": "full"}'
curl -s -X POST "$RUNNER_URL/escalate" \
  -H "Authorization: Bearer $RUNNER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"reason": "no cardiology bed for p-3", "proposal": {"scope": "multi"}}'
```

An event that a script raises is like any other: the machine follows
the transition of its current state for it, even while the script that
raised it still runs.

## Example Session

The recording, in order, as requests and what they did. Times are
those of the markers in
[demo-windows-manager.cast](../demo/hospital/demo-windows-manager.cast),
which [demo-windows-network.cast](../demo/hospital/demo-windows-network.cast)
shares. `hospital-1` is asked unless the request names `hospital-2`.

| Time | Request                                                                        | Outcome                                                                                                        |
| ---: | :----------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------- |
| 0:37 | both runners start                                                             | presence online and the first state document of each, signed, over MQTT and the webhook                        |
| 0:56 | `GET /dt`; `GET /health`; `GET /dt` unsigned; `POST /` `open` as `manager-1`   | the descriptor with `peers` and `publicKey`; `ok`, `scripts` `null`; `401 missing credential`; `403`           |
| 1:16 | MQTT `dt`                                                                      | the descriptor, `verified` with the runner's public key                                                        |
| 1:23 | `POST /fsm/transition` to `open`, `hospital-2` first; `GET /state`             | `202 accepted`; `open.ps1` logs its environment, its fidelity and overflow to `hospital-2`                     |
| 1:46 | `GET /peers`; `PUT /peers` with an unknown peer and a string                   | `hospital-2` online in `open`, with its descriptor and state; `400` with two problems                          |
| 1:59 | `POST /` `admit` `p-1`, key `admit-p-1`, twice; then `open` with input         | `success` both times, and `admit` ran once; `409 command running`                                              |
| 2:29 | `POST /` `admit` `p-2`, then `p-3`; `GET /`                                    | `success`, then `failed` with exit code 3 and a `request` escalation; the failed `admit`                       |
| 2:57 | `GET /parameters`; `PUT` `capacity`; MQTT `set-parameters` `scope`; `fidelity` | the declarations; `400 not controllable`; `open` restarts at entries 2 and 3; `GET /history` shows both runs   |
| 3:36 | `hospital-2`: MQTT `execute` `admit` `p-5`, `POST /` `admit` `p-6`             | `hospital-2` goes `full` and its `full` succeeds; `neighbour-full` restarts `open` at entry 4                  |
| 4:03 | `POST /` `admit` `p-3`, then `p-4`                                             | `success`; `open.ps1` raises `full`, the script of `full` finds no open peer and fails, a `failure` escalation |
| 4:29 | `POST /fsm/event` `close`, twice                                               | `409 no transition` twice, one `no-transition` escalation                                                      |
| 4:46 | MQTT `execute` `discharge` `p-1`; MQTT `fsm`                                   | `success`; `beds-free` takes the machine to `open` at entry 6                                                  |
| 4:59 | `PUT /peers` `hospital-2` `false`, then `true`                                 | the entry empties; the retained `full` raises `neighbour-full` again, `open` at entry 7                        |
| 5:20 | the runner of `hospital-2` is killed; `GET /peers`                             | the will, offline with `time` `null`; `neighbour-down` restarts `open` at entry 8                              |
| 5:36 | `GET /history` with `since` and `limit`; `GET /history`; `GET /metrics`        | two records; fourteen, by `alice`, `manager-1` and none; the counters                                          |
| 5:52 | `POST /stop` `open`                                                            | `stopped: ["open"]`; `$stopped` leads to `closed` at entry 9                                                   |
| 6:08 | the webhook log                                                                | presence and escalations of both DTs, `verified`                                                               |
| 6:13 | graceful shutdown of `hospital-1`; MQTT `retained`                             | presence offline; the retained state and presence of both DTs                                                  |

## Version

This document describes runner version 0.10.0, which made
[GET /history](#get-history) return full records and added
[GET /metrics](#get-metrics); 0.9.0 added
[access control](#access-control). The optional
[signatures](#signatures), the `resources` of the commands, the
[peers](#peers) and the subscriptions to them came without a version
change. The
[README](../README.md#use) tells how to install, configure and start the
runner, and the [state machine guide](../STATE-MACHINE.md) how to write a
state machine file.
