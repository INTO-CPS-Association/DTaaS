# DTaaS Model

`@into-cps-association/dtaas-model` is the data and business-logic layer used by the DTaaS web client. It exposes digital-twin, GitLab, execution, measurement, and Redux APIs.

Version `0.1.x` is a DTaaS-specific integration package. Its API reflects the current client model and is not yet intended as a framework-independent model library.

## Install

React and React Redux are peer dependencies. Install compatible versions in the consuming application:

```bash
yarn add @into-cps-association/dtaas-model react@^19.2.0 react-redux@^9.2.0
```

## Use

Import supported APIs from the package root. Deep imports are not part of the public package contract.

```ts
import { formatName } from '@into-cps-association/dtaas-model';

const label = formatName('example-digital-twin');
```

The root module is safe to import when `globalThis.env` is absent. In that case, the initial GitLab authority is an empty string.

## Integration requirements

GitLab-backed features require the consuming application to provide the same runtime services that the DTaaS client provides:

- An environment store registered with `setEnvironmentStore`. Its state must contain `environment.AUTH_AUTHORITY`.
- A settings store registered with `setSettingsStore`. Its `settings` state supplies the group, directory, library project, branch, runner tags, and logging flags.
- `sessionStorage` entries named `username` and `access_token` before authenticated GitLab operations run.
- Execution-history services registered with `setStorageService`, `setExecutionHistoryDB`, and `setPipelineExecutionDB` when using their corresponding execution APIs.
- A measurement store and database registered with `setMeasurementStore` and `setMeasurementDB` when using measurement APIs.
- A React Redux `Provider` when using `useCart`.

The DTaaS client may load `globalThis.env.REACT_APP_AUTH_AUTHORITY` before the application module as the initial environment value. This global is optional; the registered environment store is the authority used by GitLab operations.

The package targets browser integrations. GitLab and measurement flows use browser facilities including `sessionStorage`, `document`, `Blob`, and object URLs.

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

The JavaScript bundle is produced by tsup. TypeScript declarations are emitted separately by `tsc`, then `tsc-alias` rewrites internal `model/*` aliases to portable relative imports in `dist`.
