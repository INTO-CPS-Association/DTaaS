# 15b Signed Output

## Spec

An open DT network must guard against the introduction of malevolent
DTs, and its DTs must be able to trust each other.
[15a](15a-access-control.md) lets the runner verify who calls it;
nothing yet lets a receiver verify the runner. [16](16-peer-events.md)
must know that a state document came from the peer it lists, and a
Manager must know that an escalation came
from the DT, not from anyone who can publish on the broker. This
feature signs everything the runner sends on its own or in reply, with
a private key of the DT, so that a receiver holding the public key can
check origin and integrity.

### Configuration

```yaml
auth:
  # optional; an Ed25519 private key, PEM PKCS#8, relative to this file
  key: 'keys/hospital-1.key'
```

`auth.key` sits in the `auth` section of [15a](15a-access-control.md)
and is independent of `auth.principals`: a runner may sign without
verifying callers, and the reverse. [15a](15a-access-control.md)'s rule
that `auth` needs one principal at least becomes "`principals` or
`key`", so a stray `auth:` still fails (this plan's
call). The path is resolved against the directory of `runner.yaml` with
`path.resolve`, so an absolute path works too, as for `stateMachine`
(this plan's call: a key often lives in a mounted secret directory).
The `keygen.mjs` of [15a](15a-access-control.md) generates the file:
`NAME.key` beside `NAME.pub`. A file that cannot be read, an encrypted
key, or a key that is not Ed25519 is a startup error naming the file,
never its content.

Without `auth.key` nothing changes: every payload is plain JSON, as
today.

### What Is Signed

With `auth.key`, each payload below is a compact JWS (RFC 7515) whose
payload is exactly today's JSON, the bytes of `JSON.stringify`:

| Output                        | Today                   | With `auth.key`                    |
| :---------------------------- | :---------------------- | :--------------------------------- |
| Notifications, MQTT           | JSON envelope           | JWS of the envelope                |
| Notifications, webhook        | `application/json` body | `application/jose` body, JWS       |
| MQTT responses                | JSON body of the reply  | JWS of the body                    |
| MQTT will (`notify/presence`) | JSON, `time: null`      | JWS, built with the client options |
| HTTP replies                  | JSON                    | JSON, unsigned                     |

The JWS protected header is `{"alg":"Ed25519","kid":"<id>"}`, `kid`
being the DT's `id` and `alg` the fully specified name of RFC 9864, as
in [15a](15a-access-control.md). No claim is added to the payload: the
payload is the envelope of S7, and its `id` and `time` bind it to the DT and the
moment. There is no `exp`, because notifications are retained and must
stay verifiable: a Manager that connects hours later reads the retained
state document and must still check it. The will keeps `time: null`;
its JWS is built once, as the will is fixed at connect, and stays valid
across reconnects.

The webhook body is `application/jose`, the media type RFC 7515
registers for the compact serialisation (this plan's call).
`application/jwt` (RFC 7519) declares the payload a JWT claims set,
which the envelope is not; a JWT library would look for claims such as
`exp`. The `notify.token` bearer of [03](03-state-notifications.md)
stays: it authenticates the runner to the webhook, and the signature
lets the receiver check every body, including those it stores or
forwards.

Ed25519 is deterministic, so a notification signed for MQTT and again
for the webhook gives the same JWS. A signed state document grows from
303 to 538 bytes.

Not signed, with the reason:

- HTTP replies: the caller chose the endpoint, TLS and the DTaaS
  gateway protect the reply, and [15a](15a-access-control.md)
  authenticates the caller.
- Freshness: a signature proves origin and integrity, not that a
  message is new. Anyone who can publish on the notification topics
  could replay an old signed document or will; broker access control
  (API.md, "Access Control") still limits that, and a receiver that
  must not go back in time compares `time` with the last one it took.
  The will in particular has no time to compare: it keeps
  `time: null`, so a captured will stays valid for as long as the
  key does.
- Key rotation and more than one key: a new key is a restart and a new
  public key for every receiver.

A retained plain notification of an earlier run and a signed one share
a topic. The runner publishes its online notice on every connect and
its state document at startup, so both retained topics are replaced as
soon as it connects; a receiver that requires signatures drops the
plain one it may get first and waits.

### Example

The first state notification of API.md ("State Notifications") is
published on `dtaas/hospital-1/notify/state` as one line,
`<header>.<payload>.<signature>`, here broken before each dot and with
`[…]` for the omitted characters:

```text
eyJhbGciOiJFZERTQSIsImtpZCI6Imhvc3BpdGFsLTEifQ
.eyJraW5kIjoic3RhdGUiLCJpZCI6Imhvc3BpdGFs[…]Y29tbWFuZCI6bnVsbH19
.v_KFdD90vdjrRhp6p_r8[…]
```

The header decodes to `{"alg":"Ed25519","kid":"hospital-1"}`. The
payload, 404 characters, decodes to the envelope unchanged:

```json
{
  "kind": "state",
  "id": "hospital-1",
  "time": "2026-10-26T14:55:41.712Z",
  "data": {
    "id": "hospital-1",
    "time": "2026-10-26T14:55:41.712Z",
    "machine": {
      "state": null,
      "status": "none",
      "entry": 0,
      "events": ["beds-free", "close", "full", "reopen", "scope-changed"]
    },
    "parameters": { "scope": "single", "capacity": 2 },
    "command": null
  }
}
```

The signature is 86 base64url characters, the 64 bytes of Ed25519.

### Verifying

A consumer verifies with the public key its operator gave it: a peer's
`peers[].publicKey` of [13](13-peers.md), or a Manager's own list. The
encoding of [15a](15a-access-control.md) is the base64url of the 32 raw
bytes, the JWK's `x`, so in Node
`key` is `createPublicKey({ key: { kty: 'OKP', crv: 'Ed25519', x },
format: 'jwk' })`:

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

A payload that starts with `{` is plain JSON from a runner without a
key; whether to accept it is the consumer's choice
([16](16-peer-events.md) accepts it only from a peer listed without a
key).

### Descriptor

`GET /dt`, the MQTT `dt` route and the online notice gain `publicKey`:
the runner's public key in the encoding of [15a](15a-access-control.md)
with `auth.key`, `null` without (this plan's call, from the intent that
an operator can copy it into a peer's configuration). An operator who
copies it over plain HTTP trusts that connection; `keygen.mjs` prints
the same key.

### Considered and Set Aside

- A detached signature in an MQTT 5 user property or an HTTP header:
  MQTT 3.1.1, which the demo's aedes broker speaks, has no user
  properties, and two mechanisms would mean two verifiers.
- A `sig` field inside the JSON: the signer and every verifier would
  need the same canonical JSON (RFC 8785), and the envelope would
  change.
- Signing HTTP replies: see "Not signed" above.
- A `typ` header (this plan's call): a notification cannot pass for a
  request token of [15a](15a-access-control.md), which needs `aud`,
  `exp` and `jti`, so the header stays at `alg` and `kid`.
- An MQTT 5 `contentType` of `application/jose` on signed publishes
  (set aside in review): the demo's broker speaks MQTT 3.1.1, which has
  no such property, and a payload that parses as JSON is plain, as a
  JWS never does, which already tells the two apart.

Signing is opt-in and breaks no route; the descriptor gains a field.
The version stays as [15a](15a-access-control.md) leaves it, as for
[07](07-presence.md). The Notifications section of API.md describes an
optional encoding, not a changed one, so it does not count as a change
(recommendation).

## Plan

1. Review this plan against the code as [15a](15a-access-control.md)
   left it: the `auth` schema, its directory (assumed `src/auth/`), the
   public key encoding and the line counts below.
1. `src/mqtt/mqtt.service.ts` is at 239 lines.
   [15a](15a-access-control.md) moves `requestKey` and `publishOptions`
   to `src/mqtt/mqtt-request.ts`; before adding anything, move
   `responseTopic` (lines 211-223 today) there too, as the pure
   `responseTopic(topic, packet, routes)`.
1. `src/auth/signer.ts`, beside [15a](15a-access-control.md)'s
   `jws.ts`, whose base64url and header helpers it reuses: a plain,
   non-injectable `Signer` built from a `KeyObject | undefined` and the
   `kid`. It encodes the header
   once, and has `encode(value): string` (JSON without a key, JWS with
   one, through `crypto.sign(null, …)`), `contentType()` and
   `publicKey()`
   (`string | null`, computed once). `Signer.load(file, dir, id)` gives
   a `Signer` without a key when `file` is undefined; otherwise it reads
   the PEM, calls `createPrivateKey` and checks
   `asymmetricKeyType === 'ed25519'`.
1. [15a](15a-access-control.md)'s `auth` schema
   (`src/auth/auth.config.ts`) gains `key: z.string().min(1).optional()`,
   and its rule of one principal at least becomes "`principals` or
   `key`".
   `src/config/configuration.service.ts`: `loadConfig` builds
   `this.signer` with `Signer.load`; `getSigner(): Signer`; the field
   starts as a `Signer` without a key for the default configuration.
   Every service that sends already injects `Config`, so no constructor
   changes and no new injectable.
1. `src/mqtt/mqtt.config.ts`: `presenceWill(base, id, signer)` and
   `clientOptions(options, id, signer)` encode the will with the
   signer. `mqtt.service.ts`: `start` passes `config.getSigner()`;
   `respond` (line 179) and `notify` (line 202) publish
   `config.getSigner().encode(body)`; so does any publish
   [15a](15a-access-control.md) added.
1. `src/notify/webhook.client.ts`: `post` and `sendOnce` encode with
   the signer; the module-level `headers(token)` becomes a private
   method that adds the signer's content type, so `attempt` keeps three
   parameters. `Notifier` is unchanged: the will and the responses
   never pass it, so the transports sign.
1. `src/dto/descriptor.dto.ts` gains `publicKey: string | null`;
   `DescriptorService.describe` sets it from `config.getSigner()`.
1. Tests: unit fakes of `Config` (`test/unit/mqtt.fixture.ts`,
   `test/unit/webhook.fixture.ts`, `descriptor.service.spec.ts`) gain
   `getSigner`. Test keys are generated in the test with
   `generateKeyPairSync('ed25519')` and written to a temporary
   directory; no key file is committed. `test/e2e/jws.util.ts` holds
   `unwrap(text, key?)` (decodes, and verifies when given a key);
   `nextNotification` of `test/e2e/mqtt.util.ts` (line 114) and the
   parse of `test/e2e/webhook.util.ts` (line 25, behind `received()`)
   call it and keep the raw text beside the body. Descriptor equalities
   gain `publicKey: null`.
1. Demo: `demo/hospital/tools/jws.mjs` unwraps and verifies with the
   public key in `run/keys/hospital-1.pub`, which `keygen.mjs` of
   [15a](15a-access-control.md) writes, when that file exists;
   `services.mjs` and `mq.mjs` prefix each line with `verified` or
   `UNSIGNED`, and a
   JWS that fails, or has no key to check it, prints `INVALID` and is
   not summarised (this plan's call). The demo's `runner.yaml` stays
   unsigned, as the recording is; `demo/hospital/README.md` says how to
   turn signing on (a key in `run/keys/` and `auth.key` in
   [15a](15a-access-control.md)'s `runner.auth.yaml`).
1. Documents: see the sweep tasks.

## Tasks

- [x] `mqtt-request.ts` holds `responseTopic` and the service shrinks
      by it, with the existing response tests unchanged. Check:
      `test/unit/mqtt.service.spec.ts` and `wc -l`.
- [x] Without a key `encode` equals `JSON.stringify`, `publicKey()` is
      `null` and the type is `application/json`; with one, the JWS has
      three segments, the header `{alg, kid}`, the payload the bytes of
      `JSON.stringify`, and verifies; a changed payload does not. Check:
      `test/unit/signer.spec.ts`.
- [x] `Signer.load` fails, naming the file, for a missing file, an
      RSA key, an X25519 key and a public key. `auth.key` is accepted
      without `principals`, and resolved against the config's
      directory. Check: `test/unit/signer.spec.ts`,
      `test/unit/config.schema.spec.ts`, `test/unit/config.key.spec.ts`
      (no `.env` in any new file name).
- [x] The will, a notification and a response are JWS with a key and
      plain JSON without. Check: `test/unit/mqtt.config.spec.ts`,
      `test/unit/mqtt.signed.spec.ts` (new, as `mqtt.service.spec.ts`
      has 215 lines).
- [x] The webhook posts a JWS as `application/jose` with the bearer
      token, and `sendOnce` too; without a key, today's JSON. Check:
      `test/unit/webhook.signed.spec.ts`.
- [x] `describe()` gives `publicKey` with a key and `null` without.
      Check: `test/unit/descriptor.service.spec.ts`,
      `test/e2e/descriptor.spec.ts`.
- [x] A runner with a key, on the local aedes broker: the retained
      state notification, a `dt` response and the will after a cut
      connection verify with the `publicKey` of `GET /dt`, while
      `GET /state` stays JSON; the webhook receives `application/jose`.
      Check: `test/e2e/signed.spec.ts` with `test/e2e/jws.util.ts`.
- [x] Existing e2e tests pass through the unwrapping helpers.
      `test/e2e/mqtt.broker.spec.ts` runs only in CI against Mosquitto,
      without a key; grep it for descriptor shapes. Check:
      `test/e2e/mqtt.spec.ts`, `test/e2e/mqtt.presence.spec.ts`,
      `test/e2e/webhook.spec.ts`, the CI run.
- [x] Demo tools print `verified`, `UNSIGNED` or `INVALID`. Check: run
      the demo once with and once without `auth.key` and read
      `run/mqtt.log` and `run/webhook.log`.
- [x] `README.md`: `auth.key` in [15a](15a-access-control.md)'s
      configuration section, the "MQTT", "Webhook" and "Notifications"
      sections. Check: those sections.
- [x] `api/API.md`: the `publicKey` row of `GET /dt`, "Responses",
      "Over a Webhook" and a "Signatures" subsection of
      "Notifications" with the example above. Check: those sections.
- [x] `api/dev.mqtt.http`: the `notifications` request says payloads
      are JWS with `auth.key`. Check: the request's comment.
- [x] `docs/state-machine-design.md`: a decision, numbered the next
      free D number when the PR is opened ("outbound messages are a
      JWS of today's JSON when `auth.key` is set"), with A8 amended.
      Check: the Decisions table and A8.
- [x] `DEVELOPER.md`: tests generate their keys; `jws.util.ts`. Check:
      its test section.
- [x] `config/runner.yaml.sample`: a commented `key` under `auth`.
      Check: yamllint and the sample.
- [x] `yarn syntax`, `yarn build`, `yarn test --maxWorkers=2` and
      `npx tsc --noEmit --noUnusedLocals --noUnusedParameters` pass;
      every changed file stays under 250 lines and every function under
      25, with Qlty's limits on complexity, parameters and returns.
      Check: their output and `wc -l`.

## Learnings

- **Drift.** `mqtt.service.ts` had 232 lines, not 239, after
  [15a](15a-access-control.md), with `responseTopic` at lines 219-231,
  `respond`'s publish at 169-173 and `notify`'s at 210;
  `test/unit/mqtt.service.spec.ts` had 221 lines. `DescriptorService` is
  `src/descriptor.service.ts`. [15a](15a-access-control.md) tests a
  configuration that reads files in `test/integration/`
  (`config.auth.spec.ts`), so `config.key.spec.ts` went there, not to
  `test/unit/`. The other references held.
- **`responseTopic` and [13](13-peers.md).** The branch of
  [13](13-peers.md) had already moved `responseTopic` as
  `responseTopic(topic, packet, isRequest)`, with a predicate instead of
  the plan's map of routes. 15b took the same signature and the
  identical hunk in `mqtt-request.ts`, so that the
  move merges; `mqtt.service.ts` still conflicts, as both change its
  imports and the publish in `respond`. Whichever of [13](13-peers.md)
  and 15b merges second rebases there. [13](13-peers.md) merged first,
  and the merge took the move as one hunk; only the publish in
  `respond` conflicted.
- **Decision number.** [11](11-history-metrics.md) and
  [13](13-peers.md) both recorded their decision as D30, and the second
  to merge renumbers to D31, so 15b's decision is D32; the table skips
  D30 and D31 until both merge. The row of D32 is kept within the width
  of the Reason column, so prettier does not re-pad the whole table,
  which would conflict with [11](11-history-metrics.md) and
  [13](13-peers.md).
- **The spec's example.** Its header segment
  `eyJhbGciOiJFZERTQSIs…` decodes to `"alg":"EdDSA"`, not `Ed25519`.
  The real one is `eyJhbGciOiJFZDI1NTE5Iiwia2lkIjoiaG9zcGl0YWwtMSJ9`,
  two characters longer, so the signed document has 540 bytes rather
  than 538. The payload, 404 characters, and the 86 of the signature
  held.
  API.md gives the corrected values.
- **`auth`.** `principals` became optional and the section refines to
  "principals or a key"; zod 4 reports that rule at `auth`. Access
  control is built only from `principals`, so a section with only a
  key leaves every route open, as the spec says.
- **Key errors.** OpenSSL 3 refuses an encrypted PEM without a
  passphrase with `interrupted or cancelled` and a public key with
  `DECODER routines::unsupported`, neither of which says why, so the
  error reads "Cannot read FILE as an unencrypted PEM private key"
  with OpenSSL's reason and the caught error as `cause`. An X25519 or
  RSA key loads and is refused by `asymmetricKeyType`.
- **Fakes and Qlty.** `createService` of
  `descriptor.service.spec.ts` already had three parameters, so its
  fake `Config` takes `getSigner` from a module-level `jest.fn` that a
  test overrides once, rather than a fourth parameter. `setup` of the
  MQTT and webhook fixtures takes the signer as a defaulted last
  parameter. The e2e `unwrap` splits its check into `verifies` to stay
  under complexity 5. `qlty` is not installed here, so CI is the
  check.
- **`raw` beside `body`.** A notification of `test/e2e/mqtt.util.ts`
  and a post of `webhook.util.ts` now carry the payload as received,
  so the five equalities that compared a whole notification carry it
  too, two of them in `mqtt.broker.spec.ts`, which runs only in CI.
  `nextReply` unwraps as well, but has no `raw`, as nothing verifies a
  reply of it.
- **`signed.spec.ts`** spies `Config.prototype.getSigner` before the
  start, as `webhook.spec.ts` spies `getNotify`, because the MQTT
  helper starts the runner from the shared test configuration. The
  loading of `auth.key` from a file is covered by `config.key.spec.ts`
  and by `GET /dt` in `descriptor.spec.ts`, which starts a runner from
  a `runner.yaml` with a key.
- **eslint lints the TypeScript now** (since `a82e10a3`), so the first
  lesson of the README no longer holds: `yarn syntax` reported
  `preserve-caught-error` in `signer.ts`.
- **The demo.** `record.mjs` ran twice. Unsigned, all 30 lines of
  `run/mqtt.log` and of `run/webhook.log`, the three `mq` responses and
  the retained notifications were `UNSIGNED`. With `auth.key` added to
  `runner.auth.yaml` by a change to `record.mjs` that was not
  committed, all of them were `verified`, and `mq dt` showed the
  `publicKey`. A JWS of another key, and one checked without
  `run/keys/hospital-1.pub`, gave `INVALID`. `hospital.cast` was
  restored after each run; the recording stays as it is, so API.md's
  logged outputs gained the marks only where the tools print them
  today.
- **Merging [13](13-peers.md).** 15b merged `feature/distributed-demo`
  twice, after [11](11-history-metrics.md) and after [13](13-peers.md),
  rather than rebasing, as its pull request was open.
  The second merge conflicted in twelve files: the descriptor got
  both `peers` and `publicKey`, in that order, in the type, the
  service, every descriptor equality and the documents; Signed Output
  and Peers both stayed in the README, `auth.key` before `peers` in the
  sample, and D31 before D32. [13](13-peers.md)'s `readNotice` verifies
  a peer's notice with the peer's id as `kid`, the `kid` that `Config`
  gives the
  `Signer`, but its tests signed with `test/sign.util.ts`; so
  `test/unit/peer-notice.signed.spec.ts` feeds it what `Signer`
  encodes, the will included, and `test/e2e/mqtt.peers.signed.spec.ts`
  runs a runner that follows a signed peer runner, which fails when
  the listed key is another.
- **Review.** Four changes came from the review of the pull request.
  The tests verify through one helper, `verifiedPayload` of
  `test/sign.util.ts`, over `parseJws` and `verifyJws`, instead of
  three hand-made verifiers; the demo's `jws.mjs` stays standalone, as
  the runnable form of the verifier in API.md. `auth.key` is resolved
  in `resolvePaths` beside `stateMachine`, so `Signer.load` takes
  `(file, id)` rather than the plan's `(file, dir, id)`. The demo's
  verifier treats a missing or half-written key file as no key, where
  it threw inside the MQTT and webhook handlers, and an `INVALID` line
  gives the reason and the payload marked unverified. Tests were added
  for an `auth` section with principals and a key, and for the
  `publicKey` of the signed online notice. The review left the will's
  `time: null` as it is, with a sentence on replay in "Not signed",
  and set aside an MQTT 5 `contentType`.
- **Plain responses are not all objects.** The spec's rule that a
  payload starting with `{` is plain JSON holds for notifications, but
  an MQTT response may be an array: `history` replies `[]`. The e2e
  `unwrap` took `[]` for a JWS and threw, which only
  `mqtt.broker.spec.ts` in CI showed, as no local test reads a history
  reply over MQTT. The test helpers and the demo's `jws.mjs` now take
  any payload that parses as JSON as plain, since a JWS never does,
  and API.md says so.
- **Version.** The plan keeps the version as the earlier issues leave
  it. [11](11-history-metrics.md) merged first and took the runner to
  0.10.0, so 15b stays at 0.10.0, merged with
  `feature/distributed-demo` rather than rebased, as the pull request
  was already open.
