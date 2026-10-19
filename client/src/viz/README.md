# Visualisation Core

The common visualisation core of the client: the layers every domain shares,
built once, which extensions consume through the SDK's `signals` and `viz`
services and never re-implement. It follows layers 1 to 5 of the modular
architecture in `dtaas-sdk`.

## What Each File Does

| File                         | Layer   | Role                                                               |
| :--------------------------- | :------ | :----------------------------------------------------------------- |
| `mqttTransport.ts`           | 1       | Live samples from the platform's RabbitMQ, over MQTT on WebSockets |
| `payload.ts`                 | 1       | One broker message to one `SignalSample`                           |
| `sampleStore.ts`             | 2       | Every recent sample of each signal, read by time                   |
| `playhead.ts`                | 2       | The one clock every page reads, live or scrubbed                   |
| `signals.ts`                 | 1 and 2 | The `signals` service: subscriptions, reads and connection state   |
| `connection.ts`              | 1       | Whether the transports behind some signals are delivering          |
| `encodings.ts`, `schemes.ts` | 4       | From a value to visual properties, such as a colour                |
| `resolve.ts`                 | 4       | Every encoding of a `visualisation.json` at one instant            |
| `vizService.ts`              | 3 and 5 | The `viz` service: the file, and what extensions contribute        |
| `createCore.ts`              |         | The core of a deployment, from `env.js`                            |
| `substrates/`                | 3       | The standard `image` and `embed` substrates                        |
| `components/`                | 5       | The viewer and the timeline the Visualise tab draws                |

## The Standard Substrates

`image` draws a photograph or a drawing with its anchors on an SVG layer in
the picture's own pixels. The SDK leaves the form of an image anchor's `ref`
to the substrate, so it is fixed here:

- `image-point`: one point, `"x,y"`, drawn as a dot.
- `image-region`: a polygon, its corners as in SVG, `"x1,y1 x2,y2 x3,y3"`.

With a `homographyId`, the coordinates are in the world units of the
calibration of that id, and a homography fitted to its point pairs by least
squares maps them onto the picture.

`embed` shows another tool's page, such as a Grafana dashboard, in a frame.
When the descriptor names `timeParams`, the frame asks for the hour before
the playhead (`options.windowMs` changes the window), relative to `now` while
the playhead is live, so the tool refreshes itself, and absolute once it is
scrubbed.

## The Visualise Tab

`route/digitaltwins/visualise/` lists the twins in the library, reads the
`visualisation.json` of the one chosen, and draws it with `TwinViewer`: one
pane per substrate of the layout, every pane on the one playhead, which
`Timeline` moves.

## Configuration

`REACT_APP_VIZ_MQTT_URL` names the broker's MQTT over WebSocket address, and
`REACT_APP_VIZ_MQTT_USERNAME` and `REACT_APP_VIZ_MQTT_PASSWORD` its login when
it asks for one. The platform services publish it on `RABBITMQ_WEB_MQTT_PORT`
at the path `/ws`. Without an address the core still runs: every connection
reads `down`, and visualisations are still read and saved.

A signal path is the MQTT topic. A message may be JSON with a `value`, a bare
number, or the comma-separated line of the DTaaS examples, whose `simulation`
type is kept on the `simulated` channel.

## Not Built Yet

- History from InfluxDB, ThingsBoard as a device registry, and the STOMP,
  HTTP and file transports the schema allows.
- The 3D substrate. The Buildings extension still draws its own viewer.
- The flow, glyph, field overlay and trajectory encodings, which resolve to
  no properties until a substrate draws them.
- Saving a visualisation as a merge request.

`test/unit/viz/resolve.test.ts` replays a recorded stream through a
visualisation and checks the properties at each instant of a scrub, with no
substrate mounted. That is the exit test of the first phase in the companion
report.
