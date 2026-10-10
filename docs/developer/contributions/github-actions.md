# Secrets for GitHub Actions

The publishing jobs of the GitHub Actions need the following secrets
from [Docker Hub](https://hub.docker.com):

| Secret Name          | Explanation                                                                              |
| :------------------- | :--------------------------------------------------------------------------------------- |
| `DOCKERHUB_SCOPE`    | Username or organisation name on Docker Hub                                              |
| `DOCKERHUB_USERNAME` | Username on Docker Hub                                                                   |
| `DOCKERHUB_TOKEN`    | API token to publish images to Docker Hub, with `Read`, `Write` and `Delete` permissions |

They also need this secret from [npmjs](https://npmjs.com):

| Secret Name | Explanation                                                                     |
| :---------- | :------------------------------------------------------------------------------ |
| `NPM_TOKEN` | Token to publish npm packages to the default [npm registry](https://npmjs.com). |

Publishing to GitHub Packages uses the built-in `GITHUB_TOKEN`. The test
jobs upload coverage with an optional `CODECOV_TOKEN` secret, which public
repositories do not need.

The following repository variables are optional. When set, the npm
package is published under the given name instead of the name in its
`package.json`:

| Variable Name             | Package                                     |
| :------------------------ | :------------------------------------------ |
| `PACKAGE_NAME`            | Library microservice (`servers/lib`)        |
| `NPM_RUNNER_PACKAGE_NAME` | Runner (`servers/execution/runner`)         |
| `NPM_LOGGER_PACKAGE_NAME` | Logger microservice (`servers/logger`)      |

Add the secrets in the
[GitHub Secrets Setting](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions#creating-secrets-for-a-repository)
of the fork, and the variables under **Settings > Secrets and variables >
Actions > Variables**.
