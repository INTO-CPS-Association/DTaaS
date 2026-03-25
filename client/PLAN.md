# Process Workflow Logger - Implementation Plan

## Phase 1 (Complete): Initial Logger

A non-intrusive logging layer that records user clicks via `data-logger-*`
HTML attributes and a global click listener. Logs go to browser console
with in-memory buffer, and optionally to a backend via the Beacon API.

Delivered: LogEvent schema, SHA-256 username hashing, session management,
console logger with JSONL download, beacon transport, `useLogger` React
hook, data attributes on all key UI elements, 28 unit tests across
7 test suites.

## Phase 2: IndexedDB Persistent Logger + Backend POST Fix

### Problem Statement

The Phase 1 logger has two issues:

1. **Cross-tab log loss**: When a user clicks a workbench link, a new
   browser tab opens. The in-memory log buffer and console.log output are
   isolated per tab. Logs are scattered across multiple browser tabs with
   no synchronization.

2. **Backend POST not sending**: The `beaconLogger.ts` uses
   `navigator.sendBeacon()` which is fire-and-forget and works. However
   the logger backend URL (`REACT_APP_LOGGER_URL`) must be configured in
   config files — which currently lack the field. The config files need
   updating to include `REACT_APP_LOGGER_URL`.

### Design Alternatives Comparison

#### Design A: IndexedDB-Based Storage (Chosen)

Store all log events in a shared IndexedDB database (`dtaas_logs` store).
IndexedDB is shared across all tabs of the same origin, so logs from any
tab are unified. A `/insights/log` route displays the raw log entries.

**Pros:**
- Single unified store across all tabs — no synchronization needed
- Persistent storage survives page reloads and tab closures
- Can store large volumes of logs (hundreds of MB)
- No external dependencies — IndexedDB is a built-in browser API
- Already used in this project (`database/executionHistoryDB.ts`) so the
  pattern is established
- `fake-indexeddb` is already a devDependency for testing
- User can view logs in-app at `/insights/log`

**Cons:**
- Async API (all reads/writes are promise-based)
- Cannot be accessed from Web Workers without additional setup
- No real-time cross-tab notification (must query on page load)

#### Design B: BroadcastChannel + SharedArrayBuffer

Use the `BroadcastChannel` API to broadcast log events across tabs in
real time. Each tab listens for broadcasts and maintains a local copy.
One "leader" tab (elected via `navigator.locks`) writes to localStorage
or IndexedDB as the single writer.

**Pros:**
- Real-time cross-tab synchronization
- Low latency event propagation
- Leader election prevents write conflicts

**Cons:**
- Complex leader election logic (what if leader tab closes?)
- BroadcastChannel does not work cross-origin
- SharedArrayBuffer requires `Cross-Origin-Isolation` headers (COOP/COEP)
  which would break OIDC auth redirects and iframe-based workbench services
- Still needs a persistent store (IndexedDB/localStorage) anyway
- Significantly more complex with no real benefit over Design A since
  real-time cross-tab display is not a requirement

#### Design C: Service Worker + Central Log Collector

Register a Service Worker that intercepts all log events. Tabs post
messages to the Service Worker, which aggregates and persists them
(to IndexedDB or a backend). The Service Worker acts as a background
process shared across all tabs.

**Pros:**
- True background processing — survives all tab closures
- Can batch and flush logs to the backend efficiently
- Single write path eliminates concurrency issues
- Can retry failed backend POSTs

**Cons:**
- Service Workers require HTTPS (not available in dev `localhost` by
  default in some browsers)
- Registration lifecycle is complex (install, activate, update)
- Debugging is harder (separate DevTools context)
- CRA (Create React App) Service Worker support is limited and requires
  ejecting or custom webpack config
- Overkill for the current use case — logs already POST via Beacon API
- This project uses `react-scripts` which makes SW customization painful

#### Decision: Design A (IndexedDB)

IndexedDB is the simplest, most robust solution. It leverages existing
project patterns, requires no external dependencies, and solves the
cross-tab problem directly. The other designs add complexity without
proportional benefit.

### Approach

1. **Add `indexedDBLogger.ts`** — An IndexedDB-backed log store that
   writes every log event to a `logs` object store in the existing
   `DTaaS` database. Provides `addLog()`, `getAllLogs()`, and
   `clearLogs()` functions.

