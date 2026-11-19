# Changelog

All notable changes to this package are documented in this file. The format
is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
package adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `DtaasExtension.apiRange`: the range of the extension API an extension works
  with, such as `^1.1`. `validateExtension` refuses an extension whose range
  does not include the host's API version, so a host refuses it at start-up
  instead of failing later (requirement K1). An extension without a range is
  checked by its `sdk` major only, as before.
- `SDK_VERSION`, the version of the extension API this package describes
  (`1.1.0`), with `satisfiesApiRange` and `isApiRange`. A new contribution point
  or service raises the minor number and a change an existing extension would
  notice raises the major number (requirement K10).
- `ValidateOptions.hostApiVersion`, for a host that implements another version
  than the package it was built with.
- Services between extensions (requirement K12), API version `1.2.0`: an
  extension offers services in `provides`, each named `<id>.<name>` and built
  once by `create(host)`. It names the services it uses in `requires` and
  reaches them through `HostServices.extensions.get(id)` and never imports the
  code of another extension. `validateExtension` checks the names and
  `fakeHostServices` takes a `services` option.
- API version `1.3.0`: the colour schemes of the encodings (`SCHEMES`,
  `colourAt` and `position`), so a kit draws a legend in the colours of the
  core. The same version adds the optional `UiService.Theme`, the host's theme
  for what a kit draws into a React root of its own.

### Changed

- `aec` is no longer a standard substrate (requirement K5). The bim extension
  contributes it, so a preset that names `aec` needs an extension that
  contributes the substrate.

### Security

- `./schema` refuses a transport `url` or a substrate `source` whose scheme is
  not allowed, so `javascript:`, `data:`, `vbscript:` and `file:` URLs no longer
  pass `parseVisualisationAsset`. MQTT and STOMP transports take `ws`, `wss`,
  `mqtt` and `mqtts`. ThingsBoard takes `http`, `https`, `ws` and `wss`.
  InfluxDB and HTTP take `http` and `https`. A file transport takes `http`,
  `https`, `lib` or a relative path. A substrate source takes `lib`, `git`,
  `http`, `https`, `blob` or a relative path. Schemes are read with the
  browser's URL parser, so case and embedded tabs do not hide a scheme, and a
  relative path that names another host is refused.
- `./schema` limits every string in a `visualisation.json` to 2048 characters
  and every list to 1000 items, so an oversized asset is refused before a host
  renders it.

## [0.1.0] - 2026-09-27

### Added in 0.1.0

- Extension contract, revision 1: `DtaasExtension`, `DomainContribution` and
  every contribution type of the architecture proposal (§6.1).
- Host contract: `HostServices` with `auth`, `library`, `contents`, `git`,
  `signals`, `viz`, `ui`, `logger`, `settings` and `config` (§6.2);
  `HostProvider` and `useHost()`.
- Visualisation layer types: `SignalSample`, `Channel`, `TransportAdapter`,
  `Anchor`, `AnchorKind`, the encoding vocabulary, `SubstrateAdapter`.
- `defineExtension`, `isLazyComponent`, `isLazyLoader` and
  `validateExtension` (identity, laziness, uniqueness, navigation and
  substrate rules).
- Env helpers `readExtensionConfig`, `isExtensionDisabled` and `envPrefix`.
- `./schema`: zod schemas for `visualisation.json` with cross-reference
  checks, encodings, anchors, transports, substrates and presets.
- `./testing`: `fakeHostServices`, `renderWithHost`, `replayFixture`,
  `checkConformance` and a socket guard.
- `SignalsService.connection` (`ConnectionState`, `ConnectionStatus`) and
  `worstConnectionState`, so a kit can tell a quiet signal from a dead
  connection; fake `signals.setConnection(state, paths?)` for tests.
- `./eslint`: flat-config rules enforcing the extension boundary (§6.3).
- `examples/hello-kit`: the template layout of a domain kit.

### Security in 0.1.0

- `validateExtension` rejects a navigation path whose path part has a `.` or
  `..` segment, a backslash, a control character, or a percent-encoded `.`,
  `/` or `\`, so a path cannot leave the extension's mount point once a
  browser resolves it. A path that needs an encoded slash inside a segment
  is rejected as well.
