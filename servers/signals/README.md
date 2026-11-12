# Signals Gateway Microservice

The signals gateway will serve the live and past signals of digital twins
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
| `POST /signals/range` | `401` without a valid token, `403` when no path is readable, else `501` |

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
counted. History from PostgreSQL comes in phase 4 of the plan.

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

`yarn test:int` starts RabbitMQ 4.4.0 with the MQTT plugin in Docker and
checks that the gateway receives a device's reading and is refused a topic
outside its read permission. It is skipped when Docker is not running.
