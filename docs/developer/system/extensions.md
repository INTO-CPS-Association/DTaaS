# Client Extensions

The web client uses npm packages for parts of its behaviour, and some of
these packages are maintained outside this repository. This page lists
them and describes how domain-specific pages are added to the client as
extensions.

## Packages Used by the Client

| Package                               | Source                                                         | Role in the client                                                                                                                                                                             |
| :------------------------------------ | :------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@into-cps-association/dt-automation` | `lib/dt-automation/` in this repository                        | Data, state and GitLab operations for creating, managing and executing DTs. The client takes it from npm (`^0.2.0` in `client/package.json`).                                                  |
| `@into-cps-association/bim-kit`       | [ifc-utils](https://github.com/INTO-CPS-Association/ifc-utils) | The Buildings extension: IFC to glTF conversion in the browser, the binding manifest and the viewer of the [Building Models](../../user/website/bim.md) page. The client pins version `0.2.0`. |
| `@into-cps-association/dtaas-sdk`     | [dtaas-sdk](https://github.com/INTO-CPS-Association/dtaas-sdk) | The contract between the client and its extensions. The client pins version `0.1.0`.                                                                                                           |

The [client page](../codebase/client.md) describes the classes of
`dt-automation`, and [Publish Packages](../codebase/publish-packages.md)
describes how it is released.

## The Extension Host

The client is a host for domain extensions built on
[`@into-cps-association/dtaas-sdk`](https://github.com/INTO-CPS-Association/dtaas-sdk),
the contract between the two. A domain extension is an npm package that
declares what it adds, such as pages, menu items, digital twin tabs, anchor
kinds, encoding presets and substrates, as one `DtaasExtension` object.

- `client/src/extensions.ts` lists the extensions compiled into a build.
  Adding one is `yarn add` and one line there. A deployment hides a
  compiled-in extension with `REACT_APP_EXTENSIONS_DISABLED` in `env.js`,
  and each extension reads its own `REACT_APP_EXT_<ID>_*` keys.
- `client/src/extension/` decides which extensions run, mounts their pages
  under `/<id>` and their menu items after the core ones, and gives each one
  the SDK's `HostServices`: the signed-in user, the library, the workspace
  files, GitLab, the snackbar, the page shell, settings, a logger and its
  configuration. An extension does not import client internals.
- `client/src/viz/` is the common visualisation core. It reads live and
  past signals from the DTaaS signals gateway (`REACT_APP_VIZ_SIGNALS_URL`),
  which reads the broker and InfluxDB on the server. The core keeps every
  sample in a temporal store read by time, holds one playhead for every page,
  evaluates the encodings of a `visualisation.json`, and reads and saves that
  file in the twin's folder.
  It draws the `image` and `embed` substrates, and the Visualise tab of the
  Digital Twins page shows a twin from its `visualisation.json`.

The Buildings page is the first extension. It comes from the `./dtaas`
entry of `bim-kit`, so a change to it reaches DTaaS as a new version of
`bim-kit` and not as a pull request against this repository. Its live
readings come from the core, through the topics its binding manifest names.

The README files in `client/src/extension/` and `client/src/viz/` describe
the code. The SDK declares a contract revision (`sdk: 1`) that is separate
from its npm version, and the host refuses an extension built for another
revision.

## Live Signals

The common core reads every signal from the signals gateway at `/signals`,
the address in `REACT_APP_VIZ_SIGNALS_URL`. `client/src/viz/gatewayTransport.ts`
opens `POST /signals/stream` for the live samples, as server-sent events, and
`client/src/viz/gatewayHistory.ts` asks `POST /signals/range` for the past
ones. Both send the signed-in user's GitLab access token in the
`Authorization` header and never in an address.

![Data path of live signals](signals-path.png#only-light)
![Data path of live signals](signals-path-dark.png#only-dark)

Traefik routes `/signals` to the gateway after traefik-forward-auth has
checked the session. The gateway asks GitLab who the token belongs to, which
projects the user can read, and which topics the committed
`visualisation.json` files of those twins declare. It then reads those topics
from RabbitMQ over AMQP as the read-only service user `dtaas-signals`, and
their history from InfluxDB with a read-only token. The digital twins publish
to RabbitMQ. The browser opens no connection to the broker or to InfluxDB.

The Visualise tab draws the `visualisation.json` of the workspace, while the
gateway authorises from the copy committed on `gitlab-branch`. A topic added in
the workspace therefore shows no readings until the file is committed and
pushed. The
[codebase page](../codebase/signals-ms.md) describes the gateway, and the
[admin pages](../../admin/servers/signals/config.md) its deployment.

## What Is Not Built Yet

The [modular architecture proposal](https://github.com/INTO-CPS-Association/dtaas-sdk/blob/main/docs/dtaas-client-modular-architecture.md)
plans further steps:

- The 3D substrate in the common core, so a building is drawn by the same
  core as any other twin.
- Tabs, Library previews and Redux slices contributed by extensions, which
  the registry collects but the client does not show yet.

The figure shows the direction of this architecture. Domain-specific
extensions add pages to the web interface, and the common services are
grouped into a generic set and a set for each domain, such as IFC for
construction and buildings. Of the two extensions drawn, the Buildings
page is in the client today.

![Multi-domain digital twins](multi-domain.png#only-light)
![Multi-domain digital twins](multi-domain-dark.png#only-dark)

The SDK repository documents the proposal in detail:

- [Modular architecture proposal](https://github.com/INTO-CPS-Association/dtaas-sdk/blob/main/docs/dtaas-client-modular-architecture.md)
- [Writing an extension](https://github.com/INTO-CPS-Association/dtaas-sdk/blob/main/docs/extension-authoring.md)
- [Integrating the SDK into a host](https://github.com/INTO-CPS-Association/dtaas-sdk/blob/main/docs/host-integration.md)
- [The `visualisation.json` schema](https://github.com/INTO-CPS-Association/dtaas-sdk/blob/main/docs/visualisation-schema.md)
- [The bim-kit port](https://github.com/INTO-CPS-Association/dtaas-sdk/blob/main/examples/bim/README.md)
