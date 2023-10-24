# Publish NPM packages

The DTaaS software is developed as a monorepo with multiple npm packages.
Since publishing to [npmjs](https://www.npmjs.com/) is
irrevocable and public, developers are encouraged to setup their own private
npm registry for local development.

A private npm registry will help with local publish and unpublish steps.

## Setup private npm registry

We recommend using [verdaccio](https://verdaccio.org) for this task.
The following commands help you create a working private npm registry
for development.

```bash
docker run -d --name verdaccio -p 4873:4873 verdaccio/verdaccio
npm adduser --registry http://localhost:4873 #create a user on the verdaccio registry
npm set registry http://localhost:4873/
yarn config set registry "http://localhost:4873"
yarn login --registry "http://localhost:4873" #login with the credentials for yarn utility
npm login #login with the credentials for npm utility
```

You can open `http://localhost:4873` in your browser, login with
the user credentials to see the packages published.

### Publish to private npm registry

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

## :rocket: Use the packages

The packages available in private npm registry can be used like
the regular npm packages installed from [npmjs](https://www.npmjs.com/).

For example, to use `@dtaas/runner@0.0.2` package, do:

```bash
sudo npm install  --registry http://localhost:4873 -g @dtaas/runner
runner # launch the digital twin runner
```
