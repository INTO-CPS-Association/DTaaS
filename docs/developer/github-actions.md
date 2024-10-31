# Secrets for Github Action

The Github actions require the following secrets to be obtained
from [docker hub](hub.docker.com):

| Secret Name | Explanation |
|:---|:---|
| `DOCKERHUB_SCOPE` | Username or organization name on docker hub |
| `DOCKERHUB_USERNAME` | Username on docker hub |
| `DOCKERHUB_TOKEN` | API token to publish images to docker hub, with `Read`, `Write` and `Delete` permissions |
| `NPM_TOKEN` | Token to publish npm package to Nodejs registry. |
| `NPM_GITHUB_TOKEN` | Token to publish npm package to Github registry |

Remember to add these secrets to
[Github Secrets Setting](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions#creating-secrets-for-a-repository)
of your fork.