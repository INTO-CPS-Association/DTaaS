# Signals Gateway Microservice

The signals gateway will serve the live and past signals of digital twins
to the DTaaS client, so that no broker or PostgreSQL credential reaches the
browser. The requirements and the choices behind it are in
[the plan](../../docs/developer/plans/signals-gateway.md).

The routes keep their final paths. Stream and range sign the user in and
decide access, then answer `501` until their phases fill them in:

| Route | Answer now |
| :--- | :--- |
| `GET /signals/health` | `200` with `{"status":"ok"}` |
| `POST /signals/stream` | `401` without a valid token, `403` when no path is readable, else `501` |
| `POST /signals/range` | `401` without a valid token, `403` when no path is readable, else `501` |

A token is either a GitLab token, which GitLab is asked about, or a JWT of
a Keycloak realm or Dex instance named in `oidc-providers`. A path is
readable when a twin in a readable project of the DTaaS group declares it
in its committed `visualisation.json` and the topic starts with a prefix of
the owner's group in `owners-file`, which `dtaas-services` writes. Every
decision is logged without the token. Live samples over MQTT come in phase 3
and history from PostgreSQL in phase 4 of the plan.

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
yarn start
```
