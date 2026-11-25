# DTaaS Extension Contract

`@into-cps-association/dtaas-extensions` is the contract between this client
and its domain extensions: the extension and host-service types, the
`visualisation.json` schemas, the validation helpers, a test harness and a
shareable ESLint config. Its code was copied from the `dtaas-extensions`
repository, then named `dtaas-sdk`, at the commit published as version
`0.1.0`. The package was named `@into-cps-association/dtaas-sdk` until
version `0.2.0`.

| Import                                           | What It Gives                                                                     |
| :----------------------------------------------- | :-------------------------------------------------------------------------------- |
| `@into-cps-association/dtaas-extensions`         | Contract types, `HostProvider`, `useHost`, `defineExtension`, `validateExtension` |
| `@into-cps-association/dtaas-extensions/schema`  | zod schemas for `visualisation.json`                                              |
| `@into-cps-association/dtaas-extensions/testing` | `fakeHostServices`, `renderWithHost`, `replayFixture`, `checkConformance`         |
| `@into-cps-association/dtaas-extensions/eslint`  | Flat-config rules that keep an extension inside its boundary                      |
| `@into-cps-association/dtaas-extensions/deploy`  | `kitBuildConfig`, the Vite settings that build a deployed extension               |

The client depends on this folder with `link:./sdk`. The package exports
point to the TypeScript source, so there is no build step: Vite, Jest and
the client's type check compile it with the rest of the client. It has no
dependencies of its own. Its peer dependencies and test tools come from the
client's `node_modules`.

An extension names the major of the contract it was built against in `sdk` and
may name the versions of the API it works with in `apiRange`, as a semver range
such as `^1.1`. The host implements `SDK_VERSION` and refuses an extension whose
range does not include it. A new contribution point or service raises the minor
number. A change that an existing extension would notice raises the major number
and is listed in `CHANGELOG.md`.

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
