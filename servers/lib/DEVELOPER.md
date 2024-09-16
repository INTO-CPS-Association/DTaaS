# Developer Instructions

## :gear: Configure

This microservice needs library assets and configuration
file. Please see [README](./README.md) for this information.

## :hammer_and_wrench: Developer Commands

```bash
yarn install    # Install dependencies for the microservice
yarn syntax     # Analyze code for errors and style issues
yarn format     #format .ts[x] and .js[x] files with prettier
yarn graph      # Generate dependency graphs in the code
yarn build      # Compile ES6 to ES5 and copy JS files to build/ directory
yarn test:unit  # Run unit tests
yarn test:int   # Run integration tests
yarn test:e2e   # Run end-to-end tests
yarn test:http  # Run tests for HTTP file service provided by cloudcmd
yarn test:all   # Run all tests except http tests
yarn start -h   # List of all the CLI commands
yarn start      # Start the application
yarn start:pm2  # Start the application with process manager 2
yarn stop:pm2   # Stop the application managed by process manager 2
yarn clean      # Deletes "build", "coverage", "dist" and other temp files
```

**NOTE:** The integration, end-to-end and http tests require a valid
`.env` file. Here is a sample file.

```ini
PORT='4001'
MODE='local'
LOCAL_PATH ='/Users/<Username>/DTaaS/files'
LOG_LEVEL='debug'
APOLLO_PATH='/lib'
GRAPHQL_PLAYGROUND='true'
```

## Service Endpoint

The URL endpoint for this microservice is located at: `localhost:PORT/lib`

The [API](./API.md) page shows sample queries and responses.

## Manual testing

As of now, some features require manual testing or attention.

### CloudCMD (a npm package dependency)

Due to how CloudCMD works,
it is required to manually test with `LOCAL_PATH` both as an 
absolute path and local path.

| OS      | Absolute Path                 | Relative Path |
| ------- | ----------------------------- | ------------- |
| Windows | C:\DTaaS\files                | ..\\..\files  |
| Linux   | /Users/<Username>/DTaaS/files | ../../files   |

### PM2

the pm2 might not close spawned processes correctly,
therefore please use the following command to kill a process.
`pm2 del <id>`.

**NOTE:** to see the processes spawned by pm2 use `pm2 list`

## :package: :ship: Packages

### Docker images

The docker version of lib microservice is packaged with the DTaaS
application release.
Please see [publishing](../../docker/README.md) page
for more information publishing docker images.

### Default NPM Registry

The default registry for npm packages is [npmjs](https://registry.npmjs.org).

```bash
sudo npm install -g @into-cps-association/libms
```

The steps for publishing the package to npmjs are listed in
[npm packages](../../docs/developer/npm-packages.md) page.

The libms is also published on this registry, usually per release
of the DTaaS application. The package on npmjs is more stable
than the package on github npm registry.

### Github NPM Package Registry

The Github actions workflow of
[lib microservice](../../.github/workflows/lib-ms.yml) publishes the **libms**
into
[packages](https://github.com/orgs/INTO-CPS-Association/packages?repo_name=DTaaS).

A new libmspackage is published to github packages for each version
of libms microservice.

### Verdaccio - Local NPM Package Registry

Use the instructions in
[publish npm package](../../docs/developer/npm-packages.md) for help
with publishing **libms npm package** in local computer.

Application of the advice given on that page for **libms** will require
running the following commands.

## Use in Docker Environment

### Adjust Configuration (Optional)

The microservices require configuration and the docker version
of the microservices uses the configuration
file available in `config/.env.default`.
If you would like to adjust the configuration, please change this file.

### Use

The commands to start and stop the appliation are:

**NOTE**: the docker compose file is located in the `servers/lib` directory.

```bash
docker compose -f compose.lib.dev.yml up -d
```

This command brings up the lib docker container and makes
the website available at <http://localhost:4001>.
The `config/.env.default` file is used as the microservice configuration.
If the configuration values are changed, please restart the container.

```bash
docker compose -f compose.lib.yml down
docker compose -f compose.lib.yml up -d
```

### Publish

```bash
yarn install
yarn build #the dist/ directory is needed for publishing step
yarn publish --no-git-tag-version #increments version and publishes to registry
yarn publish #increments version, publishes to registry and adds a git tag
```

### Unpublish

```bash
npm unpublish  --registry http://localhost:4873/ @into-cps-association/libms@0.2.0
```
