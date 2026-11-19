# Developer Instructions

## Configure

The service runs with built-in defaults, so a configuration file is
optional for local development. To use one, save the YAML block of the
Configuration section of `README.md` as `signals.yaml` in this folder.
The file is not tracked by git.

## Developer Commands

```bash
yarn install       # Install dependencies for the microservice
yarn syntax        # Analyze code for errors and style issues
yarn format        # Format .ts files with prettier
yarn graph         # Generate dependency graphs in the code
yarn build         # Compile TypeScript into the dist/ directory
yarn test          # Run all tests with coverage
yarn test:unit     # Run unit tests
yarn test:e2e      # Run end-to-end tests
yarn test:int      # Run integration tests against RabbitMQ and PostgreSQL
yarn test:nocov    # Run all tests without coverage
yarn check:final   # Run syntax, format, build and test together
yarn start         # Start the application
yarn clean         # Delete node_modules, coverage, dist and graph files
```

`yarn test:int` starts RabbitMQ 4.4.0 with the MQTT plugin and PostgreSQL
18.6 in Docker. It checks that the gateway receives a device's reading, is
refused a topic outside its read permission, delivers a command and is
refused a publication outside `cmd`, reads and bins the history and
cannot write with its read-only account. It is skipped when Docker is not
running.

The coverage threshold applies to all tests together, so run `yarn test`
to check it. `yarn test:unit` and `yarn test:e2e` alone report lower
coverage and fail the threshold.

To start the application with a configuration file, run

```bash
SIGNALS_CONFIG_PATH=signals.yaml yarn start
```
