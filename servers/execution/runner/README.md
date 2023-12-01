# :runner: Digital Twin Runner

A utility service to manage the
[lifecycle of one digital twin](../../../docs/user/digital-twins/lifecycle.md).
The lifecycle of a digital twin is made of multiple phases.
This digital twin runner utility
helps with the managing the execution of lifecycle phases.
This utility can be
launched in two scenarios:

1. User launches this from commandline and let the utility
   manage the lifecycle of one digital twin.
1. Execution infrastructure of Digital Twin as a Service (DTaaS)
   launches this utility and instructs it to manage the lifecycle of
   one digital twin.

The digital twin runner utility runs as a service and will provide
REST API interface to execute lifecycle scripts of a digital twin.
One digital twin runner is responsible for execution of a digital twin.

## :hammer_and_wrench: Developer Commands

```bash
yarn install    # Install dependencies for the microservice
yarn syntax     # Analyze code for errors and style issues
yarn graph      # Generate dependency graphs in the code
yarn build      # Compile ES6 to ES5 and copy JS files to build/ directory
yarn test       # Run tests
yarn test:nocov # Run the tests but do not report coverage
yarn test:watchAll # Watch changes in test/ and run the tests
yarn start      # Start the application
yarn clean      # Deletes directories "build", "coverage", and "dist"
```

## :package: :ship: NPM package

### Github Package Registry

The Github actions workflow of
[lib microservice](../../../.github/workflows/runner.yml) publishes the **runner**
into [public packages](https://github.com/orgs/INTO-CPS-Association/packages).

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

```bash
sudo npm install  --registry http://localhost:4873 -g @dtaas/runner
runner # launch the digital twin runner
```

Once launched, the utility runs at `port 3000`.

If launched on one computer,
you can access the same at `http://localhost:3000`.

Access to the service on network is available at `http://<ip or hostname>:3000/`.

Two REST API routes are active. The route paths and the responses given
for these two sources are:

| REST API Route                 | Return Value | Comment |
| :----------------------------- | :----------- | :------ |
| localhost:3000/phase | [ hello ] | Each invocation appends to _array_. |
| localhost:3000/lifecycle/phase | _true_       | Always returns _true_ |
| localhost:3000/phase | [ hello ] | array. |

## :balance_scale: License

This software is owned by
[The INTO-CPS Association](https://into-cps.org/)
and is available under [the INTO-CPS License](./LICENSE.md).
