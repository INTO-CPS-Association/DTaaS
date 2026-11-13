# Overview

The **signals gateway microservice** serves the live and past signals of
DTaaS digital twins to the DTaaS client. Live samples come from RabbitMQ
over MQTT and past samples from PostgreSQL, read with service accounts
whose passwords are files. The image exposes port `4004` and runs as the
unprivileged `node` user.

## Use in Docker Environment

```yml
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

The image is not published yet. Build it from the root of the repository with
`docker build -f developer/check/signals.dockerfile -t dtaas/signals-ms:local .`.

The example publishes the port on the loopback interface only. Put the
service behind Traefik before opening it to other hosts.

The secret files are mounted under `/run/secrets/`. Give them mode 600 and
the owner uid 1000. The image sets `SIGNALS_HOSTNAME=0.0.0.0`, and a
`SIGNALS_*` variable always overrides the same key in `signals.yaml`. A
`hostname` in the mounted file is therefore ignored inside the container.

The configuration keys are described in the
[README](https://github.com/INTO-CPS-Association/DTaaS/blob/feature/distributed-demo/servers/signals/README.md)
and the installation in the Signals Gateway pages of the DTaaS
documentation.
