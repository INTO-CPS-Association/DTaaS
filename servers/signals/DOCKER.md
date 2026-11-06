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
    image: intocps/signals-ms:0.1.0
    restart: unless-stopped
    volumes:
      - ./signals.yaml:/dtaas/signals/signals.yaml:ro
    secrets:
      - rabbitmq_dtaas_signals_password
      - postgresql_dtaas_signals_ro_password
      - signals_owners.json
    ports:
      - "4004:4004"

secrets:
  rabbitmq_dtaas_signals_password:
    file: ./secrets/rabbitmq_dtaas_signals_password
  postgresql_dtaas_signals_ro_password:
    file: ./secrets/postgresql_dtaas_signals_ro_password
  signals_owners.json:
    file: ./secrets/signals_owners.json
```

The secret files are mounted under `/run/secrets/`. Give them mode 600 and
the owner uid 1000. The configuration keys are described in the
[README](https://github.com/INTO-CPS-Association/DTaaS/blob/feature/distributed-demo/servers/signals/README.md)
and the installation in the Signals Gateway pages of the DTaaS
documentation.
