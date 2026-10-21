# Signals Gateway in Docker

The gateway is published as the `intocps/signals-ms` image. It listens on port
`4004`, serves every route under `/signals`, and runs as the unprivileged
`node` user (uid 1000). It reads its configuration from
`/dtaas/signals/signals.yaml`.

## In the DTaaS Packages

The Docker Compose packages in `deploy/dtaas/docker/` carry a `signals`
service under the `signals` profile, so a deployment without the gateway starts
as before. Traefik routes `/signals` to it on the same host and entrypoint as
the logger, with the `common-headers` security headers. In the `server`,
`secure-server` and `secure-server_with_integrated-gitlab` packages,
traefik-forward-auth checks the session first, and `config/conf.server` lists
`/signals` as an `auth` rule. The `localhost` package has no
traefik-forward-auth. No port of the gateway is published on the host.

1. Create the configuration from the example of the package and fill in the
   addresses of GitLab, RabbitMQ and InfluxDB:

   ```bash
   cp config/signals.yaml.example config/signals.yaml
   ```

1. Write the two secrets, described in [Service Users](service-users.md), into
   `config/secrets/`. Docker Compose mounts them under `/run/secrets/`, where
   the example configuration names them. The files keep their owner and mode
   inside the container, so give them to uid 1000:

   ```bash
   mkdir -p config/secrets
   # config/secrets/rabbitmq-password: the password of dtaas-signals
   # config/secrets/influx-tokens.json: {"<org>": "<read-only token>"}
   chmod 600 config/secrets/*
   sudo chown 1000:1000 config/secrets/*
   ```

1. Uncomment `COMPOSE_PROFILES=signals` in `config/.env`, set
   `REACT_APP_VIZ_SIGNALS_URL` in `config/client.js` to the `/signals` address
   of the server, and start the package:

   ```bash
   docker compose --env-file config/.env up -d
   ```

`config/signals.yaml` and `config/secrets/` are ignored by git. The
`CONFIG.md` file of each package lists the same steps.

## On Its Own

To run the gateway without a package, mount the configuration and the secrets
and publish the port:

```yaml
services:
  signals-ms:
    image: intocps/signals-ms:0.1.0
    restart: unless-stopped
    volumes:
      - ./signals.yaml:/dtaas/signals/signals.yaml:ro
      - ./secrets:/dtaas/signals/secrets:ro
    ports:
      - "4004:4004"
```

Here `signals.yaml` names the secrets as `./secrets/rabbitmq-password` and
`./secrets/influx-tokens.json`, since a relative path is read against the
directory of the configuration file.

## Service Endpoints

The health check URL: `localhost:4004/signals/health`, which answers
`{"status":"ok"}`.

The live stream: `POST /signals/stream`, and the history:
`POST /signals/range`. Both need the header
`Authorization: Bearer <GitLab access token>`.

The configuration keys are described in the
[configuration](config.md) page.
