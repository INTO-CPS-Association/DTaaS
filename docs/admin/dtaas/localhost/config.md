# Configuration Reference

This page describes each configuration file in this package.
For the quick-start installation guide, see [install.md](install.md).

## config/.env

Source: `config/.env.example`

```bash
cp config/.env.example config/.env
```

| Variable               | Example | Description                                     |
| :--------------------- | :------ | :---------------------------------------------- |
| `DEFAULT_USER`         | `user1` | Workspace path prefix and workspace folder name |
| `COMPOSE_PROJECT_NAME` | `dtaas` | Docker Compose project name                     |

`docker-compose.yml` uses `DEFAULT_USER` in:

- the router path prefix (`/${DEFAULT_USER}`)
- the workspace volume mount (`./files/${DEFAULT_USER}`)
- the `MAIN_USER` environment variable of the workspace container

## config/client.js

Source: `config/client.js.example`

```bash
cp config/client.js.example config/client.js
```

| Variable                        | Example                    | Description                 |
| :------------------------------ | :------------------------- | :-------------------------- |
| `REACT_APP_URL`                 | `http://localhost`         | Base URL of DTaaS           |
| `REACT_APP_CLIENT_ID`           | _(OAuth client id)_        | Client OAuth application ID |
| `REACT_APP_AUTH_AUTHORITY`      | `https://gitlab.com/`      | OAuth authority URL         |
| `REACT_APP_REDIRECT_URI`        | `http://localhost/Library` | Redirect URI after sign-in  |
| `REACT_APP_LOGOUT_REDIRECT_URI` | `http://localhost/`        | Redirect URI after sign-out |
| `LOGGER_URL`                    | `http://localhost/logger`  | URL of the logger service   |

## files/

`files/common` is mounted read-write at `/workspace/common`.

Create a per-user workspace from `files/template`:

```bash
cp -R files/template files/<DEFAULT_USER>
sudo chown -R 1000:100 files/*
```

## logs/logger/

The logger microservice writes the captured events to
`logs/logger/workflow-logs.jsonl`. Create the directory and give it to
uid 1000, the user that runs the logger:

```bash
mkdir -p logs/logger
sudo chown -R 1000:1000 logs/logger
```

## config/signals.yaml

Source: `config/signals.yaml.example`

The signals gateway serves the live and past signals of digital twins to the
client at `/signals`. It starts only with the `signals` profile, so a
deployment without it starts as before.

1. Copy the configuration and set the addresses of GitLab, RabbitMQ and
   InfluxDB:

   ```bash
   cp config/signals.yaml.example config/signals.yaml
   ```

1. Write the password of the read-only RabbitMQ user to
   `config/secrets/rabbitmq-password`, and a JSON object that maps each
   InfluxDB org to a read-only token to `config/secrets/influx-tokens.json`.
   The gateway runs as uid 1000, so give it both files:

   ```bash
   chmod 600 config/secrets/*
   sudo chown 1000:1000 config/secrets/*
   ```

1. Uncomment `COMPOSE_PROFILES=signals` in `config/.env`, and set
   `REACT_APP_VIZ_SIGNALS_URL` in `config/client.js` to the `/signals`
   address of this server.

[Service Users](../../servers/signals/service-users.md) describes the
read-only service user and the InfluxDB tokens.

## Reload client config

After editing `config/client.js`, reload only the client service:

```bash
docker compose --env-file config/.env up -d --force-recreate client
```
