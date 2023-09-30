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
yarn syntax     # analyzes source code for potential errors, style violations, and other issues,
yarn graph       # generate dependency graphs in the code
yarn build      # compile ES6 files into ES5 javascript files and copy all JS files into build/ directory
yarn test       # run tests
yarn test:nocov  # run the tests but do not report coverage
yarn test:watchAll  #Watch changes in test/ and run the tests
yarn start      # start the application
yarn clean      # deletes directories "build", "coverage", and "dist"
```

## :package: :ship: Publish Package

### Setup private npm registry

This package need to be published to an npm registry. There after, the package
can be installed as a system command. Since publishing to npmjs.org is
irrevocable and public, developers are encouraged to setup their own private
npm registry for local development. We recommend using
[verdaccio](https://verdaccio.org) for this task. The following commands
help you create a working private npm registry for development.

```bash
docker run -d --name verdaccio -p 4873:4873 verdaccio/verdaccio
npm adduser --registry http://localhost:4873 #create a user on the verdaccio registry
npm set registry http://localhost:4873/
yarn config set registry "http://localhost:4873"
```

You can open `http://localhost:4873` in your browser, login with
the user credentials to see the packages published.

### Publish to private registry

To publish a package to your local registry, do:

```bash
yarn install
yarn build #the dist/ directory is needed for publishing step
yarn publish --no-git-tag-version #increments version in package.json, publishes to registry
yarn publish #increments version in package.json, publishes to registry and adds a git tag
```

The package version in package.json gets updated as well. You can
open `http://localhost:4873` in your browser, login with the user credentials
to see the packages published. Please see
[verdaccio docs](https://verdaccio.org/docs/installation/#basic-usage)
for more information.

If there is a need to unpublish a package, ex: `@dtaas/runner@0.0.2`, do:

```bash
npm unpublish  --registry http://localhost:4873/ @dtaas/runner@0.0.2
```

To install / uninstall this utility for all users, do:

```bash
sudo npm install  --registry http://localhost:4873 -g @dtaas/runner
sudo npm list -g # should list @dtaas/runner in the packages
sudo npm remove --global @dtaas/runner
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

| REST API Route | Return Value | Comment |
|:---|:---|:---|
| localhost:3000/phase | [ hello ] | The array get appended with each invocation. All the elements of are _array_. |
| localhost:3000/lifecycle/phase | _true_ | Always returns _true_ |
|||

## :balance_scale: License

This software is owned by
[The INTO-CPS Association](https://into-cps.org/)
and is available under [the INTO-CPS License](./LICENSE.md).
