# Signals Gateway Microservice

The signals gateway will serve the live and past signals of digital twins
to the DTaaS client, so that no broker or PostgreSQL credential reaches the
browser. The requirements and the choices behind it are in
[the plan](../../docs/developer/plans/signals-gateway.md).

This is the skeleton. It has the configuration, the build, the tests and
the publishing workflow. The routes keep their final paths:

| Route | Answer now |
| :--- | :--- |
| `GET /signals/health` | `200` with `{"status":"ok"}` |
| `POST /signals/stream` | `501` with `{"status":"not-implemented","route":"stream"}` |
| `POST /signals/range` | `501` with `{"status":"not-implemented","route":"range"}` |

Sign-in and access control come in phase 2 of the plan, live samples over
MQTT in phase 3 and history from PostgreSQL in phase 4.

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
