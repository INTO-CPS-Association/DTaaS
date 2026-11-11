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
and
[`tests/integration/exampleKitsLint.test.ts`](../../tests/integration/exampleKitsLint.test.ts)
checks its sources against the SDK's lint rules for kits.

The folder is also a project of its own, with `package.json`,
`tsconfig.json`, `vite.config.ts`, `jest.config.json` and `tests/`, so it can
be copied out of this repository as it is. Its sources use relative imports
only.

| Path               | Role                                                  |
| ------------------ | ----------------------------------------------------- |
| `vite.config.ts`   | Builds the deployed bundle with `kitBuildConfig`      |
| `tests/`           | Checks that the host accepts the kit and mounts pages |
| `jest.config.json` | Compiles the SDK, which is ESM only, for the tests    |

## Start a New Kit From This One

1. Copy this folder into a new repository, for example `wind-kit`.
1. Choose the id of the new extension, such as `wind`. Write it in
   `defineExtension` in `src/dtaas/index.ts`, in `dtaas.id` of
   `package.json` and in the name of the package. The id names the pages
   (`/wind`), the `env.js` keys (`REACT_APP_EXT_WIND_*`) and the folder the
   bundle is deployed to.
1. Rename the anchor kind, the preset and the id in `tests/`.
1. Install and test, with no installation of DTaaS:

   ```bash
   yarn install
   yarn test
   ```

1. Build the deployed bundle:

   ```bash
   yarn build
   ```

   The bundle is one script, `dist/deploy/wind/index.js`. `DTAAS_KIT_OUT`
   names another output folder. It takes React, the router, MUI, zod and the
   contract from the client (`SHARED_MODULES`) and bundles everything else
   the kit imports.

1. Deploy it: copy the script to `extensions/wind/index.js` next to the
   client's `env.js` and list it in `REACT_APP_EXTENSIONS_DEPLOYED`, for
   example `'extensions/wind/index.js'`. The client loads it when it starts,
   without a rebuild.

The soil-kit, which lives in a repository of its own on the GitLab of Aarhus
University and is not public yet, is a kit made this way. It has its own unit
and integration tests, a test that builds and mounts the bundle and a lint
test against the SDK's kit rules.

Inside this repository, `yarn build:kit hello-kit` builds the same bundle
from the SDK's source and `tests/integration/kitBundle.test.ts` runs it with
the client's shared modules and checks that it registers its extension and
passes the conformance harness.
