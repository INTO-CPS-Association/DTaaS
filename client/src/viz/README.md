# Visualisation Core

The common visualisation core of the client: the layers every domain shares,
built once, which extensions consume through the SDK's `signals` and `viz`
services and never re-implement. It follows layers 1 to 5 of the modular
architecture in `dtaas-sdk`. The contract it implements,
`@into-cps-association/dtaas-sdk`, lives in `client/sdk/`.

## What Each File Does

| File                  | Layer   | Role                                                                                    |
| :-------------------- | :------ | :-------------------------------------------------------------------------------------- |
| `transport.ts`        | 1       | What a live transport offers the signals service                                        |
| `gatewayTransport.ts` | 1       | Live samples from the signals gateway, one stream for every path                        |
| `gatewayEvents.ts`    | 1       | What each event of a gateway stream does                                                |
| `streamResume.ts`     | 1       | The last event id and a planned end, kept for the next stream                           |
| `laterTimer.ts`       | 1       | A timer that runs one action later, replaced by the next                                |
| `gatewayHistory.ts`   | 1       | Past samples of signals from the signals gateway                                        |
| `gateway.ts`          | 1       | The gateway's address and the token header of every request                             |
| `sseStream.ts`        | 1       | Server-sent events read through fetch, so a request has a header                        |
| `payload.ts`          | 1       | One broker message to one `SignalSample`                                                |
| `deliveryTimings.ts`  | 1       | The source, gateway and arrival times of the last live samples                          |
| `sampleStore.ts`      | 2       | Every recent sample of each signal, read by time                                        |
| `playhead.ts`         | 2       | The one clock every page reads, live or scrubbed                                        |
| `time.ts`             | 2       | When a playhead counts as live and the hour the timeline spans                          |
| `signals.ts`          | 1 and 2 | The `signals` service: subscriptions, reads and connection state                        |
| `connection.ts`       | 1       | Whether the transports behind some signals are delivering                               |
| `encodings.ts`        | 4       | From a value to visual properties, such as a colour, with the colour schemes of the SDK |
| `resolve.ts`          | 4       | Every encoding of a `visualisation.json` at one instant                                 |
| `vizService.ts`       | 3 and 5 | The `viz` service: the file and what extensions contribute                              |
| `createCore.ts`       |         | The core of a deployment, from `env.js`                                                 |
| `substrates/`         | 3       | The standard `image` and `embed` substrates                                             |
| `components/`         | 5       | The viewer and the timeline the Visualise tab draws                                     |

## The Standard Substrates

`image` draws a photograph or a drawing with its anchors on an SVG layer in
the picture's own pixels. The SDK leaves the form of an image anchor's `ref`
to the substrate, so it is fixed here:

- `image-point`: one point, `"x,y"`, drawn as a dot.
- `image-region`: a polygon, its corners as in SVG, `"x1,y1 x2,y2 x3,y3"`.

With a `homographyId`, the coordinates are in the world units of the
calibration of that id and a homography fitted to its point pairs by least
squares maps them onto the picture.

`embed` shows another tool's page, such as a Grafana dashboard, in a frame.
When the descriptor names `timeParams`, the frame asks for the hour before
the playhead (`options.windowMs` changes the window), relative to `now` while
the playhead is live, so the tool refreshes itself, and absolute once it is
scrubbed. The frame sends no referrer and is sandboxed. A page of another
origin keeps its own origin, so a dashboard can sign in and draw. A file of
the library (`lib://`) runs in an opaque origin, so it cannot act as the DTaaS
site on the user's behalf.

A substrate of a domain comes from its extension. `aec`, the building model in
3D, is contributed by the bim extension in `client/extensions/bim/` and loaded
only when a visualisation draws a building.

## The Visualise Tab

`route/digitaltwins/visualise/` lists the twins in the library, reads the
`visualisation.json` of the one chosen as committed in GitLab, the copy the
signals gateway authorises against and draws it with `TwinViewer`: one
pane per substrate of the layout, every pane on the one playhead, which
`Timeline` moves.

## Configuration

`REACT_APP_VIZ_SIGNALS_URL` names the DTaaS signals gateway. The gateway
reads the broker and the time-series database on the server, so no broker
login reaches the browser. The client sends the signed-in user's GitLab
access token in the `Authorization` header of every request, never in an
address. `EventSource` cannot send that header, so the live stream is a POST
read through fetch and cut into events in `sseStream.ts`.

One stream carries every path the open pages use. When the set changes, the
stream is opened again with the new set, 100 ms later, so a page that
subscribes to many sensors as it renders opens one stream. A stream that
fails or ends reads `down` and the next one opens 5 s later, or after the
wait the gateway names with `retry:`. A stream the gateway ends at its age
with an `end` event opens again after 100 ms. Each new stream sends the id of
the last event as `Last-Event-ID` (`streamResume.ts`), and the gateway first
sends the readings of the gap from its history, marked `backfill`, which stay
out of the delivery timings. A path the gateway refuses is not asked
for again until no page uses it. A `range` reads the gateway's history into
the sample store first, so past samples and samples that arrived live come
back as one series. Nothing connects until a page subscribes. Without an
address the core still runs: every connection reads `down`, a range holds
what the client has seen and visualisations are still read and saved.

`historyCoverage.ts` records the stretches of time the store holds for each
signal and channel: what a range read and, while a path is subscribed, the time
from its subscription on. `historyLoader.ts` asks `POST /signals/range` only for
the gaps that no running read asks for already, at most seven days back, so each
instant is requested once. It keeps whether the gateway cut an answer short.
The viewer of the Visualise tab reads the hour before the playhead, so on open
the gateway is asked once for the hour before the page opened. A
scrub back in time asks only for the stretch the store lacks. When an answer
was cut short, the timeline says that older readings were left out.

When the gateway answers 401, `gatewaySession.ts` keeps the refused token. The
stream and the range do not send that token again, the timeline asks the person
to sign in again and the next request goes out only with another token.

### Which Token the Gateway Receives

The [gateway plan](../../../docs/developer/plans/signals-gateway.md) gives the
gateway an OIDC application of its own, with sign-ins that stay transparent
to the user. The client cannot obtain a token for that application silently
today. Silent sign-in in a hidden frame needs GitLab inside a frame, which
GitLab refuses, and the client keeps its tokens in page memory, so a full
redirect to GitLab for a second application would sign the client out. The
client therefore sends its own token. The token is read at each request, goes
only to `REACT_APP_VIZ_SIGNALS_URL` and only in the `Authorization` header,
and is never logged or stored. Until the client sends a token of the
gateway's application, the gateway lists the client's application next to
its own among the applications it accepts. The way to the gateway's own
token is step 8 of the access plan, a website backend that holds the tokens
and runs the gateway's sign-in as a redirect the user does not see, since
GitLab skips the consent screen for an application an administrator marks
as trusted.

A signal path is the broker topic. A message may be JSON with a `value`, a bare
number, or the comma-separated line of the DTaaS examples, whose `simulation`
type is kept on the `simulated` channel.

## Not Built Yet

- ThingsBoard as a device registry and the STOMP, HTTP and file transports
  the schema allows.
- The flow, glyph, field overlay and trajectory encodings, which resolve to
  no properties until a substrate draws them.
- Saving a visualisation as a merge request.

`test/unit/viz/resolve.test.ts` replays a recorded stream through a
visualisation and checks the properties at each instant of a scrub, with no
substrate mounted. That is the exit test of the first phase of the
[modular architecture](https://github.com/INTO-CPS-Association/dtaas-sdk/blob/main/docs/dtaas-client-modular-architecture.md).
