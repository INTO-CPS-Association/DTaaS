# Overview

The **signals gateway microservice** serves live and past signals of DTaaS
digital twins to the DTaaS client. It reads RabbitMQ and InfluxDB with
read-only service credentials kept on the server, and serves each user only
the signals of the twins that user can read in GitLab. The Docker image
exposes the API on port `4004` and runs as the unprivileged `node` user.

## Use in Docker Environment

Create `signals.yaml` from
[the sample](https://github.com/INTO-CPS-Association/DTaaS/blob/feature/distributed-demo/servers/signals/config/signals.yaml.sample),
put the RabbitMQ password and the InfluxDB tokens in a `secrets` directory,
and mount both:

```yml
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

The configuration fields, the API and the commands that create the read-only
service users are described in the
[README](https://github.com/INTO-CPS-Association/DTaaS/blob/feature/distributed-demo/servers/signals/README.md)
and the
[developer notes](https://github.com/INTO-CPS-Association/DTaaS/blob/feature/distributed-demo/servers/signals/DEVELOPER.md).
