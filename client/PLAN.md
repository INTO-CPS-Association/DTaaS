# Process Workflow Logger - Implementation Plan

## Problem Statement

DTaaS needs to collect typical process workflows that users follow on the
application. User clicks on specific React elements (pages, tabs, subtabs,
buttons) must be recorded to assemble process flows. The logger must:

1. Anonymize usernames using a hash algorithm (privacy)
2. Include a session ID in every log event
3. Output logs in JSON format (JSONL files)
4. Stream logs to the browser console (downloadable by users)
5. Stream logs to a backend `/logger` route using fire-and-forget semantics
   (Beacon API)
6. Design a REST API for the logger microservice and implement client code

## Approach

### Architecture

A **non-intrusive logging layer** that wraps existing React components with
click tracking via `data-logger-*` attributes and a global click listener.
This avoids modifying every individual component.

**Key Design Decisions:**

- **Global click listener** on `document` that inspects `data-logger-*`
  attributes on clicked elements and their ancestors. This is the least
  invasive approach — existing components only need `data-logger-*` props
  added, no logic changes.
- **SHA-256 hash** via Web Crypto API (built-in) for username anonymization.
- **`uuid` package** (already a dependency) for session ID generation.
- **Navigator Beacon API** for fire-and-forget backend streaming.
- **In-memory log buffer** with console output and download capability.
- **No new npm dependencies** — use built-in browser APIs and existing deps.

### Log Event Schema (JSON)

```json
{
  "sessionId": "uuid-v4",
  "userHash": "sha256-hex",
  "timestamp": "2026-03-24T20:00:00.000Z",
  "event": "click",
  "page": "/library",
  "element": "tab",
  "label": "Functions",
  "context": {
    "tab": "functions",
    "subtab": "private"
  }
}
```

### Backend Microservice Candidate

**Seq** (by Datalust) is a widely used, open-source structured log server
with a free single-user license, Docker image, and JSON ingestion API.
However, to keep the implementation self-contained and simple, the REST API
will be designed as a generic JSONL ingestion endpoint compatible with any
backend (Seq, Loki, custom Node.js service, etc.).

### Config Environment Variable

A new `REACT_APP_LOGGER_URL` environment variable will specify the logger
backend URL. When empty/undefined, backend streaming is disabled (console
only).

### File Structure

```
src/util/logger/
├── logEvent.ts          # LogEvent interface & factory
├── hashUtils.ts         # SHA-256 username hashing
├── sessionManager.ts    # Session ID management
├── consoleLogger.ts     # Console output & download
├── beaconLogger.ts      # Beacon API transport to /logger
├── logger.ts            # Main logger orchestrator
└── useLogger.ts         # React hook + global click listener setup
```

## Todos

### 1. core-logger-types

Define the LogEvent interface, event factory function, and constants.

- File: `src/util/logger/logEvent.ts`

### 2. hash-utils

Implement SHA-256 hashing for username anonymization using Web Crypto API.

- File: `src/util/logger/hashUtils.ts`

### 3. session-manager

Session ID generation (uuid v4) and management. Session persists in
sessionStorage so it survives page reloads within the same browser session.

- File: `src/util/logger/sessionManager.ts`

### 4. console-logger

Console log output with in-memory buffer and JSONL download capability.
Must work around ESLint `no-console: error` rule (use eslint-disable for
the logger module only).

- File: `src/util/logger/consoleLogger.ts`

### 5. beacon-logger

Fire-and-forget log transport using Navigator Beacon API to POST JSONL
events to the configured `/logger` endpoint.

- File: `src/util/logger/beaconLogger.ts`

### 6. logger-orchestrator

Main logger module that combines console + beacon transports, manages
initialization (async hash computation), and exposes the `log()` function.

- File: `src/util/logger/logger.ts`

### 7. react-hook-integration

React hook `useLogger` that sets up a global click listener on `document`
to capture clicks on elements with `data-logger-*` attributes. The hook
initializes the logger with the current username from Redux auth state.

- File: `src/util/logger/useLogger.ts`

### 8. add-data-attributes

Add `data-logger-element`, `data-logger-label`, and `data-logger-context`
attributes to the key interactive React elements:

- **Library page**: Tab labels (Data, Functions, Models, Digital Twins,
  Tools), subtab labels (Common, Private)
- **Digital Twins page**: Tab labels (Create, Manage, Execute)
- **Workbench page**: Service links (Desktop, VSCode, Jupyter Lab,
  Jupyter Notebook), preview links (Library, Digital Twins)
- **Preview Digital Twins**: Tabs (Create, Execute, Manage), editor
  buttons (Save, Cancel), manage buttons (Reconfigure, Delete),
  execute buttons (Start, History)
- **Preview Library**: Tab labels (Data, Functions, Models, Tools,
  Digital Twins), asset cards (Details, Add/Remove), cart buttons
  (Clear, Proceed)
- **Navigation**: Menu items, sign in/out, account

### 9. env-config

Add `REACT_APP_LOGGER_URL` to:
- `env.d.ts` type declarations
- `config/*.js` files (dev, test, local, prod) — with empty default

### 10. logger-api-docs

Document the REST API for the logger microservice in `LOGGER_API.md`.

### 11. unit-tests

Write unit tests for all logger modules:
- `test/unit/util/logger/logEvent.test.ts`
- `test/unit/util/logger/hashUtils.test.ts`
- `test/unit/util/logger/sessionManager.test.ts`
- `test/unit/util/logger/consoleLogger.test.ts`
- `test/unit/util/logger/beaconLogger.test.ts`
- `test/unit/util/logger/logger.test.ts`
- `test/unit/util/logger/useLogger.test.tsx`

### 12. validate-build

Run validation commands:
- `yarn install`
- `yarn format`
- `yarn syntax`
- `yarn build:fast`
- `yarn config:dev`
- `yarn config:test`

### 13. documentation

Create changelog/documentation markdown file in `client/` describing
all changes made.

### 14. push-and-pr

Push to origin, open PR, verify CI passes.

## Notes

- ESLint has `no-console: error` — the console logger file needs a
  targeted eslint-disable comment.
- Config files (`config/*.js`) should not be committed per user
  instructions. The env.d.ts type declaration is the only config-related
  file to commit. Actually, re-reading: "do not make changes to these
  files and do not commit changes made to these files." So I will NOT
  modify config files.
- The `uuid` package is already a dependency (v13.0.0).
- Web Crypto API is available in all modern browsers and in Node.js
  test environment (may need polyfill in jsdom for tests).
- `window.env.REACT_APP_LOGGER_URL` will be read at runtime, same
  pattern as other env vars.
