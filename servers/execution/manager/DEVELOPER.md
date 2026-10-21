# Developer Instructions

## Configure

The service runs with built-in defaults, so a configuration file is optional
for local development. To use one, copy the sample configuration:

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
  (`config.service.ts`) and resolves the `--config` option (`cli.ts`).
- `test/unit/` holds unit tests per module; `test/e2e/` starts the whole
  application with supertest.
- `test/support/` holds what several tests share. `test-app.ts` starts the
  application.

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
docker run --rm --publish 127.0.0.1:4004:4004 dtaas-execution-manager
curl http://127.0.0.1:4004/execution-manager/health
```

The image sets `EXECUTION_MANAGER_HOSTNAME=0.0.0.0`; pass the other settings
as environment variables with `--env`.
