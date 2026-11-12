# Signals Gateway in Docker

The gateway image is not published yet. Docker Compose builds it as
`dtaas/signals-ms:local` from `developer/check/signals.dockerfile` in the
checkout of the repository. It listens on port
`4004`, serves every route under `/signals` and runs as the unprivileged
`node` user (uid 1000). It reads its configuration from
`/dtaas/signals/signals.yaml`.

## In the DTaaS Packages

The Docker Compose packages in `deploy/dtaas/docker/` (`localhost`, `server`,
`secure-server` and `secure-server_with_integrated-gitlab`) carry a `signals`
service under the `signals` profile, so a deployment without the gateway
starts as before. Traefik routes `/signals` to it on the host and entrypoint
of the logger. In the `server`, `secure-server` and
`secure-server_with_integrated-gitlab` packages, traefik-forward-auth checks
the session first and `config/conf.server` lists `/signals` as an `auth`
rule. The `localhost` package has no traefik-forward-auth. No port of the
gateway is published on the host.

The gateway connects to RabbitMQ and PostgreSQL of the
[platform services](../../services/cli.md) over TLS, so the host of the
package must reach the MQTT port (`RABBITMQ_MQTT_PORT`, `8085` by default) and
the PostgreSQL port (`POSTGRES_PORT`, `5432` by default) of the services host.

Run these steps in the folder of the package.

1. Create the configuration from the example of the package:

   ```bash
   cp config/signals.yaml.example config/signals.yaml
   ```

   Set `gitlab-url`, replace `<DTAAS_CLIENT_APPLICATION_ID>` with
   `REACT_APP_CLIENT_ID` of `config/client.js` and replace
   `services.foo.com` in `mqtt-url` and `postgres-url` with the host name of
   the certificates of the platform services. [Configuration](config.md)
   describes every key.

1. Copy the three secret files that `dtaas-services` wrote, described in
   [Service Accounts](service-users.md), into `config/secrets/`. Docker
   Compose mounts each one at `/run/secrets/<name>`, where the example
   configuration names it. A mounted file keeps its owner and mode inside the
   container, so give the files to uid 1000:

   ```bash
   mkdir -p config/secrets
   cp /path/to/services/secrets/signals/rabbitmq_dtaas_signals_password \
     /path/to/services/secrets/signals/postgresql_dtaas_signals_ro_password \
     /path/to/services/secrets/signals/signals_owners.json config/secrets/
   chmod 600 config/secrets/*
   sudo chown 1000:1000 config/secrets/*
   ```

1. Uncomment `COMPOSE_PROFILES=signals` in `config/.env`, set
   `REACT_APP_VIZ_SIGNALS_URL` in `config/client.js` to the `/signals`
   address of the server and start the package:

   ```bash
   docker compose --env-file config/.env up -d
   ```

1. Find the subnet of the network that Traefik and the gateway share, set it
   in `trusted-proxies` of `config/signals.yaml` and recreate the gateway, so
   the rate limit counts each client instead of the proxy:

   ```bash
   docker network inspect dtaas-frontend \
     --format '{{range .IPAM.Config}}{{.Subnet}}{{end}}'
   docker compose --env-file config/.env up -d --force-recreate signals
   ```

   The `localhost` package uses the default network of the project,
   `dtaas_default`.

`config/signals.yaml` and `config/secrets/` are ignored by git. The
`CONFIG.md` file of each package lists the same steps.

In `secure-server_with_integrated-gitlab` the example sets `gitlab-url` to
`http://gitlab/gitlab`, the integrated GitLab inside the Docker network, as
traefik-forward-auth reaches it.

The gateway verifies the certificates of RabbitMQ and PostgreSQL with the
certificate authorities that Node.js trusts. With
[self-signed certificates](../../guides/self-signed-certs.md), mount the
certificate of the authority into the container and name it in
`NODE_EXTRA_CA_CERTS`
([Node.js command-line options](https://nodejs.org/api/cli.html#node_extra_ca_certsfile)).

## On Its Own

To run the gateway without a package, build the image from the root of the
repository with
`docker build -f developer/check/signals.dockerfile -t dtaas/signals-ms:local .`,
mount the configuration and the secrets and publish the port on the loopback
interface. Put it behind Traefik before other hosts reach it:

```yaml
services:
  signals-ms:
    image: dtaas/signals-ms:local
    restart: unless-stopped
    volumes:
      - ./signals.yaml:/dtaas/signals/signals.yaml:ro
    secrets:
      - rabbitmq_dtaas_signals_password
      - postgresql_dtaas_signals_ro_password
      - signals_owners.json
    ports:
      - "127.0.0.1:4004:4004"

secrets:
  rabbitmq_dtaas_signals_password:
    file: ./secrets/rabbitmq_dtaas_signals_password
  postgresql_dtaas_signals_ro_password:
    file: ./secrets/postgresql_dtaas_signals_ro_password
  signals_owners.json:
    file: ./secrets/signals_owners.json
```

`signals.yaml` then names the files as in the package examples, for example
`mqtt-password-file: /run/secrets/rabbitmq_dtaas_signals_password`.

## Service Endpoints

| Route | Answer |
| :---- | :----- |
| `GET /signals/health` | `{"status":"ok"}`, without sign-in |
| `POST /signals/stream` | Live samples of the requested paths as server-sent events |
| `POST /signals/range` | Past samples of the requested paths as JSON |
| `GET /signals/stats` | What the user's ended streams forwarded and dropped |
| `POST /signals/command` | A set point sent to the command topic of a device |

Every route except health needs the header
`Authorization: Bearer <token>`. The
[README of the service](https://github.com/INTO-CPS-Association/DTaaS/blob/feature/distributed-demo/servers/signals/README.md)
describes the status codes.
