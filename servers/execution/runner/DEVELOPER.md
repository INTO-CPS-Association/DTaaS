# :runner: Developer Instructions

This microservice needs a configuration file and a directory of scripts.
Please see [README](./README.md) for this information.

## :gear: Configure

The `config` directory has two sample configuration files:

- `runner.yaml.sample` is the template for running your own scripts.
  The `location` is relative to the configuration file, so
  `yarn start --config config/runner.yaml` looks for the scripts in
  `config/scripts`.
- `runner.test.yaml.sample` runs the test scripts in `test/data/scripts`.

Copy a sample and start the runner with it:

```bash
cp config/runner.test.yaml.sample config/runner.test.yaml
yarn build
yarn start --config config/runner.test.yaml
```

Only the `*.sample` files in `config` are tracked by git.

The `test/data/scripts` directory has a bash script and a PowerShell
(`.ps1`) script for each test command, so that `yarn start` and
`yarn test` work on both Linux and Windows. The tests copy the test
configuration and these scripts into the runner directory before they
run and delete them afterwards.

## :hammer_and_wrench: Developer Commands

```bash
yarn install    # Install dependencies for the microservice
yarn syntax     # Analyze code for errors and style issues
yarn format     #format .ts[x] and .js[x] files with prettier
yarn graph      # Generate dependency graphs in the code
yarn build      # Compile ES6 to ES5 and copy JS files to build/ directory
yarn test       # Run tests
yarn test:e2e   # Run only end-to-end tests
yarn test:nocov # Run the tests but do not report coverage
yarn test:watchAll # Watch changes in test/ and run the tests
yarn start      # Start the application
yarn clean      # Deletes directories "build", "coverage", and "dist"
```

### On Filenames in Tests

The jest and nestjs combination can not detect tests in files
with _config_ in their names. Hence, the config word has been
replaced with _options_ in the names of test files.

## :package: :ship: NPM package

The package version is hardcoded as `PACKAGE_VERSION: string` in
[CLI code](src/config/commander.ts). This package version needs to be
same as `version` in `package.json`.

### Github Package Registry

The Github actions workflow of
[lib microservice](../../../.github/workflows/runner.yml) publishes the **runner**
into
[packages](https://github.com/orgs/INTO-CPS-Association/packages?repo_name=DTaaS).

### Verdaccio - Local Package Registry

Use the instructions in
[publish npm package](../../../docs/developer/npm-packages.md) for help
with publishing **runner npm package**.

Application of the advice given on that page for **runner** will require
running the following commands.

### Publish

```bash
yarn install
yarn build #the dist/ directory is needed for publishing step
yarn publish --no-git-tag-version #increments version and publishes to registry
yarn publish #increments version, publishes to registry and adds a git tag
```

### Unpublish

```bash
npm unpublish  --registry http://localhost:4873/ @into-cps-association/runner@0.0.2
```

## :rocket: Access the service

## Service Endpoint

The URL endpoint for this microservice is located at: `localhost:<port>`

The API calls of this microservice are documented in **api/dev.api.http**.
This file can be used with
[REST client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client)
of VS Code IDE. Launch the program using
`yarn start --config config/runner.test.yaml` before using
the **api/dev.api.http**.

## Use in Docker Environment

The `compose.runner.dev.yml` file builds the runner image from the source
code and runs it with `config/runner.test.yaml` and the test scripts.

**NOTE**: the docker compose file is located in the
`servers/execution/runner` directory.

```bash
cp config/runner.test.yaml.sample config/runner.test.yaml
docker compose -f compose.runner.dev.yml up -d --build
docker compose -f compose.runner.dev.yml down
```

See [DOCKER.md](./DOCKER.md) for running the runner with your own scripts.

Please see [README](./README.md) for more information.
