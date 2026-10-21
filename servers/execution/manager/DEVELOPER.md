# Developer Instructions

## Configure

The service needs a GitLab URL, username and token, so it does not start
without configuration. Copy the sample configuration, set `gitlab.url` and
`gitlab.username` in the copy, and set the token with
`EXECUTION_MANAGER_GITLAB_TOKEN`:

```bash
cp config/execution-manager.yaml.sample config/execution-manager.yaml
```

`config/execution-manager.yaml` is not tracked by git. The configuration
fields and environment variables are described in
[README](./README.md#configuration).

## Developer Commands

```bash
yarn install       # Install dependencies
yarn syntax        # Analyze code for errors and style issues
yarn format        # Format .ts files with prettier
yarn graph         # Generate dependency graphs of src and test
yarn build         # Compile TypeScript into the dist/ directory
yarn test          # Run all tests with coverage
yarn test:unit     # Run unit tests
yarn test:integration # Run the MQTT service against an in-process broker
yarn test:e2e      # Run end-to-end tests
yarn test:nocov    # Run all tests without coverage
yarn check:final   # Run syntax, format, graph, build and test together
yarn start         # Start the service
yarn clean         # Delete node_modules, coverage, dist and graph files
```

To start the service with a configuration file, run

```bash
yarn start --config config/execution-manager.yaml
```

## Project Layout

- `src/main.ts` creates the NestJS application, applies the route prefix and
  starts the HTTP server.
- `src/app.controller.ts` serves the health endpoint.
- `src/config/` loads the configuration from the YAML file and the environment
  (`config.service.ts`, with the `gitlab` and `mqtt` sections in
  `gitlab-settings.ts` and `mqtt-settings.ts`) and resolves the `--config`
  option (`cli.ts`). It checks that the required GitLab settings are set and
  fills in the MQTT defaults.
- `src/digital-twins/` holds the digital twin operations and their REST API.
  - `digital-twins.controller.ts` has the REST routes, `validation.pipe.ts`
    validates their parameters and bodies, and
    `digital-twins-errors.filter.ts` answers each error code of the
    operations with its HTTP status.
  - `digital-twins.service.ts` offers the operations with JSON inputs and
    outputs and reports failures as the errors of `digital-twins.errors.ts`.
    Other modules inject it through the `IDigitalTwinsService` interface and
    its token (`interfaces/digital-twins.service.interface.ts`).
  - `interfaces/` also holds the shapes that the operations return. `dto/`
    holds the zod schemas of what a caller may pass to the operations. Every
    API validates its input with them.
  - `dt-automation/` is the only folder that imports
    `@into-cps-association/dt-automation`.
    - `dt-automation-facade.ts` sets the package up and offers it to
      `digital-twins.service.ts` as one class.
    - `redux-store.ts` owns the package's Redux store, and
      `in-memory-execution-history.ts` is the execution history the package
      stores into.
    - `execution-tracker.ts` has the package check the running executions on
      a timer and publishes every execution that changed.
    - `mappers.ts` maps the package's types to the types that the operations
      return. Only `dt-automation-facade.ts` calls the mappers.
- `src/mqtt/` serves the same operations over MQTT: `topics.ts` builds and
  parses the topics and holds the rule for a topic name, `requests.ts` handles
  one request, with the schema and the service call of every operation, and
  `mqtt.service.ts` owns the broker connection and publishes the execution
  events. `settings.ts` builds the base topic of the configured user.
- `test/unit/` holds unit tests per module; `test/integration/` runs the MQTT
  service against an in-process aedes broker; `test/e2e/` starts the whole
  application with supertest. The MQTT end-to-end test uses the public broker
  `mqtt://broker.emqx.io:1883`; `EXECUTION_MANAGER_E2E_MQTT_URL` points it at
  another broker.
- `test/support/` holds what several tests share.
  `fake-dt-automation-facade.ts` stands in for the package and
  `fake-digital-twins-service.ts` for the operations, since CI has no GitLab.
  `test-app.ts` starts the application; it connects to a broker only for the
  tests that test MQTT, and `mqtt.ts` has their broker and client helpers.

## Dependencies

Dependencies are upgraded with the repository's cooldown script, which also
regenerates `yarn.lock`. Run it from the repository root:

```bash
node .agents/skills/upgrade-npm-packages/scripts/npm_pkg_upgrade.js servers/execution/manager/package.json
```

## Continuous Integration

`.github/workflows/execution-manager.yml` runs the lint and format checks, the
build and the tests, starts the built service and checks its health endpoint,
and builds and checks the Docker image from
`developer/check/execution-manager.dockerfile`.

## Use in Docker

Build the image from the repository root and run it:

```bash
docker build --file developer/check/execution-manager.dockerfile --tag dtaas-execution-manager .
docker run --rm --publish 127.0.0.1:4004:4004 \
  --env EXECUTION_MANAGER_GITLAB_URL=https://gitlab.example.org \
  --env EXECUTION_MANAGER_GITLAB_USERNAME=user1 \
  --env EXECUTION_MANAGER_GITLAB_TOKEN \
  dtaas-execution-manager
curl http://127.0.0.1:4004/execution-manager/health
```

The image sets `EXECUTION_MANAGER_HOSTNAME=0.0.0.0`; pass the other settings
as environment variables with `--env`. `--env EXECUTION_MANAGER_GITLAB_TOKEN`
without a value passes the token from your shell.
