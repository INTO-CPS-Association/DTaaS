# DT Automation

`@into-cps-association/dt-automation` is the logic behind the custom DTaaS UI
for creating, sharing and executing DTs. It provides digital-twin models and
Redux state, together with
GitLab, file, pipeline, execution-history, and measurement operations.

The package has no React dependency, and instead relies on browser APIs such as `sessionStorage`,
`document`, `Blob`, and object URLs.

## Install and import

```bash
yarn add @into-cps-association/dt-automation
```

Import supported APIs from the package root. Implementation specific imports
are not part of the public API. Example import:

```ts
import { formatName } from '@into-cps-association/dt-automation';

const label = formatName('example-digital-twin');
```

## Application setup

Register the services required by the features your application uses:

- Environment store: register it with `setEnvironmentStore`; its state must
  provide `environment.AUTH_AUTHORITY`.
- Settings store: register it with `setSettingsStore`; it provides the GitLab
  group, directory, library project, branch, runner tags, and logging settings.
- Authentication: set `sessionStorage.username` and
  `sessionStorage.access_token` before making authenticated GitLab requests.
- Execution history: register `setStorageService`, `setExecutionHistoryDB`, and
  `setPipelineExecutionDB` when using execution-history features.
- Measurements: register `setMeasurementStore` and `setMeasurementDB` when
  using measurement features.

The package provides `environmentSlice` and `updateAuthority` for the
environment store. Initialise it before calling GitLab-backed operations:

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

## Cart state

`cartSlice` and the `addToCart`, `removeFromCart`, and `clearCart` actions are
ordinary Redux exports. Add the reducer to the application's store and connect
it to the UI in the application. This package provides neither React hooks nor
a React Redux `Provider`, so these must be made on importing side.

```ts
import { configureStore } from '@reduxjs/toolkit';
import { addToCart, cartSlice } from '@into-cps-association/dt-automation';

const store = configureStore({
  reducer: { cart: cartSlice },
});

store.dispatch(addToCart(asset));
const assetsInCart = store.getState().cart.assets;
```

## Execution-history selectors

The package root also exports execution-history selectors:

- `selectExecutionHistoryEntries`
- `selectExecutionHistoryById`
- `selectExecutionHistoryByDTName`
- `selectSelectedExecutionId`
- `selectSelectedExecution`
- `selectExecutionHistoryLoading`
- `selectExecutionHistoryError`

See [DEVELOPER.md](./DEVELOPER.md) for development, build, and package
verification guidance.
