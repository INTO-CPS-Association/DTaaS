# Domain Extensions

This folder is the host side of `@into-cps-association/dtaas-sdk`. A
domain extension, such as a building, wind or pump kit, is an npm package
that adds pages to this client without changing its code. The SDK is the
contract between the two: the types an extension implements and the
services the client gives it.

The Buildings page is the first extension: `extensions/bim/`, which takes the
extension of the `./dtaas` entry of `@into-cps-association/bim-kit` and adds the
`aec` substrate. The client must still build and pass its tests with the list in
`src/extensions.ts` empty.

## Where the Contract Lives

The code of the contract now lives in the client core, in `client/sdk/`. It
keeps its package name, `@into-cps-association/dtaas-sdk`. The client links
it with `link:./sdk`. The name stays so that an extension installed
from npm, such as `bim-kit`, which imports the published name, resolves to
the local code. The client builds and tests it from source with its own
toolchain. `yarn test:sdk` runs its tests.

The plan is to keep the name `dtaas-sdk`, to move the logic part of the
contract into the client core and to turn the `dtaas-sdk` repository into a
tool that generates the skeleton of a new extension for extension
developers. The first part is what `client/sdk/` does. How an external
extension gets the contract types from now on is an open decision: either a
types package published from `client/sdk/`, or the types carried by the
skeleton generator. Until it is decided, nothing here is published and the
npm release `0.1.0` stays the version external extensions build against.

## Adding an Extension

An extension is either compiled in or deployed.

To compile one in:

1. `yarn add` the extension's package.
1. Import its `extension` in `src/extensions.ts` and add it to the list.

To deploy one, without a rebuild:

1. Build it with `kitBuildConfig` from `@into-cps-association/dtaas-sdk/deploy`,
   which writes one script. `yarn build:kit hello-kit` does this for the
   example kit in `sdk/examples/`.
1. Copy the script to `extensions/<id>/index.js` next to `env.js`.
1. List the path in `REACT_APP_EXTENSIONS_DEPLOYED`, for example
   `'extensions/hello/index.js'`.

`index.tsx` loads the listed scripts before the client's own modules, because
the store and the routes read the registry when they are imported. Before the
first script runs, it fills `DTAAS_SHARED` with the client's copy of every
module in `SHARED_MODULES`, so a deployed extension uses the same React, theme
and `HostProvider` as the client. A script that fails to load, registers nothing
or registers another id than its folder is reported in the console and left
out. A compiled-in extension wins an id clash with a deployed one.

Its pages appear under `/<id>`, its menu items after the core ones, its tabs on
the Digital Twins page, its Library previews at `/library/preview?file=<path>`,
its Redux slice at `state.ext.<id>` and it reads its own settings from `env.js`
keys named `REACT_APP_EXT_<ID>_*`. Its `setup` runs once when the client starts.
A setup that fails is reported in the console without stopping the client. A
deployment hides a compiled-in extension, without a rebuild, by listing its id
in `REACT_APP_EXTENSIONS_DISABLED`, for example `'wind, pump'`.

## What Each File Does

| File                     | Role                                                             |
| :----------------------- | :--------------------------------------------------------------- |
| `createExtensionHost.ts` | Decides which extensions run and merges what they add            |
| `deployedExtensions.ts`  | Loads the bundles `env.js` lists, before the client starts       |
| `extensionRegistry.ts`   | The extensions that run, from the manifest and `env.js`          |
| `extensionHost.ts`       | The one host of this client, with the services of each extension |
| `hostServices.ts`        | The services an extension receives, shared and per extension     |
| `serviceDirectory.ts`    | Services one extension offers another, by the ids it requires    |
| `startExtensions.ts`     | Calls `setup` of every extension once                            |
| `extensionState.ts`      | The Redux slices of the extensions, at `state.ext.<id>`          |
| `DigitalTwinTabPage.tsx` | A tab an extension adds to the Digital Twins page                |
| `AssetPreviewPage.tsx`   | A library file shown by the extension that previews its type     |
| `contentsClient.ts`      | Files in the user's workspace, through the Jupyter Contents API  |
| `contentsUpload.ts`      | A write of any size, in pieces and under a temporary name        |
| `gitClient.ts`           | GitLab under the user's OAuth session                            |
| `ExtensionPage.tsx`      | One extension page, in the client layout with its services       |

The `signals` and `viz` services come from the common visualisation core in
`src/viz/`, which has its own README.

## Services Between Extensions

An extension offers a service to the others in `provides`, with an id `<its
id>.<name>` and a `create(host)` function. It names the services it uses in
`requires` and reaches them, and only them, with `host.extensions.get(id)`. A
service is built once, on first use, with the services of the extension that
offers it, so no extension imports the code of another.

## When an Extension Is Left Out

The client starts without an extension that fails a check and writes the
reason to the browser console:

- The SDK's `validateExtension` finds it malformed, for example a page that
  is not loaded lazily.
- Its id is a core route of this client or the id of an earlier extension.
- `REACT_APP_EXTENSIONS_DISABLED` lists it.
- It is deployed and its script fails to load, registers no extension or
  registers an id other than the name of its folder.
