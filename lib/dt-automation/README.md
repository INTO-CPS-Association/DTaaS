# DT Automation

`@into-cps-association/dt-automation` provides the shared data, state, and
business logic for creating, managing, and executing Digital Twins in DTaaS.

The package contains Digital Twin models, Redux state, and operations for
GitLab, files, pipelines, execution history, and measurements.

It has no React dependency. React components, hooks, and other UI-specific code
belong in the consuming application.

The package runs in browsers and in Node.js 24 and later. See
[Using from Node.js](#using-from-nodejs).

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

| Feature           | Setup                                                                                |
| :---------------- | :----------------------------------------------------------------------------------- |
| Environment       | `setEnvironmentStore`                                                                |
| GitLab settings   | `setSettingsStore`                                                                   |
| Authentication    | `setUsername` and `setAccessToken`                                                   |
| Execution history | `setStorageService`, `setExecutionHistoryDB`, `setPipelineExecutionDB`               |
| Measurements      | `setMeasurementStore`, `setMeasurementDB`, `setMeasurementResultsStorage` (optional) |

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
import {
  clearAccessToken,
  clearUsername,
  setAccessToken,
  setUsername,
} from '@into-cps-association/dt-automation';

setUsername(username);
setAccessToken(accessToken);

// On sign-out
clearUsername();
clearAccessToken();
```

The package keeps both values in memory rather than in `sessionStorage`, so
script in same-origin iframes cannot read the token. Memory does not survive
a page reload: set both again before anything that uses the package fetches,
and call `setAccessToken` whenever the token is renewed.

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

Results stay in memory unless a storage is registered with
`setMeasurementResultsStorage`. A browser application can pass
`sessionStorage` to keep the results across a page reload. Register the
storage before the first call that starts, restarts, stops or purges a
measurement. The package restores the saved results only while it holds no
results in memory.

The measurement API provides operations for starting and stopping measurements,
managing active pipelines, and storing results.

`buildResultsExport` and `buildTaskResultExport` build the results file and
return its `fileName`, `content` and `mimeType`. The application saves the
file: a browser can offer it as a download, and a Node.js application can
return or store it.

## Using from Node.js

A Node.js application registers the same services as a browser application,
listed under [Application Setup](#application-setup). Plain objects can stand
in for the Redux stores. The environment and settings stores need only `getState()`.
The measurement store also needs the `restoreRunnerTag`, `restoreBranchName`,
`restoreSecondaryRunnerTag` and `showSnackbar` callbacks.

```ts
import {
  BRANCH_NAME,
  COMMON_LIBRARY_PROJECT_NAME,
  DT_DIRECTORY,
  GROUP_NAME,
  RUNNER_TAG,
  setEnvironmentStore,
  setSettingsStore,
} from '@into-cps-association/dt-automation';

const settings = {
  GROUP_NAME,
  DT_DIRECTORY,
  COMMON_LIBRARY_PROJECT_NAME,
  RUNNER_TAG,
  BRANCH_NAME,
  loggingEnabled: false,
  remoteLoggingEnabled: false,
};

setEnvironmentStore({
  getState: () => ({ environment: { AUTH_AUTHORITY: gitlabUrl } }),
});
setSettingsStore({ getState: () => ({ settings }) });
```

Register an execution history storage service that implements
`IExecutionHistory`, as under [Execution History](#execution-history), before
executing a Digital Twin. Without it, `DigitalTwin.execute()` starts the
pipeline but does not record the run, and returns `null`.

The package keeps its state in module variables:

* the credentials
* the registered services
* the measurement state

A loaded copy of the package
therefore serves one user. A Node.js application with several users loads one
copy per user session, for example in a worker thread or a child process.

On shutdown, `await stopAllPipelines()` to cancel the pipelines of a running
measurement. `handleUnload` starts the cancellations without waiting for
them.

## Backend Architecture

Backend communication uses interfaces and dependency injection. GitLab is the
current backend implementation.

See [`src/ARCHITECTURE.md`](./src/ARCHITECTURE.md) for the backend structure and
extension points.

## Development

See [`DEVELOPER.md`](./DEVELOPER.md) for development, build, test, and package
validation instructions.
