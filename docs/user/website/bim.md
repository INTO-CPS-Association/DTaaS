# Building Models

The Building Models page draws a building from the user's own library and
colours it with the readings its sensors report. It answers a question a
time-series dashboard cannot: which of the forty rooms is the warm one.

This page describes the asset layout, the binding manifest, and the conversion
workflow. It is the user-facing half of DTaaS issue 1762. The developer-facing
half, meaning what the route holds and what it deliberately does not, is in
`client/src/route/bim/README.md`.

## What the Page Needs

Three files, all of them in the user's library under `common/models`:

| File | Required | What it holds |
| --- | --- | --- |
| `model.ifc` | yes | The building, as the authoring tool exported it |
| `model.json` | no | The property tree: every object, its IFC class, its storey, its property sets |
| `model.manifest.json` | no | The binding manifest, mapping each sensor to the object it measures |

An IFC file on its own is enough to see the building. The property tree adds
the panel behind a click. The manifest adds the readings. Nothing fails when
the last two are missing, and the page says which of the three it found.

## The Geometry Format

The model is converted to **glTF binary**, `.glb`. The issue offered OBJ as an
alternative and it was rejected on one ground, which is the same ground the
issue itself argues from.

The binding key is the IFC `GlobalId`, a 22 character identifier that survives
every export of the same model. glTF carries arbitrary data per node in its
`extras` field, so the converter writes the `GlobalId` there and the viewer
resolves a binding by reading it back. OBJ has no such field. A marker on an
OBJ model can only be placed by node name, and a name is not an identifier:
two walls are frequently both called `Wall`, and the resolver refuses that case
instead of guessing which one the reading belongs to.

Supporting OBJ would therefore deliver the weaker half of the contract the
manifest exists to enforce. A model with no stable identity per object cannot
carry a reviewable binding.

## The Binding Manifest

The manifest is plain JSON beside the model, and it is validated with `zod`
before anything is drawn. It is written by a person and it will frequently be
wrong, so every error names the binding and the field that caused it, for
example `bindings[3].display.ramp`, instead of reporting that the file is
invalid.

```json
{
  "model": {
    "source": "substation.ifc",
    "source_sha256": "60b1b94ee88a2b087080200c3c347edaf2347e768c1accb4b3608c6a129fbb09",
    "converter": "ifc_explorer.to_manifest 0.1.0"
  },
  "bindings": [
    {
      "selector": { "globalId": "0_sgz7bzz4Jh2ckU1ehFe$" },
      "label": "HX-1 temperature TS-01",
      "source": {
        "live": { "transport": "mqtt", "topic": "swim/B1/temperature/TS-01" },
        "history": { "bucket": "swim", "measurement": "temperature" }
      },
      "display": { "unit": "°C", "ramp": [10, 50] }
    }
  ]
}
```

Four things about the shape are worth stating, because each was a decision:

- `selector` is a small union of `globalId`, `nodeName` and `expressId`, so a
  non-IFC asset can reuse the same manifest instead of needing a second schema.
  A selector names exactly one of the three. Naming two would leave the
  resolver choosing, and a manifest should not depend on which it chose.
- `live` and `history` are separate. MQTT supplies the current value on the
  model, and the time-series database supplies the panel behind a click.
  Charting is not reimplemented inside the 3D view.
- `source_sha256` is required. Without it there is no way to tell whether a
  derived artifact still describes the file beside it. The literal `unknown` is
  accepted, for a generator that never read the source, and anything else has
  to be a SHA-256.
- `display.ramp` is the range the colour scale spans, and the viewer also reads
  it as the range the sensor is expected to stay inside. A value outside it
  raises an alert on the sensor card.

A binding whose object is absent from the geometry is reported and counted, not
dropped. That is the ordinary consequence of a model being re-exported, because
re-exporting changes every `GlobalId`, and a viewer that silently draws four
markers where the manifest asked for six is worse than one that says which two
are missing.

## Conversion

Conversion runs in the browser of whoever is looking at the model. Putting an
IFC file in the library is the whole workflow: no terminal, no service, no
step that has to be repeated when the file changes.

### Why the Parser Ships Inside the Package

The issue asked that the WebAssembly parser and its workers be served from the
DTaaS origin, so the feature works in a localhost install with no external
network, and it proposed a `postinstall` copy step to achieve that.

The converter package takes a different route to the same requirement: the
`web-ifc` WebAssembly binary is embedded in the JavaScript as base64 at build
time, so the published package contains it and there is no separate `.wasm`
file to serve. A production build of the client contains zero `.wasm` files and
fetches none.

This was chosen over the copy step for three reasons.

**Nothing can be forgotten.** A `postinstall` copy is a step that exists
outside the dependency graph. It has to be present in the host's build, it has
to survive every change to that build, and when it is missing the failure
appears at runtime in somebody else's deployment as a parser that cannot load.
An embedded binary either installs or does not.

**It is one fewer request and one fewer content type.** Serving `.wasm`
requires the right MIME type from whatever reverse proxy sits in front of the
deployment, and a Content Security Policy permitting `wasm-unsafe-eval`. Both
are configuration in a file this project does not own. A base64 payload inside
a JavaScript chunk is served as JavaScript, which every deployment already
serves correctly.

**The cost is paid once and only when needed.** Base64 is one third larger than
the binary it encodes, which is the honest cost of the choice. It does not
reach the main bundle: the parser sits in a chunk that is fetched the first
time a model actually has to be converted, and a user who never opens the page
never downloads it. A production build of the client places no reference to the
renderer or the parser in its entry chunk.

The trade is a larger artifact on the one download that needs it, against a
deployment step that cannot be got wrong. For a platform whose install stories
include localhost and air-gapped, the second matters more.

### Recording Where an Artifact Came From

Every derived file records the hash of the source it was made from and the name
and version of the converter that made it. The manifest schema refuses a
manifest without them. This is what makes a stale artifact detectable instead
of merely wrong.

## Live Readings

The viewer draws whatever readings it is given and subscribes to nothing. It
knows neither the broker nor the topic scheme, which is what lets the same
component serve a demonstration fed by a local publisher and a deployment fed
by the platform.

How readings reach the client is **still open**. Two shapes are possible and
they are not equivalent:

- The client subscribes to MQTT over WebSocket against the platform's RabbitMQ,
  through the `rabbitmq_web_mqtt` plugin, and passes the latest value to the
  viewer.
- A platform service, the MQTT Agent described in the DTaaS material,
  subscribes, validates, stores, and serves the latest value to the client.

The second is the better separation and depends on that service existing and
running, which has not yet been confirmed. Until it is settled the route shows
a model with no readings, which is the correct behaviour for a model that
declares no sensors anyway, and the majority of architectural models do.

## What Is Not Built Yet

- **History behind a click.** The manifest already carries the `history` block,
  with bucket, measurement and tags, so the Grafana address can be built from
  it. Opening that panel from a marker is not implemented.
- **Federation.** Several discipline models viewed together as one building is
  not supported. Each model is drawn on its own.
- **Writing the converted geometry back to the library**, so a model is
  converted once instead of on every visit.
