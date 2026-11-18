# Signals Gateway Microservice

The signals gateway will serve the live and past signals of digital twins
to the DTaaS client, so that no broker or PostgreSQL credential reaches the
browser.

This is the skeleton. It has the configuration, the build, the tests and
the publishing workflow. The routes keep their final paths:

| Route | Answer now |
| :--- | :--- |
| `GET /signals/health` | `200` with `{"status":"ok"}` |
| `POST /signals/stream` | `501` with `{"status":"not-implemented","route":"stream"}` |
| `POST /signals/range` | `501` with `{"status":"not-implemented","route":"range"}` |

Sign-in and access control, live samples over MQTT and history from
PostgreSQL come in later versions of the service.

## Configuration

The service reads the YAML file named by the `SIGNALS_CONFIG_PATH`
environment variable, or `signals.yaml` in the working directory when that
variable is not set. Every key can also be set with an environment
variable: `SIGNALS_` and the key in upper case with `_` for `-`, for
example `SIGNALS_PORT`. Environment variables override the file.

Save this as `signals.yaml` and adjust it. It lists every key with its
default value:

```yaml
# Where the service listens.
hostname: 127.0.0.1
port: 4004

# Largest JSON request body, in bytes.
max-payload-bytes: 65536
```

Set `hostname: 0.0.0.0` when the service runs in a container or behind a
reverse proxy.
