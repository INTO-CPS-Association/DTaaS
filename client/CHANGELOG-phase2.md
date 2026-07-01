# Phase 2 Changelog: IndexedDB Persistent Logger

## Overview

Phase 2 of the process workflow logger replaces the volatile in-memory
log buffer with IndexedDB persistent storage. This solves the cross-tab
log loss problem: when users click workbench links that open new browser
tabs, all tabs now write to the same IndexedDB database. A new
`/insights/log` route lets users view, download, and clear logs in-app.

## Phase 2.0 Changes

### New Files

| File                                            | Description                                                              |
| ----------------------------------------------- | ------------------------------------------------------------------------ |
| `src/util/logger/indexedDBLogger.ts`            | IndexedDB log persistence with `addLog()`, `getAllLogs()`, `clearLogs()` |
| `src/page/LogViewer.tsx`                        | React page for `/insights/log` with download/clear/refresh               |
| `test/unit/util/logger/indexedDBLogger.test.ts` | Unit tests for IndexedDB logger (4 tests)                                |
| `test/unit/page/LogViewer.test.tsx`             | Unit tests for LogViewer page (6 tests)                                  |

### Modified Files

| File                                   | Change                                                        |
| -------------------------------------- | ------------------------------------------------------------- |
| `src/util/logger/logger.ts`            | Added `addLog()` call to persist every log event to IndexedDB |
| `src/routes.tsx`                       | Added `insights/log` route wrapped in `PrivateRoute`          |
| `src/database/types.ts`                | Added `logs` store config to `DB_CONFIG`, bumped version to 2 |
| `src/database/executionHistoryDB.ts`   | Added `logs` store creation in `onupgradeneeded`              |
| `test/unit/util/logger/logger.test.ts` | Added IndexedDB mock and persistence test                     |
| `PLAN.md`                              | Updated with Phase 2 plan and design alternatives             |

## Phase 2.1 Changes (Review Fixes)

Addresses Copilot review comments, qlty issues, and config improvements.

### Phase 2.1 Bug Fixes

- **useLogger init race condition** — `initRef.current` was set before
  `initLogger()` resolved. If init failed, the logger silently dropped
  all events with no retry. Now `initRef` is set only after successful
  initialization, with `console.warn` on failure and automatic retry.

- **IndexedDB multi-tab handling** — Added `onblocked` handler to reject
  when another tab blocks the upgrade, and `onversionchange` handler to
  close stale connections so other tabs can upgrade cleanly.

- **Blob URL leak** — `consoleLogger.ts` `downloadLogs()` now wraps the
  DOM operations in `try/finally` to guarantee `URL.revokeObjectURL()`.

### Phase 2.1 Improvements

- **MIME type** — Changed `application/jsonl` to the standard
  `application/x-ndjson` in both `LogViewer.tsx` and `consoleLogger.ts`.

- **Config variable rename** — Renamed `REACT_APP_LOGGER_URL` to
  `LOGGER_URL` in all config files, `env.d.ts`, `logger.ts`, tests,
  and documentation.

- **Config URL values** — Each config now derives `LOGGER_URL` by
  appending `/logger` to `REACT_APP_URL`:

| Config     | `LOGGER_URL`                   |
| ---------- | ------------------------------ |
| `dev.js`   | `http://localhost:4000/logger` |
| `test.js`  | `http://localhost:4000/logger` |
| `prod.js`  | `https://foo.com/logger`       |
| `local.js` | `http://localhost/logger`      |

### Files Changed in Phase 2.1

| File                                 | Change                                              |
| ------------------------------------ | --------------------------------------------------- |
| `src/util/logger/useLogger.ts`       | Fix initRef timing; add console.warn; allow retries |
| `src/util/logger/indexedDBLogger.ts` | Add `onblocked` and `onversionchange` handlers      |
| `src/page/LogViewer.tsx`             | Change MIME type to `application/x-ndjson`          |
| `src/util/logger/consoleLogger.ts`   | Change MIME type; add `try/finally` for blob URL    |
| `src/util/logger/logger.ts`          | Rename `REACT_APP_LOGGER_URL` to `LOGGER_URL`       |
| `env.d.ts`                           | Rename `REACT_APP_LOGGER_URL` to `LOGGER_URL`       |
| `config/dev.js`                      | Rename and set `LOGGER_URL` from `REACT_APP_URL`    |
| `config/test.js`                     | Rename and set `LOGGER_URL` from `REACT_APP_URL`    |
| `config/prod.js`                     | Rename and set `LOGGER_URL` from `REACT_APP_URL`    |
| `config/local.js`                    | Rename and set `LOGGER_URL` from `REACT_APP_URL`    |
| `LOGGER_API.md`                      | Updated references to `LOGGER_URL`                  |
| `PLAN.md`                            | Added Phase 2.1 section                             |

