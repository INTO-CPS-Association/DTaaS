# DT Automation

`@into-cps-association/dt-automation` provides the shared data, state, and
business logic for creating, managing, and executing Digital Twins in DTaaS.

The package contains Digital Twin models, Redux state, and operations for
GitLab, files, pipelines, execution history, and measurements.

It has no React dependency. React components, hooks, and other UI-specific code
belong in the consuming application.

**NOTE**: Some features use browser APIs such as `sessionStorage`, `document`,
`Blob`, and object URLs.

## Install

```bash
yarn add @into-cps-association/dt-automation
```

Import supported APIs from the package root:

```ts
import { formatName } from '@into-cps-association/dt-automation';

const label = formatName('example-digital-twin');
```

Imports from `src` are implementation-specific and are not part of the public
API.

## Application Setup

Register the services required by the features used by the application.

| Feature           | Setup                                                                  |
| :---------------- | :--------------------------------------------------------------------- |
| Environment       | `setEnvironmentStore`                                                  |
| GitLab settings   | `setSettingsStore`                                                     |
| Authentication    | `sessionStorage.username` and `sessionStorage.access_token`            |
| Execution history | `setStorageService`, `setExecutionHistoryDB`, `setPipelineExecutionDB` |
| Measurements      | `setMeasurementStore`, `setMeasurementDB`                              |

### Environment

GitLab-backed operations require `environment.AUTH_AUTHORITY`.

The package provides `environmentSlice` and `updateAuthority`:

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

Register the environment store before calling operations that use the backend
authority.

### Settings

Register the application settings store with `setSettingsStore`.

The `settings` state provides the GitLab group, Digital Twin directory, common
library project, branch, runner tag, and logging settings.

### Authentication

Set the GitLab credentials before making authenticated requests:

```ts
sessionStorage.setItem('username', username);
sessionStorage.setItem('access_token', accessToken);
```

## Redux State

The package exports Redux reducers and actions for Digital Twins, assets, cart
state, files, library configuration, environment configuration, and execution
history.

For example, add the cart reducer to the application store:

```ts
import { configureStore } from '@reduxjs/toolkit';
import { addToCart, cartSlice } from '@into-cps-association/dt-automation';

const store = configureStore({
  reducer: { cart: cartSlice },
});

store.dispatch(addToCart(asset));
```

The package does not provide React hooks or a React Redux `Provider`.

## Execution History

Register the required storage services before using execution-history features:

```ts
setStorageService(executionHistoryStorage);
setExecutionHistoryDB(executionHistoryStorage);
setPipelineExecutionDB(executionHistoryStorage);
```

The package root exports the following selectors:

* `selectExecutionHistoryEntries`
* `selectExecutionHistoryById`
* `selectExecutionHistoryByDTName`
* `selectSelectedExecutionId`
* `selectSelectedExecution`
* `selectExecutionHistoryLoading`
* `selectExecutionHistoryError`

## Measurements

Register `setMeasurementStore` and `setMeasurementDB` when using measurement
features.

The measurement API provides operations for starting and stopping measurements,
managing active pipelines, storing results, and downloading measurement data.

## Backend Architecture

Backend communication uses interfaces and dependency injection. GitLab is the
current backend implementation.

See [`src/ARCHITECTURE.md`](./src/ARCHITECTURE.md) for the backend structure and
extension points.

## Development

See [`DEVELOPER.md`](./DEVELOPER.md) for development, build, test, and package
validation instructions.
