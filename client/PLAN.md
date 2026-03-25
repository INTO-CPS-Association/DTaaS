# Process Workflow Logger - Implementation Plan

## Phase 1 (Complete): Initial Logger

A non-intrusive logging layer that records user clicks via `data-logger-*`
HTML attributes and a global click listener. Logs go to browser console
with in-memory buffer, and optionally to a backend via the Beacon API.

Delivered: LogEvent schema, SHA-256 username hashing, session management,
console logger with JSONL download, beacon transport, `useLogger` React
hook, data attributes on all key UI elements, 28 unit tests across
7 test suites.

## Phase 2 (Complete): IndexedDB Persistent Logger

### Problem Statement

The Phase 1 logger had two issues:

1. **Cross-tab log loss** — When a user clicks a workbench link, a new
   browser tab opens. The in-memory log buffer and console.log output are
   isolated per tab. Logs are scattered across multiple browser tabs with
   no synchronization.

2. **Backend POST not sending** — The `beaconLogger.ts` uses
   `navigator.sendBeacon()` which is fire-and-forget and works. However
   the logger backend URL (`LOGGER_URL`) must be configured in
   config files.

### Design Alternatives Comparison

Three storage designs were evaluated.

#### Design A: IndexedDB-Based Storage (Chosen)

Store all log events in a shared IndexedDB database (`logs` store).
IndexedDB is shared across all tabs of the same origin, so logs from any
tab are unified. A `/insights/log` route displays the raw log entries.

Pros:

- Single unified store across all tabs — no synchronization needed
- Persistent storage survives page reloads and tab closures
- Can store large volumes of logs (hundreds of MB)
- No external dependencies — IndexedDB is a built-in browser API
- Already used in this project (`database/executionHistoryDB.ts`)
- `fake-indexeddb` is already a devDependency for testing
- User can view logs in-app at `/insights/log`

Cons:

- Async API (all reads/writes are promise-based)
- Cannot be accessed from Web Workers without additional setup
- No real-time cross-tab notification (must query on page load)

#### Design B: BroadcastChannel + SharedArrayBuffer

Use the `BroadcastChannel` API to broadcast log events across tabs in
real time. One "leader" tab writes to IndexedDB as the single writer.

Pros:

- Real-time cross-tab synchronization
- Low latency event propagation
- Leader election prevents write conflicts

Cons:

- Complex leader election logic (what if leader tab closes?)
- BroadcastChannel does not work cross-origin
- SharedArrayBuffer requires `Cross-Origin-Isolation` headers
  which would break OIDC auth redirects and iframe-based services
- Still needs a persistent store (IndexedDB/localStorage) anyway
- More complex with no real benefit since real-time cross-tab display
  is not a requirement

#### Design C: Service Worker + Central Log Collector

Register a Service Worker that intercepts all log events. Tabs post
messages to the Service Worker, which aggregates and persists them.

Pros:

- True background processing — survives all tab closures
- Can batch and flush logs to the backend efficiently
- Single write path eliminates concurrency issues

Cons:

- Service Workers require HTTPS (not available in dev localhost)
- Registration lifecycle is complex (install, activate, update)
- Debugging is harder (separate DevTools context)
- CRA Service Worker support is limited and requires ejecting
- Overkill — logs already POST via Beacon API

#### Decision

IndexedDB is the simplest, most robust solution. It leverages existing
project patterns, requires no external dependencies, and solves the
cross-tab problem directly. The other designs add complexity without
proportional benefit.

## Phase 2.1: Review Fixes and Config Improvements

### Problem Statement

Phase 2 PR review revealed several issues:

1. **Logger init race condition** — `useLogger` set `initRef.current`
   before `initLogger()` resolved. If init failed, the logger would
   never retry, silently dropping all log events for that session.

2. **IndexedDB multi-tab upgrade handling** — Missing `onblocked` and
   `onversionchange` handlers meant DB upgrades could hang or leave
   stale connections when multiple tabs were open.

3. **Non-standard MIME type** — `application/jsonl` is not a registered
   media type. Changed to `application/x-ndjson`.

4. **Config variable naming** — Renamed `REACT_APP_LOGGER_URL` to
   `LOGGER_URL` for consistency. Each config now derives the logger URL
   by appending `/logger` to `REACT_APP_URL`.

5. **Blob URL leak** — `consoleLogger.ts` `downloadLogs()` did not use
   `try/finally` to guarantee `URL.revokeObjectURL()`.

### Changes Made

| File | Change |
| ---- | ------ |
| `src/util/logger/useLogger.ts` | Set `initRef` only after successful init; log errors with `console.warn`; allow retries |
| `src/util/logger/indexedDBLogger.ts` | Add `onblocked` and `onversionchange` handlers |
| `src/page/LogViewer.tsx` | Change MIME type to `application/x-ndjson` |
| `src/util/logger/consoleLogger.ts` | Change MIME type to `application/x-ndjson`; wrap download in `try/finally` |
| `src/util/logger/logger.ts` | Rename `REACT_APP_LOGGER_URL` to `LOGGER_URL` |
| `env.d.ts` | Rename `REACT_APP_LOGGER_URL` to `LOGGER_URL` |
| `config/dev.js` | `LOGGER_URL: 'http://localhost:4000/logger'` |
| `config/test.js` | `LOGGER_URL: 'http://localhost:4000/logger'` |
| `config/prod.js` | `LOGGER_URL: 'https://foo.com/logger'` |
| `config/local.js` | `LOGGER_URL: 'http://localhost/logger'` |
| `LOGGER_API.md` | Updated all references to `LOGGER_URL` |
| `CHANGELOG-phase2.md` | Updated with Phase 2.1 changes |

## IndexedDB Visibility

The DTaaS IndexedDB database is named `DTaaS`. To view it:

- **Chrome/Edge**: DevTools → Application tab → Storage → IndexedDB
- **Firefox**: DevTools → Storage tab → IndexedDB

The database is created lazily on the first log write. If the logger has
not initialized (e.g., user not authenticated), the database will not
exist yet. After clicking any logged element, refresh the DevTools
storage panel to see the `DTaaS` database with its `logs` store.

## Log Event Schema

```json
{
  "sessionId": "uuid-v4",
  "userHash": "sha256-hex",
  "timestamp": "2026-03-24T20:00:00.000Z",
  "event": "click",
  "page": "/library",
  "element": "tab",
  "label": "Functions",
  "context": { "tab": "functions", "subtab": "private" }
}
```

## Notes

- The existing `DTaaS` IndexedDB (version 1) has an `executionHistory`
  store. We bump to version 2 and add a `logs` store in
  `onupgradeneeded`. The existing `IndexedDBService` class in
  `executionHistoryDB.ts` is not modified — the logger gets its
  own lightweight module.
- `fake-indexeddb` (v6.2.5) is already a devDependency — no new test
  deps needed.
- The LogViewer page is behind `PrivateRoute` so only authenticated
  users can see logs.
- Console logging is kept alongside IndexedDB for developer convenience.
- The Beacon API transport continues to work independently when
  `LOGGER_URL` is set.
