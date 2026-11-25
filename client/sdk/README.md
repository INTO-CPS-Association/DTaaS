# DTaaS Extension Contract

`@into-cps-association/dtaas-extensions` is the contract between this client
and its domain extensions: the extension and host-service types, the
`visualisation.json` schemas, the validation helpers, a test harness and a
shareable ESLint config. Its code is a copy of the `dtaas-extensions`
repository at version `0.2.0` (commit `216c6a4`), with the differences listed
at the end of this file. The package was named
`@into-cps-association/dtaas-sdk` until version `0.2.0`.

| Import                                           | What It Gives                                                                     |
| :----------------------------------------------- | :-------------------------------------------------------------------------------- |
| `@into-cps-association/dtaas-extensions`         | Contract types, `HostProvider`, `useHost`, `defineExtension`, `validateExtension` |
| `@into-cps-association/dtaas-extensions/core`    | The root entry without React: constants, validation, API range and types          |
| `@into-cps-association/dtaas-extensions/react`   | `HostProvider` and `useHost`                                                      |
| `@into-cps-association/dtaas-extensions/schema`  | zod schemas for `visualisation.json`                                              |
| `@into-cps-association/dtaas-extensions/testing` | `fakeHostServices`, `renderWithHost`, `replayFixture`, `checkConformance`         |
| `@into-cps-association/dtaas-extensions/eslint`  | Flat-config rules that keep an extension inside its boundary                      |
| `@into-cps-association/dtaas-extensions/deploy`  | `kitBuildConfig`, the Vite settings that build a deployed extension               |

The client depends on this folder with `link:./sdk`. The package exports
point to the TypeScript source, so there is no build step: Vite, Jest and
the client's type check compile it with the rest of the client. A linked
folder installs nothing, so its one dependency, `semver`, its peer
dependencies and its test tools come from the client's `node_modules`.

An extension names the major of the API it was built against in `sdk` (`0`)
and may name the versions of the API it works with in `apiRange`, as a semver
range such as `^0.2`. The host implements `API_VERSION`, the version of the
package, and refuses an extension whose range does not include it. While the
API is at `0.x`, a change that an existing extension would notice raises the
minor number, any other change raises the patch number and each is listed in
`CHANGELOG.md`.

Run its tests from `client/`:

```bash
yarn test:sdk
```

`src/` imports its own files by relative paths, so it compiles inside the
client. The tests keep the `src/` and `tests/` aliases of
`jest.config.json`. `tests/fixtures/kit/` is the smallest kit, which the
integration tests build with `kitBuildConfig` and mount.

The kits, `hello-kit` (the template of a new kit), `soil-kit` and `bim-kit`, are
not part of the client. Each is a package of its own in the `kits/` folder of
the dtaas-extensions repository and builds its deployed bundle there.

`client/src/extension/README.md` describes the open decision about how
external extensions get these types.

## Differences From the Package

- `RESERVED_EXTENSION_IDS` is not here. The reserved ids are the first
  segments of the client's own routes, so the client keeps the list in
  `client/src/extension/reservedExtensionIds.ts` and passes it to
  `validateExtension` as `reservedIds`. Without that option no id is reserved.
- `package.json` points the exports at the TypeScript source and keeps only
  what the linked folder reads. `semver` is a dependency of the client.
- The package's `tests/e2e`, which packs and installs the built package, is
  not copied, because this folder is never built.
