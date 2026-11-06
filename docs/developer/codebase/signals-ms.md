# Signals Gateway Microservice

The signals gateway will serve the live and past signals of digital twins
to the DTaaS client. The requirements and the choices are in the plan
`docs/developer/plans/signals-gateway.md`, which is kept out of the site.

## Skeleton

The microservice is built with the NestJS framework, on the pattern of the
logger microservice. Every route is under `/signals`:

| Route | Answer |
| :--- | :--- |
| `GET /signals/health` | `{"status":"ok"}` |
| `POST /signals/stream` | `501`, live samples as server-sent events later |
| `POST /signals/range` | `501`, past samples as JSON later |

```text
servers/signals/
├── src/
│   ├── main.ts                    # Entry point
│   ├── app.module.ts              # Root module
│   ├── signals.controller.ts      # The three routes
│   └── config/                    # signals.yaml and SIGNALS_* variables
├── config/signals.yaml.sample     # Every key with its default
└── test/                          # Unit and end-to-end tests
```

## Build, Test and Publish

The commands are in `servers/signals/README.md`. The `signals-ms.yml`
workflow runs the lint, build and tests, checks the health route of the
built service and of the Docker image. On a push to a `feature/*` or
`release-v*` branch it publishes the npm package and the `signals-ms` image.