## Design Decision

Three storage designs were evaluated:

1. **IndexedDB (chosen)** — Single shared store across all tabs,
   persistent, no external dependencies, established project pattern.
2. **BroadcastChannel + leader election** — Real-time cross-tab sync but
   complex leader election, still needs IndexedDB for persistence.
3. **Service Worker collector** — True background processing but requires
   HTTPS, complex lifecycle, and CRA customization.

IndexedDB was chosen for simplicity and robustness.

## Database Schema

The DTaaS IndexedDB database is upgraded from version 1 to version 2:

- **Existing store**: `executionHistory` (unchanged)
- **New store**: `logs` — auto-increment integer key, `timestamp` index

## Test Results

- 97 test suites passed (0 failed)
- 583 tests passed (0 failed)
- New tests: 4 (indexedDBLogger) + 6 (LogViewer) + 1 (logger integration)

## Validation

All commands pass:

- `yarn install`
- `yarn format`
- `yarn syntax`
- `yarn build:fast`
- `yarn config:dev`
- `yarn config:test`

## Phase 2.2 Changes (Preview Logging Reliability)

Addresses persistent preview logging gaps and PR #30 formatting blockers.

### Phase 2.2 Bug Fixes

- **Logger initialization fallback** — `useLogger` now initializes from
  `sessionStorage.username` when Redux `auth.userName` is empty. This fixes
  cases where preview pages are opened in a new tab and Redux user state has
  not yet been populated.

- **Missing interaction coverage** — Added `data-logger-*` attributes for
  interactive controls across preview create/manage/editor and related
  digital twins/library flows (dialog actions, file actions, search inputs,
  tree item clicks).

### Phase 2.2 Improvements

- Added unit/preview test assertions to protect newly added logger attribute
  coverage and the `useLogger` sessionStorage fallback behavior.

- Updated markdown formatting files to align with qlty/prettier requirements
  and eliminate blocking style issues.

### Files Changed in Phase 2.2

| File                                                                 | Change                                                         |
| -------------------------------------------------------------------- | -------------------------------------------------------------- |
| `src/util/logger/useLogger.ts`                                       | Add sessionStorage username fallback for logger initialization |
| `src/components/asset/Filter.tsx`                                    | Logger attrs for input/clear actions                           |
| `src/components/cart/ShoppingCart.tsx`                               | Logger attrs for clear-cart dialog actions                     |
| `src/route/digitaltwins/manage/DeleteDialog.tsx`                     | Logger attrs for cancel/confirm                                |
| `src/route/digitaltwins/manage/DetailsDialog.tsx`                    | Logger attrs for close action                                  |
| `src/route/digitaltwins/create/FileActionButtons.tsx`                | Logger attrs for delete/rename file buttons                    |
| `src/route/digitaltwins/create/DeleteFileDialog.tsx`                 | Logger attrs for no/yes actions                                |
| `src/route/digitaltwins/create/ChangeFileNameDialog.tsx`             | Logger attrs for input and action buttons                      |
| `src/route/digitaltwins/create/ConfirmDeleteDialog.tsx`              | Logger attrs for cancel/yes                                    |
| `src/route/digitaltwins/create/CreateDTDialog.tsx`                   | Logger attrs for cancel/confirm actions                        |
| `src/preview/route/digitaltwins/editor/Sidebar.tsx`                  | Logger attrs for add-file action                               |
| `src/preview/route/digitaltwins/editor/SidebarDialog.tsx`            | Logger attrs for input/cancel/add controls                     |
| `src/preview/route/digitaltwins/editor/sidebarRendering.tsx`         | Logger attrs for file tree items                               |
| `test/unit/util/logger/useLogger.test.tsx`                           | SessionStorage fallback initialization test                    |
| `test/unit/route/digitaltwins/create/*.test.tsx`                     | Logger attribute assertions added                              |
| `test/preview/unit/route/digitaltwins/editor/SidebarDialog.test.tsx` | Logger attribute assertions added                              |
