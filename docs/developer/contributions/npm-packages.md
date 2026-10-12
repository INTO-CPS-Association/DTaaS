# Publish NPM packages

The DTaaS monorepo contains several npm packages.

## Default npm registry

The default registry for npm packages is [npmjs](https://registry.npmjs.org).
Public packages are published to **npmjs**.

GitHub Actions publish the
[library microservice](../../admin/servers/lib/npm.md) (`lib-ms.yml`),
the [runner](../../user/servers/execution/runner/readme.md)
(`runner.yml`), the [logger microservice](../../admin/servers/logger/npm.md)
(`logger-ms.yml`) and the `@into-cps-association/dt-automation` library
(`dt-automation.yml`). Each workflow calls the reusable
`.github/workflows/publish-npm.yml` workflow.

A package can also be published by hand:

```bash
npm login --registry="https://registry.npmjs.org"
cat ~/.npmrc  #shows the auth token for the registry
//registry.npmjs.org/:_authToken=xxxxxxxxxx
yarn publish --registry="https://registry.npmjs.org" \
  --no-git-tag-version --access public
```

At least one version of the runner package is published to this registry
for each release of the DTaaS platform.

## GitHub npm registry

The GitHub Actions of the project also publish the
[packages](https://github.com/orgs/INTO-CPS-Association/packages?repo_name=DTaaS)
to the GitHub npm registry. Installing from this registry requires a
[personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
from GitHub.

## Private Registry

### Setup private npm registry

Publishing to [npmjs](https://www.npmjs.com/) is public and cannot be
undone, so set up a private npm registry for local development. A
private registry lets you publish and unpublish packages freely.

[Verdaccio](https://verdaccio.org) is the recommended registry.
The following commands create a working private npm registry
for development.

```bash
docker run -d --name verdaccio -p 4873:4873 verdaccio/verdaccio
npm adduser --registry http://localhost:4873 #create a user on the verdaccio registry
npm set registry http://localhost:4873/
yarn config set registry "http://localhost:4873"
yarn login --registry "http://localhost:4873" #login with the credentials for yarn utility
npm login #login with the credentials for npm utility
```

Open `http://localhost:4873` in a browser and log in with the user
credentials to see the published packages.

#### Publish to private npm registry

To publish a package to the local registry, run:

```bash
yarn install
yarn build #the dist/ directory is needed for publishing step
yarn publish --no-git-tag-version #increments version in package.json, publishes to registry
yarn publish #increments version in package.json, publishes to registry and adds a git tag
```

The package version in `package.json` is updated accordingly. See the
[verdaccio docs](https://verdaccio.org/docs/installation/#basic-usage)
for more information.

To unpublish a package, for example `@dtaas/runner@0.0.2`, run:

```bash
npm unpublish --registry http://localhost:4873/ \
  @dtaas/runner@0.0.2
```

To install or uninstall this utility for all users, run:

```bash
sudo npm install --registry http://localhost:4873 \
  -g @dtaas/runner
sudo npm list -g # should list @dtaas/runner in the packages
sudo npm remove --global @dtaas/runner
```

### Use the packages

Packages in the private npm registry are used like regular packages
installed from [npmjs](https://www.npmjs.com/).

For example, to use the `@dtaas/runner@0.0.2` package, run:

```bash
sudo npm install --registry http://localhost:4873 \
  -g @dtaas/runner
runner # launch the digital twin runner
```
