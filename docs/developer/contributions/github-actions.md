# Secrets for Github Action

The Github actions require the following secrets to be obtained
from [docker hub](https://hub.docker.com):

| Secret Name          | Explanation                                                                              |
| :------------------- | :--------------------------------------------------------------------------------------- |
| `DOCKERHUB_SCOPE`    | Username or organization name on docker hub                                              |
| `DOCKERHUB_USERNAME` | Username on docker hub                                                                   |
| `DOCKERHUB_TOKEN`    | API token to publish images to docker hub, with `Read`, `Write` and `Delete` permissions |
| `PACKAGE_NAME`       | The name with which libms npm package must be published                                  |

Similarly, Github actions require the following secrets to be obtained
from [npmjs](https://npmjs.com):

| Secret Name               | Explanation                                                                     |
| :------------------------ | :------------------------------------------------------------------------------ |
| `NPM_TOKEN`               | Token to publish npm packages to the default [npm registry](https://npmjs.com). |
| `PACKAGE_NAME`            | The name with which libms npm package must be published                         |
| `NPM_RUNNER_PACKAGE_NAME` | The name with which runner npm package must be published                        |

Remember to add these secrets to
[Github Secrets Setting](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions#creating-secrets-for-a-repository)
of your fork.
