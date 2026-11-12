# Overview

The **signals gateway microservice** will serve live and past signals of
DTaaS digital twins to the DTaaS client. This image is the skeleton: the
health route answers and the `stream` and `range` routes answer
`501 Not Implemented`. The image exposes port `4004` and runs as the
unprivileged `node` user.

## Use in Docker Environment

```yml
services:
  signals-ms:
    image: intocps/signals-ms:0.1.0
    restart: unless-stopped
    volumes:
      - ./signals.yaml:/dtaas/signals/signals.yaml:ro
    ports:
      - "127.0.0.1:4004:4004"
```

The service has no sign-in yet, so the example publishes it on the loopback
interface only. Put it behind Traefik before opening it to other hosts.

The image sets `SIGNALS_HOSTNAME=0.0.0.0`. A `SIGNALS_*` variable always
overrides the same key in `signals.yaml`. A `hostname` in the mounted file
is therefore ignored inside the container.

The configuration keys are described in the
[README](https://github.com/INTO-CPS-Association/DTaaS/blob/feature/distributed-demo/servers/signals/README.md).
