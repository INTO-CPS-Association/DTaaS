# 📖 Developer Instructions

## :gear: Configure

The logger runs with built-in defaults, so a configuration file is
optional for local development. To use one, copy the sample configuration:

```bash
cp config/logger.yaml.sample config/logger.yaml
```

The `config/logger.yaml` file is not tracked by git.
Please see [README](./README.md#configuration) for the configuration fields
and environment variables.

## :hammer_and_wrench: Developer Commands

```bash
yarn install       # Install dependencies for the microservice
yarn syntax        # Analyze code for errors and style issues
yarn format        # Format .ts files with prettier
yarn graph         # Generate dependency graphs in the code
yarn build         # Compile TypeScript into the dist/ directory
yarn test          # Run all tests with coverage
yarn test:unit     # Run unit tests
yarn test:e2e      # Run end-to-end tests
yarn test:nocov    # Run all tests without coverage
yarn check:final   # Run syntax, format, graph, build and test together
yarn start         # Start the application
yarn clean         # Delete node_modules, coverage, dist and graph files
```

To start the application with the configuration file, run

```bash
yarn start --config config/logger.yaml
```

## Use with the DTaaS Client

For non-Docker development, point the client at the logger's direct port:

```javascript
LOGGER_URL: 'http://localhost:4003/logger';
```

The `/logger` suffix is required. The client validates logger reachability by
appending `/health`, so `http://localhost:4003/logger` checks
`http://localhost:4003/logger/health`. A bare host such as
`http://localhost:4003` would check `/health`, which is not a logger endpoint.

## Test the API

The `api` directory has request files for the
[REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client)
extension of VS Code:

- `dev.api.http` sends requests to a logger running on the developer
  computer, either locally or in Docker.
- `dtaas.api.http` sends requests to a logger deployed behind the DTaaS
  Traefik gateway.

The request bodies are loaded from the `api/*.json` files. The `valid-*.json`
events are accepted with `204 No Content`, and the `invalid-*.json` events are
rejected with `400 Bad Request`. The end-to-end tests use the same files.

## Use in Docker Environment

The `compose.logger.dev.yml` file builds the logger image from the source
code and uses `config/logger.yaml` as the configuration. The captured events
are saved in the `logs` directory of `servers/logger`.

**NOTE**: the docker compose file is located in the `servers/logger`
directory.

```bash
cp config/logger.yaml.sample config/logger.yaml
docker compose -f compose.logger.dev.yml up -d --build
```

This command brings up the logger container and makes the service available
at <http://localhost:4003/logger>. If the configuration values are changed,
please restart the container.

```bash
docker compose -f compose.logger.dev.yml down
docker compose -f compose.logger.dev.yml up -d
```

The `compose.logger.yml` file uses the same configuration file with the
published `intocps/logger-ms` image.
See [DOCKER.md](./DOCKER.md) for running the published image.

## :package: :ship: Packages

The Github actions workflow of
[logger microservice](../../.github/workflows/logger-ms.yml) publishes the
**logger-ms** package to [npmjs](https://www.npmjs.com/) and to Github
[packages](https://github.com/orgs/INTO-CPS-Association/packages?repo_name=DTaaS),
and the `intocps/logger-ms` docker image to Docker Hub and the Github
container registry.

The steps for publishing npm packages manually are listed in the
[npm packages](../../docs/developer/npm-packages.md) page.
