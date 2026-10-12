# Client Extensions

The web client uses npm packages for parts of its behaviour, and some of
these packages are maintained outside this repository. This page lists
them, describes how the Building Models page is wired into the client,
and summarises the modular architecture proposed for domain-specific
pages.

## Packages Used by the Client

| Package | Source | Role in the client |
| :--- | :--- | :--- |
| `@into-cps-association/dt-automation` | `lib/dt-automation/` in this repository | Data, state and GitLab operations for creating, managing and executing DTs. The client takes it from npm (`^0.2.0` in `client/package.json`). |
| `@into-cps-association/bim-kit` | [ifc-utils](https://github.com/INTO-CPS-Association/ifc-utils) | IFC to glTF conversion in the browser, the binding manifest and the viewer of the [Building Models](../../user/website/bim.md) page. The client pins version `0.1.1`. |

The [client page](../codebase/client.md) describes the classes of
`dt-automation`, and [Publish Packages](../codebase/publish-packages.md)
describes how it is released.

## The Building Models Page

The domain logic of the Building Models page lives in `bim-kit`. The
client holds three wiring files in `client/src/route/bim/`:

- `Bim.tsx` places the page in the DTaaS layout and hands the viewer the
  library URL of the signed-in user.
- `library.ts` names the folder that holds the models, `common/models`.
- `persistGeometry.ts` writes a model converted in the browser back to
  the library, so that each model is converted once.

A change to how a model is drawn reaches DTaaS as a new version of
`bim-kit`. The page is still wired into the client by hand, in the route
table (`src/routes.tsx`), the menu (`src/page/MenuItems.tsx`), the icon
registry (`src/components/appIcons.tsx`) and `package.json`. A page for
another domain would have to edit the same files.

## Proposed Modular Architecture

The modular architecture described here is a proposal. It is not merged
into the client, and `client/package.json` does not depend on the SDK.

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
- `bim-kit` is moved onto the contract, and the wiring files in
  `client/src/route/bim/` move into it.

The SDK declares a contract revision (`sdk: 1`) that is separate from its npm
version, and a host built on the SDK refuses an extension built for another
revision. The `examples/bim` folder of the SDK repository ports `bim-kit` 0.1.1
onto the contract as a private package.

The figure shows the direction of this architecture. Domain-specific
extensions add pages to the web interface, and the common services are
grouped into a generic set and a set for each domain, such as IFC for
construction and buildings. Of the two extensions drawn, the Buildings
page exists in the client today, as a hand-wired route.

![Multi-domain digital twins](multi-domain.png)

The SDK repository documents the proposal in detail:

- [Modular architecture proposal](https://github.com/INTO-CPS-Association/dtaas-sdk/blob/main/docs/dtaas-client-modular-architecture.md)
- [Writing an extension](https://github.com/INTO-CPS-Association/dtaas-sdk/blob/main/docs/extension-authoring.md)
- [Integrating the SDK into a host](https://github.com/INTO-CPS-Association/dtaas-sdk/blob/main/docs/host-integration.md)
- [The `visualisation.json` schema](https://github.com/INTO-CPS-Association/dtaas-sdk/blob/main/docs/visualisation-schema.md)
- [The bim-kit port](https://github.com/INTO-CPS-Association/dtaas-sdk/blob/main/examples/bim/README.md)
