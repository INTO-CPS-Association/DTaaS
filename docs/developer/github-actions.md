# Github Action

## Secrets

The Github actions require the following secrets to be obtained
from [docker hub](hub.docker.com) and [npm](npmjs.com):

| Secret Name | Explanation |
|:---|:---|
| `DOCKERHUB_SCOPE` | Username or organization name on docker hub |
| `DOCKERHUB_USERNAME` | Username on docker hub |
| `DOCKERHUB_TOKEN` | API token to publish images to docker hub, with `Read`, `Write` and `Delete` permissions |
| `NPM_TOKEN` | Token to publish npm package to Nodejs registry. |
| `NPM_LIBMS_PACKAGE_NAME` | Name of npm package for lib microservice |
| `NPM_RUNNER_PACKAGE_NAME` | Name of npm package for runner microservice |

Remember to add these secrets to
[Github Secrets Setting](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions#creating-secrets-for-a-repository)
of your fork.

## Environment Variables

The Github actions also require the following environment variables to be
added to your Github repository settings.

| Secret Name | Explanation |
|:---|:---|
| `NPM_LIBMS_PACKAGE_NAME` | Name of npm package for lib microservice |
| `NPM_RUNNER_PACKAGE_NAME` | Name of npm package for runner microservice |

Remember to add these variables to
[Github repository variables](https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/store-information-in-variables#creating-configuration-variables-for-a-repository)
of your fork.
