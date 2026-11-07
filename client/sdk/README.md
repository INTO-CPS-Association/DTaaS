# DTaaS Extension Contract

`@into-cps-association/dtaas-sdk` is the contract between this client and
its domain extensions: the extension and host-service types, the
`visualisation.json` schemas, the validation helpers, a test harness and a
shareable ESLint config. Its code was copied from the `dtaas-sdk`
repository at the commit published as version `0.1.0`.

| Import                                    | What It Gives                                                                     |
| :---------------------------------------- | :-------------------------------------------------------------------------------- |
| `@into-cps-association/dtaas-sdk`         | Contract types, `HostProvider`, `useHost`, `defineExtension`, `validateExtension` |
| `@into-cps-association/dtaas-sdk/schema`  | zod schemas for `visualisation.json`                                              |
| `@into-cps-association/dtaas-sdk/testing` | `fakeHostServices`, `renderWithHost`, `replayFixture`, `checkConformance`         |
| `@into-cps-association/dtaas-sdk/eslint`  | Flat-config rules that keep an extension inside its boundary                      |
| `@into-cps-association/dtaas-sdk/deploy`  | `kitBuildConfig`, the Vite settings that build a deployed extension               |

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
`jest.config.json`. `examples/hello-kit/` is the minimal extension the
integration tests mount.

`client/src/extension/README.md` describes the open decision about how
external extensions get these types.
