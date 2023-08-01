# Overview

A commandline utility to run a digital twin. It will provide REST interface to execute lifecycle scripts of a digital twin. It is possible to run multiple instances of this utility within one computer.

## Developer Commands

```bash
yarn install    # Install dependencies for the microservice
yarn syntax     # analyzes source code for potential errors, style violations, and other issues,
yarn build      # compile ES6 files into ES5 javascript files and copy all JS files into build/ directory
yarn test       # run tests
yarn start      # start the application
yarn clean      # deletes directories "build", "coverage", and "dist"
```

## Publish Package

### Setup private npm registry

This package need to be published to an npm registry. There after, the package can be installed as a system command. Since publishing to npmjs.org is irrevocable and public, developers are encouraged to setup their own private npm registry for local development. We recommend using [verdaccio](https://verdaccio.org) for this task. The following commands help you create a working private npm registry for development.

```bash
docker run -d --name verdaccio -p 4873:4873 verdaccio/verdaccio
npm adduser --registry http://localhost:4873 #create a user on the verdaccio registry
npm set registry http://localhost:4873/
yarn config set registry "http://localhost:4873"
```

You can open `http://localhost:4873` in your browser, login with the user credentials to see the packages published.

### Publish to private registry

To publish a package to your local registry, do:

```bash
yarn install
yarn build #the dist/ directory is needed for publishing step
yarn publish --no-git-tag-version #increments version in package.json, publishes to registry
yarn publish #increments version in package.json, publishes to registry and adds a git tag
```

The package version in package.json gets updated as well. You can open `http://localhost:4873` in your browser, login with the user credentials to see the packages published. Please see [verdaccio docs](https://verdaccio.org/docs/installation/#basic-usage) for more information.

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
