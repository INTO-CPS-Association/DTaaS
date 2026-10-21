# Domain Extensions

This folder is the host side of `@into-cps-association/dtaas-sdk`. A
domain extension, such as a building, wind or pump kit, is an npm package
that adds pages to this client without changing its code. The SDK is the
contract between the two: the types an extension implements and the
services the client gives it.

The Buildings page is the first extension, from the `./dtaas` entry of
`@into-cps-association/bim-kit`.

## Adding an Extension

1. `yarn add` the extension's package.
1. Import its `extension` in `src/extensions.ts` and add it to the list.

Its pages appear under `/<id>`, its menu items after the core ones, and it
reads its own settings from `env.js` keys named `REACT_APP_EXT_<ID>_*`. A
deployment hides a compiled-in extension, without a rebuild, by listing its
id in `REACT_APP_EXTENSIONS_DISABLED`, for example `'wind, pump'`.

## What Each File Does

| File                     | Role                                                              |
| :----------------------- | :---------------------------------------------------------------- |
| `createExtensionHost.ts` | Decides which extensions run and merges what they add             |
| `extensionHost.ts`       | The one host of this client, built from the manifest and `env.js` |
| `hostServices.ts`        | The services an extension receives, shared and per extension      |
| `contentsClient.ts`      | Files in the user's workspace, through the Jupyter Contents API   |
| `contentsUpload.ts`      | A write of any size, in pieces and under a temporary name         |
| `gitClient.ts`           | GitLab under the user's OAuth session                             |
| `ExtensionPage.tsx`      | One extension page, in the client layout with its services        |

The `signals` and `viz` services come from the common visualisation core in
`src/viz/`, which has its own README.

## When an Extension Is Left Out

The client starts without an extension that fails a check, and writes the
reason to the browser console:

- The SDK's `validateExtension` finds it malformed, for example a page that
  is not loaded lazily.
- Its id is a core route of this client or the id of an earlier extension.
- `REACT_APP_EXTENSIONS_DISABLED` lists it.
- Its `REACT_APP_EXT_<ID>_*` keys do not satisfy its config schema.
- It registers an anchor kind, a preset or a substrate that an earlier
  extension already registered.

## What Is Not Here Yet

- The tabs an extension adds to the Digital Twins page, its Library
  previews and its Redux slice are collected by the registry but not yet
  shown or mounted.