2. **Update `logger.ts`** — After logging to console, also persist the
   event to IndexedDB via `indexedDBLogger.addLog()`.

3. **Add `LogViewer` page component** — A React page at `/insights/log`
   that reads all logs from IndexedDB and displays them as raw JSONL.
   Includes a download button and a clear button.

4. **Add route** — Register `/insights/log` in `routes.tsx` as a
   `PrivateRoute`.

5. **Fix config files** — Add `REACT_APP_LOGGER_URL: ''` to all four
   `config/*.js` files so the beacon transport can be activated.

6. **Update `env.d.ts`** — Already has `REACT_APP_LOGGER_URL?` — no
   change needed.

7. **Update `database/types.ts`** — Add `logs` store configuration to
   `DB_CONFIG` and increment the database version.

### File Changes

```
src/util/logger/indexedDBLogger.ts    # NEW — IndexedDB log persistence
src/util/logger/logger.ts             # MODIFY — add IndexedDB write
src/page/LogViewer.tsx                # NEW — /insights/log page
src/routes.tsx                        # MODIFY — add /insights/log route
src/database/types.ts                 # MODIFY — add logs store config
config/dev.js                         # MODIFY — add REACT_APP_LOGGER_URL
config/test.js                        # MODIFY — add REACT_APP_LOGGER_URL
config/prod.js                        # MODIFY — add REACT_APP_LOGGER_URL
config/local.js                       # MODIFY — add REACT_APP_LOGGER_URL
test/unit/util/logger/indexedDBLogger.test.ts  # NEW — unit tests
test/unit/util/logger/logger.test.ts  # MODIFY — update for IndexedDB
test/unit/page/LogViewer.test.tsx      # NEW — page component tests
```

### Log Event Schema (unchanged)

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

## Todos

### Phase 1 (Complete)

- [x] core-logger-types
- [x] hash-utils
- [x] session-manager
- [x] console-logger
- [x] beacon-logger
- [x] logger-orchestrator
- [x] react-hook-integration
- [x] add-data-attributes
- [x] env-config (env.d.ts)
- [x] logger-api-docs
- [x] unit-tests (28 tests, 7 suites)

### Phase 2

1. **update-db-config** — Add `logs` store to `database/types.ts` with
   `DB_CONFIG`. Bump version to 2. The store uses auto-increment key
   with a `timestamp` index for ordering.

2. **indexeddb-logger** — Create `src/util/logger/indexedDBLogger.ts`
   that opens the DTaaS database and writes LogEvent entries to the
   `logs` object store. Expose `addLog()`, `getAllLogs()`, `clearLogs()`.

3. **integrate-indexeddb** — Update `logger.ts` to call
   `indexedDBLogger.addLog()` after `logToConsole()`.

4. **log-viewer-page** — Create `src/page/LogViewer.tsx`, a simple React
   page that reads all logs from IndexedDB and renders them as JSONL
   in a `<pre>` block. Include "Download JSONL" and "Clear Logs" buttons.

5. **add-route** — Add `{ path: 'insights/log', element: <PrivateRoute><LogViewer /></PrivateRoute> }`
   to `routes.tsx`.

6. **fix-config-files** — Add `REACT_APP_LOGGER_URL: ''` to all four
   `config/*.js` files.

7. **write-tests** — Unit tests for `indexedDBLogger.ts` and
   `LogViewer.tsx`. Update `logger.test.ts` to verify IndexedDB
   integration.

8. **validate-build** — Run: `yarn install`, `yarn format`,
   `yarn syntax`, `yarn build:fast`, `yarn config:dev`, `yarn config:test`.

9. **documentation** — Create `client/CHANGELOG-phase2.md` describing
   all changes.

10. **push-and-pr** — Push to origin, open PR, verify CI passes.

## Notes

- The existing `DTaaS` IndexedDB (version 1) has an `executionHistory`
  store. We bump to version 2 and add a `logs` store in
  `onupgradeneeded`. The existing `IndexedDBService` class in
  `executionHistoryDB.ts` will not be modified — the logger gets its
  own lightweight module.
- `fake-indexeddb` (v6.2.5) is already a devDependency — no new test
  deps needed.
- The LogViewer page is behind `PrivateRoute` so only authenticated
  users can see logs.
- Console logging is kept alongside IndexedDB for developer convenience.
- The Beacon API transport continues to work independently when
  `REACT_APP_LOGGER_URL` is set.
