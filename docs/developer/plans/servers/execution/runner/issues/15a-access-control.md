# 15a Access Control: Verify Callers

## Spec

An open DT network needs protection against both external malevolent
parties and the introduction of malevolent DTs, and R2 opens only some
commands and parameters to the Manager. Today anyone who reaches the
port or the request topics drives the machine, and the
`manager.commands` of [05](05-command-input.md) are declared but not
enforced (D24). This issue lets the operator list who may call the
runner, in which role, and amends A8 of the design document ("Anyone
who can call the API can drive the machine").
[15b](15b-signed-output.md), which signs what the runner sends, and
[13](13-peers.md) follow its key encoding.

### Behaviour

- Without an `auth` section in `runner.yaml` nothing changes: every
  route stays open and any `Authorization` header is ignored. The
  README says so prominently, at the top of Configure.
- With `auth`, every request but `GET /health` and MQTT `health`
  carries a credential: a signed token of a listed principal, or the
  runner's token for its scripts. Health stays open for the platform's
  liveness probes.
- Each accepted request is logged with its principal's name at `debug`
  level (this plan's call: polling would flood `log`).
- `POST /` and MQTT `execute` store the caller in a new `by` column of
  the `commands` table: a principal's name, `script`, or `NULL` without
  `auth`. A state's script that the machine starts has `NULL` too, as
  no caller submitted it (this plan's call). Issue
  [11](11-history-metrics.md) shows `by` in the history; this issue
  shows it nowhere new.

### Configuration

`name` follows `nameSchema`, is unique in the list and is not
`script`; `role` is `manager` or `client`; `publicKey` is an Ed25519
public key. The section is strict and needs one principal at least, so
that a stray `auth:` does not lock every caller out (this plan's call).

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

The key is the base64url of its 32 raw bytes, the `x` of its JWK
(RFC 8037). It fits one YAML line where PEM SPKI needs a block scalar,
shares the alphabet of the token, and `createPublicKey` of
`node:crypto` takes it as a JWK. The schema refuses a key that does not
decode to 32 bytes or that `createPublicKey` rejects. `runner.yaml`
holds no secret: reading it impersonates nobody, and deleting a line
revokes a principal at the next start.

### Token

Each request carries its own compact JWS (RFC 7515) as
`Authorization: Bearer <jws>`. As in DPoP (RFC 9449), the signature
binds the token to one runner, one request and one minute.

- Header: `alg` `Ed25519` only, the fully specified name of RFC 9864,
  which deprecates `EdDSA`; any other, `EdDSA` and `none` included, is
  refused. `kid` is the principal's name.
- Claims: `aud` is the DT `id`, a string; `iat` and `exp` in seconds,
  `exp` after `iat` by at most 60 s; `jti` random, of 16 to 64
  characters (the length is this plan's call). 30 s of clock skew are
  allowed either way.
- HTTP binding: `htm` is the method; `htu` the path, without host or
  query, as the runner receives it or with a prefix that a gateway
  strips (this plan's call); `bh` the base64url SHA-256 of the raw body
  bytes, of the empty string without a body.
- Replay: an accepted `jti` is kept until `exp` plus the skew, and a
  repeat is refused. The cache is in memory; a restart forgets it (this
  plan's call: a token lives at most 90 s). `Idempotency-Key` is not
  signed, as `jti` already stops a replay.

`alice` raising `close` sends the header
`{"alg":"Ed25519","kid":"alice"}` and these claims:

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

The token is `base64url(header).base64url(claims).base64url(signature)`,
the signature being `crypto.sign(null, signingInput, privateKey)`. `bh`
hashes the exact bytes sent:

```bash
printf '%s' '{"event":"close"}' | openssl dgst -sha256 -binary |
  basenc --base64url | tr -d '='
```

### MQTT Envelope

With `auth`, the payload of a request is the JWS itself. Its claims
are `aud`, `iat`, `exp`, `jti`, `topic` (the request topic) and `body`,
the JSON object of a plain request, absent for routes without one. The
runner verifies the token, compares `topic` with the packet's topic,
and dispatches `body` as it does a plain payload today. This works on
MQTT 3.1.1, which the demo's aedes broker speaks, and on MQTT 5. A
Manager's `execute`:

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

A refused request is answered on the response topic, as today, with
`statusCode` 401 or 403. The request key stays an MQTT 5 user property.
The broker's access control lists remain the outer wall, and the
README's MQTT Access Control section says so: `auth` decides who acts,
the broker who may publish and read at all, responses included.

### Script Token

With `auth`, the runner draws `RUNNER_TOKEN` at start, 32 random bytes
from `node:crypto` in base64url, and sets it for every script beside
`RUNNER_URL`. A script sends `Authorization: Bearer $RUNNER_TOKEN` and
acts in role `script`. The runner tells the token from a JWS by shape
(a JWS has two dots) and compares it with `timingSafeEqual`. A JWS of a
listed principal is accepted from a script too, in that principal's
role. Scripts keep an opaque token because the runner creates both
sides, so a key pair adds nothing, and PowerShell has no Ed25519. The
token is for HTTP only, the scripts' way to the runner (this plan's
call).

### Roles

| HTTP                             | MQTT route       | client | manager            | script |
| :------------------------------- | :--------------- | :----- | :----------------- | :----- |
| `GET /health`                    | `health`         | open   | open               | open   |
| `GET /dt`                        | `dt`             | yes    | yes                | yes    |
| `GET /state`                     | `state`          | yes    | yes                | yes    |
| `GET /`                          | `status`         | yes    | yes                | yes    |
| `GET /history`                   | `history`        | yes    | yes                | yes    |
| `GET /fsm`                       | `fsm`            | yes    | yes                | yes    |
| `GET /parameters`                | `parameters`     | yes    | yes                | yes    |
| `POST /`                         | `execute`        | yes    | `manager.commands` | no     |
| `POST /stop`                     | `stop`           | yes    | no                 | no     |
| `POST /fsm/transition`           | `transition`     | yes    | no                 | no     |
| `POST /fsm/event`                | `event`          | yes    | no                 | yes    |
| `POST /escalate`                 | `escalate`       | yes    | no                 | yes    |
| `PUT /parameters`                | `set-parameters` | yes    | yes                | no     |
| `PUT /peers` ([13](13-peers.md)) | `set-peers`      | yes    | yes                | no     |

[13](13-peers.md)'s `GET /peers` (`peers`) is open to all three roles,
as every `GET`. There is no `peer` role: a peer that calls a runner is
a principal like any other. A manager's command outside
`manager.commands` gets 403, so D24's "declared but not enforced"
becomes enforced.

### Errors

The body is Nest's `{ statusCode, message, error }`, over MQTT too.
Until the signature is checked, no message helps to guess a name.

| Case                                                    | Status | `message`                               |
| :------------------------------------------------------ | :----- | :-------------------------------------- |
| No header, or an MQTT payload that is no JWS            | 401    | `missing credential`                    |
| Not `Bearer`, not three base64url parts, not JSON       | 401    | `malformed credential`                  |
| `alg` not `Ed25519`, unknown `kid`, bad signature/token | 401    | `invalid credential`                    |
| `aud` not this DT, claims missing or of the wrong type  | 401    | `invalid claims`                        |
| Expired, issued in the future, or `exp - iat` over 60 s | 401    | `expired credential`                    |
| `htm`, `htu`, `bh` or `topic` differs from the request  | 401    | `credential does not match the request` |
| `jti` seen before                                       | 401    | `replayed credential`                   |
| Role refused, or a manager command not listed           | 403    | `<role> may not call <route>`           |

The 413 of an oversized body comes first; 401 and 403 come before the
validation error, as Nest runs guards before pipes, and the MQTT
handler keeps that order.

### Version

`auth` is opt-in and breaks no route, so the delivery rules ask for no
bump. A minor bump is recommended all the same, as API.md gains a wire
format for MQTT under `auth`.

### Considered and Set Aside

- **Shared bearer secrets**: they sit in `runner.yaml`, so reading it
  impersonates every caller, and a captured one works until rotated.
- **Mutual TLS**: the DTaaS gateway terminates TLS, and a broker sits
  between MQTT callers and the runner; neither passes a certificate on.
- **RFC 9421 message signatures**: no MQTT story, and a library for the
  canonicalisation.
- **The token in an MQTT 5 user property**: MQTT 5 only; it can come
  later for MQTT 5 brokers, beside the envelope.

## Plan

1. `src/auth/auth.config.ts`: the schema, an exported
   `publicKeySchema` for [13](13-peers.md) and
   [15b](15b-signed-output.md), `Role` and `Principal`
   (`{ name, role }`). `src/config/config.schema.ts:16-35` gains
   `auth`; `Config.loadConfig` (`configuration.service.ts:97-102`)
   builds an `Access` and `access()` returns it. `MqttService`,
   `FsmService` and the guard already receive `Config`, while an
   injectable would be a fourth parameter of `MqttService`'s
   constructor (`src/mqtt/mqtt.service.ts:54-58`).
1. `src/auth/jws.ts` (parse, `alg`, `kid`, `crypto.verify(null, …)`
   with an Ed25519 `KeyObject`), `claims.ts` (times, `aud`, bindings),
   `replay.ts` (`jti` cache, pruned on insert) and `access.ts`, the
   plain class `Access` with `scriptToken`,
   `http(authorization, { method, path, body })` and
   `mqtt(topic, payload)`, which return the principal (and `body`) or
   throw `UnauthorizedException`. `node:crypto` only; `jose` is added
   only if verification outgrows `jws.ts`.
1. `src/auth/roles.ts`: `ROUTE_ROLES`, a `Record` from each route of
   `mqttRoutes` (`src/mqtt/mqtt.config.ts:161-175`) to its roles or
   `public`, and `authorize`. Handlers name their row with
   `@AccessRoute('execute')`, a `SetMetadata`. One map, not roles per
   decorator, so that MQTT reads the same table and the compiler wants
   a row for every route.
1. `src/auth/access.guard.ts`, an `APP_GUARD` in `src/app.module.ts`,
   so that no new controller is missed; it receives Reflector, Config
   and FsmService. It allows all without `access()` and on `public`
   rows, refuses a handler without a row, verifies with `req.rawBody`,
   authorizes with `req.body?.name` and `fsm.managerCommands()`
   (`src/fsm/fsm.service.ts:126`), and sets `req.principal`.
   `src/main.ts:24` and `test/e2e/util.ts:24` pass `rawBody: true`.
1. The four controllers tag every handler. `newCommand`
   (`src/app.controller.ts:59-75`) swaps `@Headers(REQUEST_KEY)` for
   `@Caller()` (`src/auth/caller.ts`), which yields the checked key and
   `by`, so it keeps three parameters.
1. MQTT: `requestKey` and `publishOptions`
   (`src/mqtt/mqtt.service.ts:225-238`) and `parseJson`
   (`src/mqtt/mqtt-request.handler.ts:28-37`) move to
   `src/mqtt/mqtt-request.ts`, beside `openRequest`, which takes the
   packet, the payload and `access` and builds an `MqttRequest`
   (`{ body, requestKey, principal }`).
   `respond` passes no `access` on a `public` route and answers a thrown
   `HttpException` with its `getResponse()`. `handle(route, request)`
   (`mqtt-request.handler.ts:90-104`) gets the principal in its
   argument, so its constructor keeps three parameters; it calls
   `authorize` first, its catch turns an `HttpException` into its body,
   and `execute` passes `by`.
1. `newCommand`'s options become `RunOptions & { by?: string }`
   (`src/interfaces/command.interface.ts:32-37`), so no caller changes;
   `start` passes `by` to `enqueue(name, requestKey, by)`
   (`src/queue.service.ts:131`). First, `SCHEMA` and `addExitCode`
   (`queue.service.ts:23-74`) move to `src/queue.schema.ts`, where
   `addColumn` migrates `exit_code` and `by`.
1. `src/fsm/script-context.ts`: `RUNNER_VARIABLES` (line 46) and
   `ScriptContext` gain the token, and `setUrl` becomes `setApi`, of
   the URL and the token; `FsmService.setRunnerUrl` becomes
   `setRunnerApi`, line for line, as `fsm.service.ts` has 248 lines;
   `src/main.ts:38` passes
   `config.access()?.scriptToken`. `Send-Runner` of
   `demo/hospital/scripts/ward.ps1` and `test/data/scripts/raise-event`
   and `raise-event.ps1` always send the header.
1. Demo: `tools/keygen.mjs NAME DIR` writes `NAME.key` (PKCS#8 PEM,
   mode 0600) and `NAME.pub`. `tools/sign.mjs` signs HTTP and MQTT
   requests for `tools/shell.sh`'s `dt` (which keeps its call shape,
   reading `-X` and `--json`), `mq.mjs` and `waits.mjs`. `record.mjs`
   generates `alice` and `manager-1` into `run/keys/` and writes a
   git-ignored `runner.auth.yaml` for `tools/runner.mjs`. `dt` signs as
   `alice`, `mq` as `manager-1` (this plan's call), `DT_AS` overrides.
1. `api/dev.api.http` gains a `{{@request}}` script that signs with
   `node:crypto` from `@keyFile`, skipped when empty;
   `api/dev.mqtt.http` shows a payload made with `sign.mjs mqtt`.

## Tasks

- [x] The schema accepts the example and refuses a duplicate name,
      `script`, an unknown role or key, and a bad `publicKey`. Check:
      `test/unit/auth.schema.spec.ts`.
- [x] A valid JWS verifies; `alg` `none`, `EdDSA` or `HS256`, an
      unknown `kid`, a bad signature and a malformed token give the
      table's messages.
      Check: `test/unit/auth.jws.spec.ts`.
- [x] `aud`, skew both ways, `exp - iat` over 60 s, `htm`, `htu` with a
      prefix, `bh` of no body and of JSON, `topic`, and a `jti` refused
      until `exp` plus 30 s. Check: `test/unit/auth.claims.spec.ts` and
      `test/unit/auth.replay.spec.ts`, with a fake clock.
- [x] `Access` takes the script token and refuses another of its
      length; `authorize` follows every row of the role table. Check:
      `test/unit/auth.access.spec.ts`, `test/unit/auth.roles.spec.ts`.
- [x] Every handler has an `AccessRoute`; the guard allows all without
      `auth`. Check: `test/unit/auth.guard.spec.ts`.
- [x] Over HTTP, with `access()` spied as `getMqtt` is in
      `test/e2e/mqtt.util.ts`: the 401 cases, 403 for a manager's
      `open`, 200 for its `admit`, `/health` without a header. Check:
      `test/e2e/auth.spec.ts`. No test file name holds `.env`, which
      Qlty takes for a dotenv file; use `*-env.spec.ts`.
- [x] A state's script raises an event with `RUNNER_TOKEN`; without
      `auth` the variable is absent. Check:
      `test/e2e/auth.script.spec.ts` and
      `test/unit/script-context.spec.ts`.
- [x] Over aedes: an enveloped `execute` runs; a plain payload, a wrong
      `topic` and a manager's `stop` are refused; without `auth` a plain
      payload runs. Check: `test/e2e/auth.mqtt.spec.ts`; the handler
      specs and `test/unit/mqtt.fixture.ts` follow `handle`. Grep
      `test/e2e/mqtt.broker.spec.ts`, which runs only in CI, too.
- [x] `by` is stored, `NULL` without `auth`, and an old database gains
      the column. Check: `test/integration/queue.migration.spec.ts`.
- [x] Verification uses `node:crypto` alone. Check: no dependency in
      `git diff package.json`.
- [x] The demo signs. Check: `node tools/record.mjs` completes and
      `run/transcript.txt` holds no 401.
- [x] `README.md`: the warning, an Access Control section, Manager
      Commands and MQTT access control; `config/runner.yaml.sample`: a
      commented `auth`; `DEVELOPER.md`: the key tools and the spied
      access. Check: markdownlint and yamllint.
- [x] `api/API.md`: Conventions, Routes (roles), MQTT Access Control
      (envelope), Calls From Scripts (`RUNNER_TOKEN`); the examples
      note the header and are re-captured in [16](16-peer-events.md).
      The request files as planned. Check: markdownlint; one request of
      each file by hand.
- [x] `docs/state-machine-design.md`: a decision with the next free D
      number when the PR is opened, A8 amended, D24 enforced.
      `docs/issues/README.md`: a 15a row; [15](README.md#status) leaves
      Deferred and Non-Goals. Check: markdownlint.
- [x] `yarn syntax`, `yarn build`, `yarn test --maxWorkers=2` and
      `npx tsc --noEmit --noUnusedLocals --noUnusedParameters` pass;
      changed files stay under 250 lines, functions under 25. Check:
      their output and `wc -l`.

## Learnings

- **Drift.** `mqttRoutes` sits at `src/mqtt/mqtt.config.ts:26-40`, not
  `:161-175` (the file has 82 lines), and `setRunnerUrl` at
  `src/fsm/fsm.service.ts:91-94`. The other line numbers held.
- **`createPublicKey` takes any 32 bytes** as the `x` of an Ed25519
  JWK: OpenSSL does not check that they are a point of the curve. The
  schema thus refuses a key of the wrong alphabet or length, but not an
  X25519 key or other 32 bytes; such a principal is listed and every
  token of it fails as `invalid credential`. The plan's "a key that
  `createPublicKey` rejects" is only the wrong length.
- **`by` is an SQL keyword** (`ORDER BY`), yet SQLite takes it unquoted
  as a column name in `CREATE`, `ALTER`, `INSERT` and `SELECT`, so the
  queries need no quotes. `CommandRecord` and `toRecord` do not read it
  yet; [11](11-history-metrics.md) adds it to the history.
- **Qlty shaped two signatures.** `authorize(principal, route, listed)`
  takes a boolean that `listedCommand(managerCommands, body)` computes,
  rather than the list and the body, to stay at three parameters; the
  guard and the MQTT handler share both. `MqttRequestHandler.handle`
  splits into `authorize` and `failure`, and `MqttService.respond` into
  `answer`, to keep each under complexity 5.
- **"No JWS" over MQTT** became: an empty payload, or one that starts
  with `{`, is `missing credential`; anything else is parsed as a JWS
  and is `malformed credential` if it is not one. The script token sent
  over MQTT is thus malformed, as it is for HTTP only. Over HTTP a
  bearer without dots is taken for the script token (`invalid
credential` if it differs); one with one dot, or more than two, is
  malformed.
- **A lifetime of 0 s or less** (`exp` not after `iat`) is `expired
credential`, as the spec's "after `iat` by at most 60 s" implies.
- **`@Caller()` throws inside the parameter factory** for a request key
  over 255 characters; Nest turns that into the same 400 as before. The
  guard reads `config.access()` on every request, so the e2e tests spy
  it after the start, as `getMqtt` is spied.
- **Git Bash converts a path argument.** `dt` of the demo calls
  `node tools/sign.mjs http GET /dt`, and MSYS turned `/dt` into
  `C:/Program Files/Git/dt`, so every signed request was refused with
  `credential does not match the request`. `MSYS_NO_PATHCONV=1` on that
  call fixes it.
- **The recording rewrites `hospital.cast`.** The check of the demo ran
  `record.mjs` (no 401 or 403 in `run/transcript.txt`), and the cast
  was restored afterwards: [16](16-peer-events.md) re-captures the
  examples.
- **httpYac** runs a `{{@request}}` script of the global region before
  every request, with `request.body` as the string sent and `require`
  and `__dirname` available; a signed run of `dev.api.http` gave no
  401, and an unsigned one 401 for all but `/health`. `httpyac` refuses
  a file outside its working directory.
- **Qlty locally.** `qlty smells --upstream` found no smell in the
  changed files, and `qlty check --upstream` only shfmt's indentation of
  `case` branches in the demo's `tools/shell.sh`. A full test run while
  Qlty ran timed out once in `test/e2e/options.spec.ts`, which passed on
  a run without other load.
- **Version.** The recommended bump took the runner to 0.9.0, so
  [11](11-history-metrics.md), which planned 0.9.0, goes to 0.10.0.
- **For [13](13-peers.md) and [15b](15b-signed-output.md).**
  `src/auth/auth.config.ts` exports `publicKeySchema` and
  `publicKeyObject(x)`; `src/auth/jws.ts` exports `ALG`,
  `encodeSegment`, `parseJws` and `verifyJws(jws, keyOf)`, which
  [13](13-peers.md) calls with a `keyOf` that knows only the peer's
  `kid`; `ROUTE_ROLES` in `src/auth/roles.ts` is a
  `Record<MqttRoute, …>`, so [13](13-peers.md)'s new routes need their
  rows to compile.
