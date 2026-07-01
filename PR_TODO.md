# PR Todo: What Is Still Missing

## Must Fix Before Calling The PR Complete

- [ ] **Decide the logger service URL for each local mode.**
  - `client/config/dev.js` sends logs to `http://localhost:4003/logger`.
  - `client/config/test.js` sends logs to `http://localhost:4000/logger`.
  - The browser error `POST http://localhost:4000/logger 404` means the client
    dev server answered the request, not the logger microservice.
  - Pick one local story and make config/docs match it:
    - direct service: run logger on `4003` and point `LOGGER_URL` there, or
    - reverse proxy: run the Docker/Traefik stack and use `/logger`.

- [ ] **Add a quick logger health check to the manual test flow.**
  - Expected endpoint: `GET /logger/health`.
  - Direct local service example: `http://localhost:4003/logger/health`.
  - Proxied local stack example: `http://localhost/logger/health`.
  - Do not test the client logger until this endpoint returns `{ "status": "ok" }`.

- [ ] **Verify end-to-end log ingestion, not only local IndexedDB.**
  - Sign in.
  - Click a logged UI element.
  - Confirm the event appears in `/insights/log`.
  - Confirm the browser does not show `POST /logger 404`.
  - Confirm the logger service JSONL file receives the event.

- [ ] **Resolve the `/enok/tree/digital_twins` 404.**
  - The Library iframe currently builds workspace URLs like
    `/enok/tree/digital_twins`.
  - In a plain client-only run, React Router has no route for that URL.
  - Decide whether the demo/test environment should:
    - run the workspace reverse proxy that serves `/enok/tree/...`,
    - point `REACT_APP_URL_LIBLINK` at a reachable service, or
    - avoid loading the iframe for logger-only local verification.

- [ ] **Confirm IndexedDB migration in a real browser profile.**
  - The code expects the `DTaaS` database to contain a `logs` object store.
  - Test with an existing browser profile that already has an older `DTaaS`
    IndexedDB database.
  - Confirm no more `IDBDatabase.transaction: 'logs' is not a known object store
    name` warnings appear.

## Should Add Tests Or Evidence

- [ ] **Add a regression test for old IndexedDB schemas.**
  - Create an older `DTaaS` database in a test.
  - Open it through the current logger code.
  - Assert the `logs` store is created and `addLog()` succeeds.

- [ ] **Add or keep a regression check for Library username initialization.**
  - The runtime warning was caused by dispatching username state while
    `LibraryContent` rendered.
  - The safe behavior is: render first, then set username inside an effect.
  - Keep a test or manual evidence that the React warning is gone.

- [ ] **Run the focused client checks after final config changes.**
  - Auth helper tests.
  - Library route tests.
  - IndexedDB logger tests.
  - Log Viewer tests.
  - Targeted ESLint on touched files.

- [ ] **Run logger service checks.**
  - `servers/logger` unit tests.
  - `servers/logger` e2e tests.
  - A local manual `POST /logger` smoke test with a valid payload.

## Documentation Cleanup

- [ ] **Update the logger docs with the exact local startup recipe.**
  - Include which config to copy into `client/public/env.js`.
  - Include how to start `servers/logger`.
  - Include which health URL to check.
  - Include where the JSONL output file lands.

- [ ] **Reconcile stale URL examples.**
  - `client/CHANGELOG-phase2.md` still says `dev.js` uses
    `http://localhost:4000/logger`.
  - Current `client/config/dev.js` uses `http://localhost:4003/logger`.
  - Make the changelog, plan, and config agree.

- [ ] **Decide whether `PR_MISSION.md` should be committed.**
  - It is useful reviewer context, but it is currently an extra root-level
    markdown artifact.
  - Either include it intentionally or move its content into the PR description.

## Nice To Have

- [ ] **Add a visible fallback when backend logging is unavailable.**
  - IndexedDB can still work even when Beacon delivery fails.
  - A small dev-only warning or Log Viewer status could make this clearer.

- [ ] **Document the difference between local browser logs and backend logs.**
  - `/insights/log` shows IndexedDB events from the browser.
  - `/logger` receives backend ingestion events.
  - They are related, but they are not the same endpoint.
