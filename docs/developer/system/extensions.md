# Client Extensions

The web client uses npm packages for parts of its behaviour, and some of
these packages are maintained outside this repository. This page lists
them, describes how the Building Models page is wired into the client,
and summarises the modular architecture proposed for domain-specific
pages.

## Packages Used by the Client

| Package                               | Source                                                         | Role in the client                                                                                                                                                    |
| :------------------------------------ | :------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@into-cps-association/dt-automation` | `lib/dt-automation/` in this repository                        | Data, state and GitLab operations for creating, managing and executing DTs. The client takes it from npm (`^0.2.0` in `client/package.json`).                         |
| `@into-cps-association/bim-kit`       | [ifc-utils](https://github.com/INTO-CPS-Association/ifc-utils) | The `bim` extension: the [Building Models](../../user/website/bim.md) page with its IFC to glTF conversion in the browser, its binding manifest and its viewer, from the `./dtaas` entry. The client pins version `0.2.0`. |
| `@into-cps-association/dtaas-sdk`     | `client/sdk/` in this repository                               | The contract between the client and its domain extensions. The client links the local package (`link:./sdk`). |
| `@into-cps-association/dtaas-ext-bim` | `client/extensions/bim/` in this repository                    | The `bim` extension the client loads: the extension of `bim-kit` with the `aec` substrate. The client links the local package (`link:./extensions/bim`). |

The [client page](../codebase/client.md) describes the classes of
`dt-automation`, and [Publish Packages](../codebase/publish-packages.md)
describes how it is released.

## The Building Models Page

The Building Models page is the first extension. `client/src/extensions.ts`
imports it from `client/extensions/bim/`, which takes the extension of the
`./dtaas` entry of `bim-kit` and adds the `aec` substrate. The page, the model
conversion and the writing of converted models back to the library live in that
package and its tests run there. A change to the page reaches DTaaS as a new
version of `bim-kit` and not as a pull request against this repository. The
client unit tests replace the extension with a stand-in that declares the same
id, page, menu label and icon, since the real one pulls in a renderer and a
WebAssembly geometry kernel.

## The Extension Contract

`client/sdk/` holds `@into-cps-association/dtaas-sdk`, the contract between the
client and its domain extensions: the `DtaasExtension` type, the `HostServices`
types, the schema of `visualisation.json`, the validation helpers and a test
harness with `fakeHostServices`, `fakeSignals` and `checkConformance`, so an
extension is tested without a running installation. Its README describes the
package and `yarn test:sdk` runs its tests.

An extension declares the contract revision it was built against (`sdk: 1`) and
may declare the versions of the API it works with as a semver range (`apiRange`,
such as `^1.1`). A host refuses an extension whose range does not include the
API version the host implements (`SDK_VERSION`).

## The Extension Host

`client/src/extension/` is the host side of the contract. It reads the
extensions compiled into a build from `client/src/extensions.ts` and decides
which of them run. An extension is left out, with the reason in the browser
console, when it is malformed, when its `apiRange` does not include the host's
API version, when its id is taken, when `REACT_APP_EXTENSIONS_DISABLED` in
`env.js` lists it, when its `REACT_APP_EXT_<ID>_*` keys do not satisfy its
configuration schema or when it requires a service that no enabled extension
provides.

The host mounts every contribution point of the contract: pages under `/<id>`,
menu items after the core ones, tabs on the Digital Twins page, Library previews
at `/library/preview?file=<path>` and a Redux slice at `state.ext.<id>`. It
calls `setup` of each extension once and gives each one the SDK's
`HostServices`: the signed-in user, the library, the workspace files, GitLab,
the snackbar, the page shell, settings, a logger, its configuration and the
services of other extensions that it names in `requires`. The GitLab credentials
stay in the client core. An extension does not import client internals or the
code of another extension.

## The Visualisation Core

`client/src/viz/` is the common visualisation core, which every extension shares
through the `signals` and `viz` services. It keeps every sample in a temporal
store read by time, holds one playhead for every page, evaluates the encodings
of a `visualisation.json`, reads and saves that file in the twin's folder and
draws the standard `image` and `embed` substrates. A domain brings its own
substrates: the bim extension in `client/extensions/bim/` contributes `aec`, the
building model in 3D, so the client core holds no building code. The Visualise
tab of the Digital Twins page draws a twin from the `visualisation.json`
committed in its folder.

The core reads every signal from the DTaaS signals gateway, at the address in
`REACT_APP_VIZ_SIGNALS_URL`. `client/src/viz/gatewayTransport.ts` opens `POST
/signals/stream` for the live samples as server-sent events.
`client/src/viz/gatewayHistory.ts` asks `POST /signals/range` for the past ones.
Both send the signed-in user's GitLab access token in the `Authorization` header
and never in an address. The browser opens no connection to the broker or to a
database. Without the address the core still runs: every connection reads `down`
and a range holds only what the client has seen. The gateway itself is planned
in the [signals gateway plan](../plans/signals-gateway.md).

## Proposed Modular Architecture

The rest of the modular architecture described here is a proposal.

The [dtaas-sdk](https://github.com/INTO-CPS-Association/dtaas-sdk)
repository holds `@into-cps-association/dtaas-sdk`, which defines a
contract between the web client (the host) and domain extensions. In the
proposal:

- A domain extension is an npm package. It declares what it contributes,
  such as pages, navigation entries, digital twin tabs, asset previews,
  anchor kinds, converters, encoding presets and substrates, as one
  `DtaasExtension` object.
- The host passes platform services to each extension through a `HostServices`
  object: authentication, the library, the workspace contents API, GitLab, live
  signals, the visualisation service, user interface helpers, logging, settings
  and configuration. An extension does not import client internals.
- The client lists the extensions compiled into a build in one file,
  `src/extensions.ts`. A deployment can disable a compiled-in extension
  in `env.js` with `REACT_APP_EXTENSIONS_DISABLED`.
- A common visualisation core, `dtaas-visualisation`, holds the parts
  that do not depend on the domain: live data transport, the temporal
  store, anchor resolution, encoding rules and the standard substrates.

The SDK declares a contract revision (`sdk: 1`) that is separate from its npm
version, and a host built on the SDK refuses an extension built for another
revision. The `examples/bim` folder of the SDK repository ports `bim-kit` 0.1.1
onto the contract as a private package.

The figure shows the direction of this architecture. Domain-specific
extensions add pages to the web interface, and the common services are
grouped into a generic set and a set for each domain, such as IFC for
construction and buildings. Of the two extensions drawn, the Buildings
page is in the client today, as an extension.

![Multi-domain digital twins](multi-domain.png#only-light)
![Multi-domain digital twins](multi-domain-dark.png#only-dark)

The SDK repository documents the proposal in detail:

- [Modular architecture proposal](https://github.com/INTO-CPS-Association/dtaas-sdk/blob/main/docs/dtaas-client-modular-architecture.md)
- [Writing an extension](https://github.com/INTO-CPS-Association/dtaas-sdk/blob/main/docs/extension-authoring.md)
- [Integrating the SDK into a host](https://github.com/INTO-CPS-Association/dtaas-sdk/blob/main/docs/host-integration.md)
- [The `visualisation.json` schema](https://github.com/INTO-CPS-Association/dtaas-sdk/blob/main/docs/visualisation-schema.md)
- [The bim-kit port](https://github.com/INTO-CPS-Association/dtaas-sdk/blob/main/examples/bim/README.md)
