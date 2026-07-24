# DTaaS Logger Architecture

This document describes the current architecture of the DTaaS logger and the
roadmap it leaves open. The backend logger is intentionally small: it receives
client workflow events, validates them, and persists them as JSON Lines.

## Purpose and scope

DTaaS supports two logging sinks:

- local browser storage, backed by IndexedDB in the client;
- optional remote streaming to the logger microservice.

Those sinks are separate consent decisions. Local logging can remain enabled
while remote logging is disabled. Remote logging is only enabled when the user
opts in and a logger URL is configured.

The backend logger is reusable outside the DTaaS client. That means CORS is a
compatibility feature, not an ingest security boundary. Authentication and
deployment controls must provide the security boundary.

## Current implementation

### Client

The client reads a single global `LOGGER_URL` from runtime configuration. The
URL must include the logger route prefix, for example:

```javascript
LOGGER_URL: 'https://example.com/logger';
```

The client validates reachability by appending `/health`, so the example above
checks `https://example.com/logger/health`.

Remote events are sent with `navigator.sendBeacon`. Beacon requests are
fire-and-forget, use HTTP `POST`, and are sent as
`Content-Type: text/plain;charset=UTF-8` even though the body is JSON text. The
client does not consume response statuses, so remote logging failures are best
observed through service metrics, logs, or health checks.

The settings store applies consent rules so that:

- remote logging is disabled when no logger URL is configured;
- an old opt-in does not silently carry over to a different logger origin;
- local logging consent is not clobbered merely because a remote logger appears
  or disappears.

### Backend

The NestJS service exposes:

- `POST /logger` for ingest;
- `GET /logger/health` for health checks.

Incoming bodies are parsed as JSON for both `application/json` and `text/plain`.
The production app disables Nest's default body parser and registers the logger
parser explicitly, using the configured max payload size.

Log events are validated with Zod. The schema currently enforces:

- UUID session IDs;
- SHA-256-shaped `userHash` values;
- ISO timestamps;
- known event names: `click`, `change`, `navigation`, `notification`,
  `dismiss`;
- bounded string fields;
- bounded context depth, entry count, key length, and string value length.

Events are appended as one JSON object per line. The service serializes writes,
repairs missing trailing newlines after external truncation, rotates the active
log at the configured size, and keeps the configured number of rotated files.

### Configuration

The logger loads configuration from, in order:

1. CLI `--config <file>` / `-c <file>`;
2. `LOGGER_CONFIG_PATH`;
3. `logger.yaml` in the current working directory, if present;
4. built-in defaults.

Environment variables override YAML values.

Important defaults:

- hostname: `127.0.0.1` for bare local starts;
- port: `4003`;
- CORS allow origin: disabled unless configured;
- CORS credentials: disabled unless configured with explicit origins;
- auth token: empty, meaning unauthenticated ingest;
- throttle: 120 requests per 60 seconds per TCP peer;
- max payload: 64 KiB;
- log rotation: 50 MiB active file, 5 retained rotated files.

### Authentication and deployment boundary

The service supports an optional static bearer token configured by
`auth-token` / `LOGGER_AUTH_TOKEN`.

This token is not a JWT: it is a shared secret compared in constant time. It is
for non-browser producers that can send an `Authorization: Bearer <token>`
header.

The bundled DTaaS browser client cannot use that header-based auth mode because
`navigator.sendBeacon` cannot set custom headers. Browser ingest security is
therefore delegated to the reverse proxy in deployments that expose the logger
to users.

The deployment compose files route `/logger` through Traefik. Server-style
deployments use `traefik-forward-auth`; the service also applies an internal
request throttle for callers that bypass the proxy. The throttle intentionally
uses the TCP peer rather than forwarded headers, which makes its budget shared
by all users when Traefik proxies requests. Deployments should scale the
throttle limit to their aggregate expected request volume.

## Security considerations

- CORS does not prevent forged writes. It controls browser response visibility,
  not whether a simple `text/plain` POST reaches the service.
- Remote logs are analytics records, not a security audit trail.
  `userHash`, `sessionId`, event names, page paths, labels, and context are
  client-supplied.
- Username hashing is pseudonymization, not anonymization. The same username
  produces the same hash.
- Production deployments should store logger output outside user workspaces and
  the library service.
- Log writes are best-effort. Graceful shutdown closes the stream, but recent
  events may be lost on hard container termination because writes are not fsynced
  per request.
- Production deployments should provide authentication or proxy gating, an
  explicit CORS policy where cross-origin browser clients are expected, and
  monitored disk capacity.

## Known gaps

The current implementation still has a few deliberate or pending limitations:

- The browser client has one global remote logger URL. Per-DT-Asset logger
  selection is not implemented.
- Standalone authenticated browser ingest is not implemented because the current
  browser transport cannot send auth headers.
- The static bearer token mode is not JWT verification and has no issuer,
  audience, signature, or expiry checks.
- The server schema must stay aligned with the client event type. Any new client
  event fields should be added to the server schema and fixtures before release.

## Target architecture

The desired long-term shape is:

```text
DT Asset construction
  -> LoggerResolver.resolve(asset)
  -> LoggerBinding { sinkId, url, enabled, auth }
  -> logger instance bound to the asset

User interaction
  -> local sink, if local logging is enabled
  -> remote sink, if remote consent and binding allow it
```

This introduces three stable seams:

- `LoggerResolver`: decides which logger an asset should use;
- `AuthStrategy`: decides how ingest is authenticated;
- `Transport`: chooses `sendBeacon` for unauthenticated/proxy modes or
  `fetch(..., { keepalive: true })` when headers are required.

Consent remains a single user-level remote logging decision. Per-sink consent can
be added later using `sinkId` if product or privacy requirements demand it.

## Roadmap

### Phase 0 — Baseline hardening

Implemented or in progress:

- separate local and remote consent;
- reproducible logger dependency install with `yarn.lock`;
- explicit body parser limits for JSON and Beacon `text/plain`;
- restrictive default CORS;
- static bearer token renamed away from JWT terminology;
- request throttling and bounded log rotation;
- documentation of reverse-proxy responsibility and best-effort persistence.

Remaining baseline work:

- keep the server schema aligned with future client event fields before release.

### Phase 1 — LoggerResolver seam

Add a resolver that returns a logger binding from the global `LOGGER_URL`. This
does not change behavior, but removes direct global URL reads from asset logging
paths.

### Phase 2 — Standalone browser authentication

Introduce an explicit auth mode such as `none | proxy | token | jwt`. If browser
clients need standalone authenticated ingest, switch from Beacon to
`fetch(..., { keepalive: true })` when headers are required.

If JWT mode is added, verify signature, expiry, issuer, and audience. Decide
whether tokens come from the existing identity provider or from a logger-scoped
issuer.

### Phase 3 — Per-DT-Asset logger resolution

Allow the resolver to read asset metadata during construction and choose a
logger URL per asset, falling back to the global default.

### Phase 4 — Optional per-sink consent

Only if required, extend consent from one remote boolean to a
`Record<sinkId, boolean>` layered on top of the existing global remote logging
switch.

## Open decisions

1. Where should per-asset logger metadata live?
2. Should authenticated browser ingest reuse an existing OAuth token or use a
   logger-scoped token?
3. Should JWT verification be HS256 shared-secret based or RS256/JWKS based?
4. Is per-sink consent required, or is global remote logging consent sufficient?
