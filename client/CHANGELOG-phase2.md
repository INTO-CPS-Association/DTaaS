# Phase 2 Changelog: IndexedDB Persistent Logger

## Overview

Phase 2 of the process workflow logger replaces the volatile in-memory
log buffer with IndexedDB persistent storage. This solves the cross-tab
log loss problem: when users click workbench links that open new browser
tabs, all tabs now write to the same IndexedDB database. A new
`/insights/log` route lets users view, download, and clear logs in-app.

## Changes

### New Files

| File | Description |
| ---- | ----------- |
| `src/util/logger/indexedDBLogger.ts` | IndexedDB log persistence module with `addLog()`, `getAllLogs()`, `clearLogs()` |
| `src/page/LogViewer.tsx` | React page component for `/insights/log` — displays logs as raw JSONL with download/clear/refresh buttons |
| `test/unit/util/logger/indexedDBLogger.test.ts` | Unit tests for IndexedDB logger (4 tests) |
| `test/unit/page/LogViewer.test.tsx` | Unit tests for LogViewer page (6 tests) |

### Modified Files

| File | Change |
| ---- | ------ |
| `src/util/logger/logger.ts` | Added `addLog()` call to persist every log event to IndexedDB alongside console output |
| `src/routes.tsx` | Added `insights/log` route wrapped in `PrivateRoute` |
| `src/database/types.ts` | Added `logs` store config to `DB_CONFIG`, bumped version to 2 |
| `src/database/executionHistoryDB.ts` | Added `logs` store creation in `onupgradeneeded` handler |
| `config/dev.js` | Added `REACT_APP_LOGGER_URL: ''` |
| `config/test.js` | Added `REACT_APP_LOGGER_URL: ''` |
| `config/prod.js` | Added `REACT_APP_LOGGER_URL: ''` |
| `config/local.js` | Added `REACT_APP_LOGGER_URL: ''` |
| `test/unit/util/logger/logger.test.ts` | Added IndexedDB mock and test for `addLog` integration |
| `PLAN.md` | Updated with Phase 2 plan, design alternatives comparison, and todos |

## Design Decision

Three storage designs were evaluated:

1. **IndexedDB (chosen)** — Single shared store across all tabs, persistent,
   no external dependencies, established pattern in the project.
2. **BroadcastChannel + leader election** — Real-time cross-tab sync but
   complex leader election, and still needs IndexedDB for persistence.
3. **Service Worker collector** — True background processing but requires
   HTTPS, complex lifecycle, and CRA customization.

IndexedDB was chosen for simplicity and robustness.

## Configuration

The `REACT_APP_LOGGER_URL` environment variable is now present in all
config files. Set it to a backend URL (e.g., `https://example.com/logger`)
to enable Beacon API log streaming. Leave empty to disable.

## Database Schema

The DTaaS IndexedDB database is upgraded from version 1 to version 2:

- **Existing store**: `executionHistory` (unchanged)
- **New store**: `logs` — auto-increment integer key, `timestamp` index

## Test Results

- **97 test suites passed** (0 failed)
- **583 tests passed** (0 failed)
- New tests: 4 (indexedDBLogger) + 6 (LogViewer) + 1 (logger IndexedDB integration) = 11 new tests

## Validation

All commands pass:
- `yarn install` ✓
- `yarn format` ✓
- `yarn syntax` ✓
- `yarn build:fast` ✓
- `yarn config:dev` ✓
- `yarn config:test` ✓
