# Building Models

The Building Models page draws a building from the user's own library and
colours it with the readings its sensors report, so you can see, for example,
which of forty rooms is the warm one. A time-series dashboard cannot show that.
Open it from **Buildings** in the menu.

![Building Models page](images/buildings.png)

This page describes the asset layout, the binding manifest and the conversion
workflow. It is the user documentation for DTaaS issue 1762. The page is a
client extension that comes from the `bim-kit` package, and
[Client Extensions](../../developer/system/extensions.md) describes how the
client loads it.

## What the Page Needs

The page reads up to four files per model, all in the user's library under
`common/models`. The page links to that folder above the viewer.

| File | Required | What it holds |
| --- | --- | --- |
| `model.ifc` | yes | The building, as the authoring tool exported it |
| `model.glb` | no | The geometry converted from the IFC file. The page writes it the first time the model is converted |
| `model.json` | no | The property tree: every object, its IFC class, its storey, its property sets |
| `model.manifest.json` | no | The binding manifest, mapping each sensor to the object it measures |

An IFC file on its own is enough to see the building. With the geometry file,
the next visit loads the model instead of converting it again. The property
tree adds the panel that opens when you click an object, and the manifest adds
the readings. Nothing fails when the last three files are missing.

## How a Model Is Named

The IFC Model menu names each model by what its own file says the building is
called: the project's long name, then its name, then the building's. Only the
first 64 KB of each file is read for this. The menu skips template text that an
authoring tool leaves behind, such as `Project Name`, and names that two files
share. Those models are shown by their file name, with underscores read as
spaces.