- Its `REACT_APP_EXT_<ID>_*` keys do not satisfy its config schema.
- Its `apiRange` does not include the API version of this client's SDK.
- It registers an anchor kind, a preset or a substrate that an earlier
  extension already registered.
- It requires a service that no enabled extension provides. Leaving it out
  can leave out the extensions that need its own services, too.

## What Is Not Here Yet

- No page of the Library links to `/library/preview` yet, since the Library tabs
  are pages of the workspace in a frame.

## Automation as an Extension, Planned

Automation is still part of the client core: `routes.tsx` mounts
`/automation`, `/preview/library` and `/preview/digitaltwins` itself, and
`page/MenuItems.tsx` lists Automation among the core items. This section
plans how it becomes an extension like `bim-kit`. Nothing of it is
implemented yet.

### What Moves

- The pages: `route/automation/`, `route/digitaltwins/` (the create, editor,
  execution and manage pages and `DigitalTwinsPreview.tsx`),
  `route/library/cart/LibraryPreview.tsx` and `route/measurement/`.
- The components of these pages: `components/asset/`, `components/cart/`
  and `components/execution/`. Two core files use the last one today:
  `route/auth/PrivateRoute.tsx` mounts `ExecutionHistoryLoader` on every
  private page and `components/logDialog/UnifiedDialog.tsx` shows
  `ExecutionHistoryList`. Both move into the extension's own pages, since
  the contract has no contribution point for a core dialog.
- The state: the automation reducers that `store/storeTypes.ts` takes from
  `dt-automation` become the extension's `reducer`, mounted at
  `state.ext.automation`. `store/CartAccess.ts`, the `dt-automation` setup
  in `store/store.ts` and the IndexedDB services in `database/` move with
  it.
- The automation entries of `routes.tsx` and `page/MenuItems.tsx`, which the
  extension host then adds from the extension's own declaration.

The moved code becomes the `./dtaas` entry of a new package next to
`lib/dt-automation`, or of `dt-automation` itself, so the GitLab logic and
its pages are versioned together. The core keeps the settings slice and the
settings form, which hold the runner tag and the branch name for every user,
until the settings service can carry them.

### What `defineExtension` Declares

```ts
export const extension = defineExtension({
  id: 'automation',
  name: 'Automation',
  version: '0.1.0',
  sdk: 1,
  routes: [
    { path: '', element: lazy(() => import('./pages/AutomationPage')) },
    { path: 'library', element: lazy(() => import('./pages/LibraryPage')) },
    { path: 'digitaltwins', element: lazy(() => import('./pages/TwinsPage')) },
    { path: 'measure', element: lazy(() => import('./pages/MeasurePage')) },
  ],
  navigation: [
    { label: 'Automation', path: '/automation', icon: AutomationIcon },
  ],
  reducer: automationReducer,
});
```

The contract reserves the id `automation` for the core route
(`RESERVED_EXTENSION_IDS` in `client/sdk/src/extension/constants.ts`), so the
same change removes it from that list, together with the core route. The
pages then live under `/automation/...`, so the old addresses
`/preview/library`, `/preview/digitaltwins` and `/insights/measure` need a
redirect in the core for one release. The Digital Twins tabs and the
Library previews of the contract (`digitalTwinTabs`, `assetPreviews`) are
the later place for the execute and history views, once the host mounts
them.

### The Host Services It Needs

| Service    | Use                                                                         |
| :--------- | :-------------------------------------------------------------------------- |
| `auth`     | The signed-in user and, through a new token method, the GitLab access token |
| `git`      | Commits that create, edit and delete digital twin files                     |
| `library`  | The library assets the cart offers                                          |
| `settings` | The runner tag and the branch name                                          |
| `ui`       | The snackbar and the page shell                                             |
| `logger`   | The execution and measurement logs                                          |
| `config`   | Its own `REACT_APP_EXT_AUTOMATION_*` keys                                   |

The pipelines API of GitLab (trigger, status and job logs) is not in
`git` today. Either `git` gains those calls or the extension keeps its own
GitLab client, fed with the token from `auth`.

### How the Token Reaches It

Today the core pushes the token and the username into `dt-automation`
through `setAccessToken` and `setUsername` (`util/auth/credentials.ts`).
That push is the only place the core's sign-in code reaches into
automation. The rest of the core still imports `dt-automation` for the
store, the settings and the logger. Those imports move with the code listed
above. With automation an extension, the contract adds a token getter to
`AuthService`, for example `accessToken(): string`, read at the moment of
each call so a renewed token is used. The extension passes it to
`dt-automation`, or `dt-automation` takes the getter instead of a stored
copy. The core then removes the push from `credentials.ts`. Adding the
getter changes the contract, so it waits for the decision on how external
extensions get the contract types.

The user's token can carry the `api` scope, a full-power credential. A
getter on `AuthService` would hand it to every extension, including one a
deployment loads at run time. Adding the pipelines calls to `git`, which
keeps the token in the core, avoids that. Until one of the two is chosen, no
extension receives the token, since `git` sends it for them.
