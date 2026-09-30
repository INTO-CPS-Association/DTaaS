# Building Models

A route that opens an IFC building model from the signed-in user's library,
draws it, and colours it by whatever the sensors in it are reading. The
user-facing documentation is `docs/user/website/bim.md`.

## What Lives Here and What Does Not

Three files, and all three are wiring:

| File                 | What it does                                                                                          |
| -------------------- | ----------------------------------------------------------------------------------------------------- |
| `Bim.tsx`            | Puts the page in the DTaaS layout, waits for the signed-in user, and hands the viewer the library URL |
| `library.ts`         | Names the folder models live in, `common/models`, once                                                |
| `persistGeometry.ts` | Writes a model converted in the browser back to the library, so it is converted once                  |

The page itself comes from `@into-cps-association/bim-kit`, a package maintained
in the [ifc-utils](https://github.com/INTO-CPS-Association/ifc-utils) repository
and published on npmjs. The IFC file is converted to geometry in the browser by
that same package, so nothing is installed beside DTaaS and no separate service
runs.

The reason for the split is release cadence. A change to how a model is drawn,
to the markers, or to how a sensor manifest is read is a version of that
package. It reaches a DTaaS install as a dependency bump and not as a pull
request against this repository.

The route is loaded with `React.lazy` in `client/src/routes.tsx`, so the
renderer and the WebAssembly geometry kernel stay out of the entry chunk. That
is stated at the route and not left to the package's internal imports, where it
could regress on a version bump.

## How the Page Finds a Model

The route asks for the user's library URL through `useURLforLIB`, which is the
same call the Library page makes, and hands it to the viewer with the folder
from `library.ts`. The viewer lists that folder, so a person uploads an
IFC there the way they upload anything else and it appears in the IFC Model
menu. No path, host or user name is written in this code.

A model may sit beside a `.manifest.json` naming which object each sensor is
attached to and which MQTT topic it publishes on. When one is present the viewer
binds the readings to the geometry. When it is absent the model still opens,
with no sensors, which is the ordinary case for a file that has just been
uploaded.

With readings arriving, the heatmap groups them four ways: per sensor, per room,
per floor and over the whole building. A scope is offered when it puts the
sensors in more than one group, so a model declaring ten storeys with all its
sensors on one of them is not offered Per Floor, which would paint the building
one colour. Per Sensor rasterises the floor, floods outwards from each sensor
through open cells, and draws the result as a sheet over the floor. Walls stop
it and doors let it through, so a sensor colours its own room and not the office
next door.

## Running It Locally

The viewer comes from `@into-cps-association/bim-kit` on npmjs, pinned to an
exact version in `client/package.json`, so `yarn install` fetches it like any
other dependency.

```sh
cd client
yarn install
yarn build && yarn config:local
```

Until a published `intocps/dtaas-web` image carries this route, the build has to
be mounted over that image. Compose reads a file called
`docker-compose.override.yml` beside `docker-compose.yml` automatically, so
write one in `deploy/dtaas/docker/localhost` naming the local build directory,
and start the stack with no flags:

```sh
docker compose -p dtaas up -d
```

That file is not versioned, because it names a path on one machine.

## The Deployment's User Name Has to Be the One That Signs In

`DEFAULT_USER` in the deployment's `.env` decides which workspace container is
started and which path Traefik routes to it. The name the page asks for comes
from somewhere else: the identity provider, through the OIDC profile.

When the two differ, nothing reports an error. The request for the library stops
matching the workspace route, falls through to the client's `PathPrefix(/)`, and
the React application answers with its own page and HTTP 200. Library shows a
404 inside its frame and Building Models says the library returned a web page.
Both come from one line of configuration. To check a deployment in one command,
with the stack up:

```sh
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' \
  "http://localhost/$(grep DEFAULT_USER .env | cut -d= -f2)/api/contents/common"
```

`200 application/json` is right. `200 text/html` means the name is wrong: the
request is being served by the client instead of by the workspace. The name to
use is the last segment of the profile URL the identity provider returns, which
is what the client itself uses to build the address.

## Against the Criteria in Issue 1762

| Criterion                                                           | State                                                                                                         |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Manifest schema validated with zod, clear errors                    | Done. An error names `bindings[3].display.ramp` and says why. The manifest is JSON, not YAML                  |
| GLB or OBJ renders in a lazy route, outside the main chunk          | Done for GLB. See below for OBJ                                                                               |
| Markers resolve by `globalId` and `nodeName`, show live MQTT values | Resolver done. Live values are open, see below                                                                |
| Clicking a marker opens the Grafana panel                           | Not built. The manifest already carries the `history` block the address would be built from                   |
| IFC viewable end to end, conversion documented                      | Done. Conversion runs in the browser and is documented                                                        |
| WASM and workers from the DTaaS origin, works offline               | Done. A production build contains no `.wasm` file and fetches none                                            |
| Derived artifacts record source hash and converter version          | Done for the manifest, whose schema refuses one without them. A GLB carries neither yet, whoever converted it |
| Documentation under `docs/`                                         | Done                                                                                                          |
| Unit tests for manifest and resolver, Playwright for the route      | Done. The package has its own suite, 44 unit tests cover this route, and 5 Playwright tests                   |
| No qlty issues                                                      | Checked on the pull request                                                                                   |

Two of those need a sentence instead of a word.

**OBJ is deliberately out.** The binding key is the IFC `GlobalId`, and glTF
carries it per node in `extras`. OBJ has no equivalent field, so a marker on an
OBJ model can resolve only by node name, and the resolver refuses a name two
objects share instead of guessing. Supporting OBJ would deliver only the half of
the contract that the manifest does not depend on.

**Live values are not settled.** The viewer subscribes to nothing and draws
whatever readings it is handed, which is what lets the same component serve a
local demonstration and a platform deployment. Whether the client subscribes to
RabbitMQ over WebSocket, or a platform service does it and serves the latest
value, is the open question in issue 1762 and is recorded in
`docs/user/website/bim.md`.

## Security Notes

The route is behind `PrivateRoute`, like every page that reads a user's files.

Model conversion happens in the browser, in WebAssembly, against a file the
signed-in user already has access to. No new server-side endpoint exists: the
route reads and writes through the workspace's own Jupyter Contents API, which
the Library page already uses.

The route does write. When a model has no geometry beside it, the conversion
produced in the browser is written back as a `.glb` next to the `.ifc`, so the
next visit loads a file instead of converting again. That is the one
state-changing thing on this page, and `persistGeometry.ts` is where all of it
lives. What bounds it:

- The destination is derived from the model's own path and then checked: it has
  to be a single file directly inside `common/models`, with no `..` and no
  leading slash. The path comes from a listing the workspace returned, so it is
  not user input today, and the check is there for the day something else feeds
  that function.
- An address that already holds a file is left alone, so a geometry produced
  outside the browser is never replaced by one produced inside it. The check
  fails closed: only a 404 lets the write go ahead, and a check that fails
  outright skips it.
- Every write, of one piece or many, goes to `<model>.glb.part` and takes its
  real name with a rename once the last piece has landed. The server refuses
  that rename when the real name was taken in the meantime, so a write that
  stops half way never shows as a converted model that cannot be read, and a
  file that appeared during the write is not replaced.
- A write that fails deletes its `.part`. Leaving the page aborts the write,
  and the `.part` is deleted as well.
- A piece the server in front of the workspace refuses as too large (413) makes
  the write start over once in pieces of half the size.
- The request is credentialed, and the address it goes to is assembled by the
  application from its own deployment configuration and the signed-in user name.
  That is what makes sending credentials to it acceptable.

One deployment assumption is load-bearing. The Jupyter server can guard writes
with a token it sets as the `_xsrf` cookie and expects echoed in a header. The
workspace image this runs against sets no such cookie and accepts the write, so
the token is sent when present and left out when it is not. On a workspace that
does enable that protection with an `HttpOnly` cookie, script cannot read it and
every write here is refused. That failure costs a reconversion and nothing else,
and it is written to the browser console so the deployment does not look like
one where the feature works. `docs/admin/workspace/index.md` says what to change
on such a workspace.

The GitLab application id used for sign-in is deployment configuration and stays
in the deployment's own `config/client.js`, which is gitignored. It is not a
secret (it is compiled into the JavaScript any visitor downloads), but it
differs per install and does not belong in source.