To give a name to a file that has none, use `ifc-set-name` from the
[ifc-utils](https://github.com/INTO-CPS-Association/ifc-utils) repository. It
writes the name into the file and changes nothing else. DTaaS stores nothing
about the names.

## The Geometry Format

The model is converted to glTF binary, `.glb`. The issue offered OBJ as an
alternative. OBJ was rejected because it cannot carry a stable identifier per
object, which is the property the issue itself relies on.

The binding key is the IFC `GlobalId`, a 22-character identifier that the schema
expects to stay the same across exports of the same model. glTF carries
arbitrary data per node in its `extras` field, so the converter writes the
`GlobalId` there and the viewer resolves a binding by reading it back. OBJ has
no such field. A marker on an OBJ model can only be placed by node name, and
names are not unique. Two walls are often both called `Wall`, and the resolver
refuses that case instead of guessing which one the reading belongs to. A model
without a stable identity per object cannot carry a binding that someone can
review.

## The Binding Manifest

The manifest is plain JSON beside the model, and it is validated with `zod`
before anything is drawn. People write it by hand and it will often contain
mistakes, so every error names the binding and the field that caused it, for
example `bindings[3].display.ramp`, instead of only reporting that the file is
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

Four design decisions shape the format:

- `selector` is a small union of `globalId`, `nodeName` and `expressId`, so a
  non-IFC asset can use the same manifest instead of a second schema.
  A selector names exactly one of the three. If it named two, the resolver
  would have to choose between them, and the result would depend on that
  choice.
- `live` and `history` are separate. MQTT supplies the current value shown on
  the model, and the time-series database supplies the panel that opens on a
  click. The 3D view does not reimplement charting.
- `source_sha256` is required. Without it there is no way to tell whether a
  derived artifact still describes the file beside it. The literal `unknown` is
  accepted, for a generator that never read the source, and anything else has
  to be a SHA-256.
- `display.ramp` is the range the colour scale spans, and the viewer also reads
  it as the range the sensor is expected to stay inside. A value outside it
  raises an alert on the sensor card.

A binding whose object is missing from the geometry is reported and counted.
This happens when an object is deleted and drawn again, or when the exporting
tool does not keep the `GlobalId` and writes a new one. If the manifest asks for
six markers and only four objects are found, the viewer says which two are
missing instead of silently drawing four.

## Conversion

Conversion runs in the browser of whoever opens the model. Putting an IFC file
in the library is the whole workflow. You do not need a terminal or a separate
service, and there is no step to repeat when the file changes.

### Why the Parser Ships Inside the Package

The issue asked that the WebAssembly parser and its workers be served from the
DTaaS origin, so the feature works in a localhost install with no external
network, and it proposed a `postinstall` copy step to achieve that.

The converter package meets the same requirement differently. The `web-ifc`
WebAssembly binary is embedded in the JavaScript as base64 at build time, so the
published package contains it and there is no separate `.wasm` file to serve.
A production build of the client contains no `.wasm` files and fetches none.

This was chosen over the copy step for three reasons.

First, there is no extra step to forget. A `postinstall` copy sits outside the
dependency graph. It has to be present in the host's build and survive every
change to that build. When it is missing, the failure shows up at runtime in
somebody else's deployment as a parser that cannot load. An embedded binary
either installs or does not.

Second, it saves a request and a content type. Serving `.wasm` requires the
right MIME type from the reverse proxy in front of the deployment, and a
Content Security Policy that permits `wasm-unsafe-eval`. Both are configured in
files this project does not own. A base64 payload inside a JavaScript chunk is
served as JavaScript, which every deployment already handles correctly.

Third, the cost is paid only when needed. Base64 is one third larger than the
binary it encodes. That extra size stays out of the main bundle: the parser is
in a chunk that is fetched the first time a model has to be converted, and a
user who never opens the page never downloads it. The entry chunk of a
production build has no reference to the renderer or the parser.

The result is a larger download for the one page that needs it, in exchange
for a deployment step that cannot be done wrong. DTaaS is installed on
localhost and in air-gapped environments, where the second matters more.

### Converting Once Instead of on Every Visit

When a model has no `.glb` beside it, the page converts it in the browser and
writes the result back into the library, next to the `.ifc`. The next visit
finds the file and loads it, so only the first person to open the model waits
for the conversion.

The write goes through the workspace's own Jupyter Contents API, the same
interface the Library page reads through. It writes in pieces of 512 KB,
because the server in front of Jupyter refuses a request body of a megabyte.
The write has limits: the destination has to be a single file directly inside
`common/models`, and an address that already holds a file is left alone, so a
geometry produced outside the browser is never replaced. When the page cannot
tell whether a file is there, it does not write.

The bytes are written to `model.glb.part`, and the file takes its real name only
when the last piece has landed. A write that fails, or that stops because the
person left the page, deletes its `model.glb.part`. If the `.part` file could
not be deleted because the tab was closed, it stays visible in JupyterLab
beside the model. It is safe to delete, and the next conversion of that model
replaces it anyway.

If the server in front of the workspace refuses a piece as too large, the write
starts over once in pieces of half the size.

A failed write shows nothing on the page, by design: a model that is not
stored is simply converted again on the next visit. One case is worth knowing
about. On a workspace with Jupyter XSRF protection enabled, the token is in an
`HttpOnly` cookie that scripts cannot read, so every write is refused. The
failure is written to the browser console.

For a large model it is still better to produce the `.glb` outside the browser
with `ifc-to-glb` from the
[ifc-utils](https://github.com/INTO-CPS-Association/ifc-utils) repository, as
the administrator documentation recommends. The browser conversion covers the
case where nobody has done that.

### Recording Where an Artifact Came From

The manifest records the hash of the source it was made from and the name and
version of the converter that made it, and the schema refuses a manifest
without them. This makes it possible to detect a stale manifest. A `.glb` does
not carry that record yet, whether `ifc-to-glb` wrote it or the browser did. It
names the tool that generated it and says nothing about the source.

## Live Readings

The viewer draws whatever readings it is given and opens no connection of its
own. The client reads them through the DTaaS signals gateway, which subscribes
to the platform's RabbitMQ on the server, and hands each binding the latest
reading of the topic its manifest names. The browser holds no broker login:
it sends the gateway the user's GitLab access token instead. The gateway
serves a topic only when a twin in a GitLab project the user can read declares
it in its committed `visualisation.json`, so a user sees the readings of the
twins they can read in GitLab and of no others. The administrator starts the
gateway as the [signals gateway pages](../../admin/servers/signals/docker.md)
describe, and sets its address in `REACT_APP_VIZ_SIGNALS_URL`, as the
[client configuration](../../admin/client/config.md) describes.

Without that address the page still opens every model, with no readings. That
is also the behaviour for a model that declares no sensors, and most
architectural models declare none.

A reading published as `timestamp,measurement,type,unit,value` with the type
`simulation`, as the BIM example of the DTaaS examples publishes, is kept as a
simulated value. The page shows it for an object that has no measured value,
and a measured value always takes its place.

## When the Page Says the Library Returned a Web Page

`DEFAULT_USER` in the deployment's `.env` decides which workspace container
is started and which path Traefik routes to it. The name the page asks for
comes from the identity provider, through the OIDC profile. When the two
differ, nothing reports an error. The request for the library stops matching
the workspace route, falls through to the client's `PathPrefix(/)`, and the
client answers with its own page and HTTP 200. Library shows a 404 inside its
frame, and Building Models says the library returned a web page. Both come
from one line of configuration.

To check a deployment with one command, with the stack up:

```sh
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' \
  "http://localhost/$(grep DEFAULT_USER .env | cut -d= -f2)/api/contents/common"
```

`200 application/json` is right. `200 text/html` means the name is wrong:
the request is served by the client instead of by the workspace. The name to
use is the one the client resolves from the identity provider's claims, in
the order given in
[Username claim resolution](../../admin/client/auth.md#username-claim-resolution-for-oidc-providers)
(`preferred_username` first, the last segment of the profile URL only as a
later fallback), lowercased. The client builds the address from that name.

## What Is Not Built Yet

- History on click: the manifest already carries the `history` block, with
  bucket, measurement and tags, so the Grafana address can be built from it.
  Opening that panel from a marker is not implemented.
- Federation: viewing several discipline models together as one building is
  not supported. Each model is drawn on its own.
