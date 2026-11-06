# Signals Gateway Microservice

The signals gateway serves the live and past signals of digital twins
to the DTaaS client, so that no broker or PostgreSQL credential reaches the
browser. The requirements and the choices behind it are in
[the plan](../../docs/developer/plans/signals-gateway.md).

The routes keep their final paths. Each one except health signs the user in
and decides access first:

| Route | Answer now |
| :--- | :--- |
| `GET /signals/health` | `200` with `{"status":"ok"}` |
| `POST /signals/stream` | `401` without a valid token, `403` when no path is readable, else live samples as server-sent events |
| `GET /signals/stats` | What the user's ended streams forwarded and dropped |
| `POST /signals/command` | `401` without a valid token, `400` for a path that takes no command, `403` without write access or a `setpoint` declaration, else `202` once the broker has the command |
| `POST /signals/range` | `401` without a valid token, `403` when no path is readable, else past samples as JSON, `502` when the database fails |

A token is either a GitLab token, which GitLab is asked about, or a JWT of
a Keycloak realm or Dex instance named in `oidc-providers`. A path is
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
