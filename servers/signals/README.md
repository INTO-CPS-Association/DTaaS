# Signals Gateway Microservice

The signals gateway serves the live and past signals of digital twins
to the DTaaS client, so that no broker or PostgreSQL credential reaches the
browser. The requirements and the choices behind it are in
[the plan](../../docs/developer/plans/signals-gateway.md).

The routes keep their final paths. Each one except health signs the user in
and decides access first:

| Route                   | Answer now                                                                                                                                                              |
| :---------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /signals/health`   | `200` with `{"status":"ok"}`                                                                                                                                            |
| `POST /signals/stream`  | `401` without a valid token, `403` when no path is readable, else live samples as server-sent events                                                                    |
| `GET /signals/stats`    | What the user's ended streams forwarded and dropped                                                                                                                     |
| `POST /signals/command` | `401` without a valid token, `400` for a path that takes no command, `403` without write access or a `setpoint` declaration, else `202` once the broker has the command |
| `POST /signals/range`   | `401` without a valid token, `403` when no path is readable, else past samples as JSON, `502` when the database fails                                                   |

A token is either a GitLab token or a JWT of a Keycloak realm or Dex
instance named in `oidc-providers`. GitLab is asked about a GitLab token
with `/oauth/token/info`, and the token must belong to an application in
`gitlab-client-id` and carry a scope of `gitlab-scopes`. The token is never
logged, written to disk or sent anywhere but `gitlab-url`. A project is
readable with the Reporter role at least, since every signed-in user can
read a project with internal visibility. A path is
readable when a twin in a readable project of the DTaaS group declares it
in its committed `visualisation.json` and the topic starts with a prefix of
the owner's group in `owners-file`, which `dtaas-services` writes. Every
decision is logged without the token. Live samples come from RabbitMQ over
MQTT, on one connection of the service account `dtaas_signals`. A message
outside the payload convention (`value`, `ts` and `unit`) is dropped and
counted. Past samples come from the `reading` table of the database of the
owner's group, which Telegraf writes, read as `dtaas_signals_ro`. A topic of
eight levels names its series by device and quantity. A range with more
points than `range-max-points` is averaged in `date_bin` bins.

A command goes to `<device topic>/cmd/<command>` with the payload of the
convention. It needs a twin that declares the actuator topic on the
`setpoint` channel and write access to its project: Developer in GitLab
(`gitlab-min-write-level`), or `<owner>_member` or `<owner>_admin` from
Keycloak, or a role from the GitLab connector of Dex. Commands go on a
second MQTT connection, since RabbitMQ closes a connection that publishes
where it may not. A command the broker does not take within
`command-timeout` answers `504`.

The stream route writes server-sent events by hand on a `POST`, not through
the `@Sse()` decorator of NestJS. The decorator answers `GET`, and a `GET`
would carry the list of paths in the URL, where proxies and logs keep it. The
body of the `POST` carries the paths and the `Authorization` header carries the
token, so both stay out of URLs.

Each live sample carries the time the gateway received it as its event id,
and a stream that reaches `stream-max-age` sends an `end` event before it
closes. A client that opens the stream again with `Last-Event-ID` first gets
the readings of the gap from the history, marked `backfill`, then the live
ones. A gap the history cannot fill is reported in a `gap` event.

## Configuration

Copy [`config/signals.yaml.sample`](config/signals.yaml.sample) to
`signals.yaml` and adjust it. Every key can also be set with an environment
variable: `SIGNALS_` and the key in upper case with `_` for `-`, for example
`SIGNALS_PORT`. The service reads the file named by `SIGNALS_CONFIG_PATH`,
or `signals.yaml` in the working directory when that variable is not set.

## Development

```bash
yarn install
yarn syntax:check
yarn format:check
yarn build
yarn test
yarn test:int
yarn start
```

`yarn test:int` starts RabbitMQ 4.4.0 with the MQTT plugin and PostgreSQL
18.6 in Docker. It checks that the gateway receives a device's reading, is
refused a topic outside its read permission, delivers a command and is
refused a publication outside `cmd`, reads and bins the history and
cannot write with its read-only account. It is skipped when Docker is not
running.
