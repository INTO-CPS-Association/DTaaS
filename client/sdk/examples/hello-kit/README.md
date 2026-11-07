# hello-kit

The smallest complete DTaaS domain extension. Use it as the template layout
for a new kit.

| Path                            | Role                                                                     |
| ------------------------------- | ------------------------------------------------------------------------ |
| `src/core/`                     | Framework-free domain logic: twin detection, reading format, anchor refs |
| `src/react/Reading.tsx`         | A domain widget that knows nothing about DTaaS                           |
| `src/dtaas/index.ts`            | The `DtaasExtension` the host imports                                    |
| `src/dtaas/pages/HelloPage.tsx` | A lazy page that reads everything through `useHost()`                    |
| `src/dtaas/anchors.ts`          | The `hello-node` anchor kind (`node:<id>` on an `image` substrate)       |
| `src/dtaas/presets/`            | The `hello.warmth` colour-scale preset                                   |
| `src/dtaas/config.ts`           | Schema for `REACT_APP_EXT_HELLO_GREETING`                                |

The SDK's own test suite exercises the kit in
[`tests/integration/helloKit.test.tsx`](../../tests/integration/helloKit.test.tsx),
and the SDK's lint rules for kits are applied to this directory.

In this repository the kit imports its own modules through the `examples/*`
path alias; a standalone kit would use relative imports.

## Start a New Kit From This One

1. Copy this folder next to it, for example to `sdk/examples/wind-kit/`.
1. Choose the id of the new extension, such as `wind`, and write it in
   `defineExtension` in `src/dtaas/index.ts`, in `dtaas.id` of
   `package.json` and in the name of the package. The id names the pages
   (`/wind`), the `env.js` keys (`REACT_APP_EXT_WIND_*`) and the folder the
   bundle is deployed to.
1. Replace `hello-kit` in the `examples/hello-kit/...` imports with the new
   folder name and rename the anchor kind and the preset.
1. Copy `tests/integration/helloKit.test.tsx` for the new kit and run the
   SDK's tests from `client/`, with no installation of DTaaS:

   ```bash
   yarn test:sdk
   ```

1. Build the deployed bundle from `client/`:

   ```bash
   yarn build:kit wind-kit
   ```

   The bundle is one script,
   `sdk/examples/wind-kit/dist/deploy/wind/index.js`. A second argument
   names another output folder. It takes React, the router, MUI, zod and
   the contract from the client (`SHARED_MODULES`) and bundles everything
   else the kit imports.

1. Deploy it: copy the script to `extensions/wind/index.js` next to the
   client's `env.js` and list it in `REACT_APP_EXTENSIONS_DEPLOYED`, for
   example `'extensions/wind/index.js'`. The client loads it when it
   starts, without a rebuild.

`tests/integration/kitBundle.test.ts` builds this kit and `soil-kit` the
same way, runs each bundle with the client's shared modules and checks that
it registers its extension and passes the conformance harness.
