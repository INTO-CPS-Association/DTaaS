# DTaaS Model

`@into-cps-association/dt-automation` is the data and business-logic layer used
by the DTaaS web client. It exposes digital-twin, GitLab, execution,
measurement, and Redux APIs.

Version `0.1.x` is a DTaaS-specific integration package. Its API reflects the
current client model and is not yet intended as a framework-independent model
library.

The package source lives under `lib/dt-automation` and is published as
`@into-cps-association/dt-automation`. It currently targets browser
integrations and is not yet safe to import in server-side runtimes.

## Install

React and React Redux are peer dependencies. Install compatible versions in
the consuming application:

```bash
yarn add @into-cps-association/dt-automation react@^19.2.0 react-redux@^9.2.0
```

## Use

Import supported APIs from the package root. Deep imports are not part of the
public package contract.

```ts
import { formatName } from '@into-cps-association/dt-automation';

const label = formatName('example-digital-twin');
```

The package does not read application globals. Its environment reducer starts
with an empty GitLab authority, which the consuming application must populate
through its environment store before using GitLab-backed features.

## Integration requirements

GitLab-backed features require the consuming application to provide the same
runtime services that the DTaaS client provides:

- An environment store registered with `setEnvironmentStore`. Its state must
  contain `environment.AUTH_AUTHORITY`.
- A settings store registered with `setSettingsStore`. Its `settings` state
  supplies the group, directory, library project, branch, runner tags, and
  logging flags.
- `sessionStorage` entries named `username` and `access_token` before
  authenticated GitLab operations run.
- Execution-history services registered with `setStorageService`,
  `setExecutionHistoryDB`, and `setPipelineExecutionDB` when using their
  corresponding execution APIs.
- A measurement store and database registered with `setMeasurementStore` and
  `setMeasurementDB` when using measurement APIs.
- A React Redux `Provider` when using `useCart`.

The consuming application can use the exported `environmentSlice` and
`updateAuthority` action, or provide a compatible environment reducer of its
own. The registered environment store is the authority used by GitLab
operations.

For applications using the package reducer, initialize it before invoking
GitLab-backed functions:

```ts
import { configureStore } from '@reduxjs/toolkit';
import {
  environmentSlice,
  setEnvironmentStore,
  updateAuthority,
} from '@into-cps-association/dt-automation';

const store = configureStore({
  reducer: { environment: environmentSlice },
});

store.dispatch(updateAuthority(appConfig.gitlabAuthority));
setEnvironmentStore(store);
```

The package targets browser integrations. GitLab and measurement flows use
browser facilities including `sessionStorage`, `document`, `Blob`, and object
URLs.

## Execution-history selectors

The package root exports the selectors used by the DTaaS client:

- `selectExecutionHistoryEntries`
- `selectExecutionHistoryById`
- `selectExecutionHistoryByDTName`
- `selectSelectedExecutionId`
- `selectSelectedExecution`
- `selectExecutionHistoryLoading`
- `selectExecutionHistoryError`

## Build

```bash
yarn typecheck
yarn build
```

The JavaScript bundle is produced by tsup. TypeScript declarations are emitted
separately by `tsc`, then `tsc-alias` rewrites internal `model/*` aliases to
portable relative imports in `dist`.
