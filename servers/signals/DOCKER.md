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
      - "4004:4004"
```

The configuration keys are described in the
[README](https://github.com/INTO-CPS-Association/DTaaS/blob/feature/distributed-demo/servers/signals/README.md).
