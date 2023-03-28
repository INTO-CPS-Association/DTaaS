# Overview

This lib-microservice takes a query from the user that asks for content within a given specified directory. This microservices handles request by fetching and returning the file-names and folders within that respective directory.

## Gitlab setup

For this microserivce to be functional, a certain gitlab structure is expected. The microservice expects that the gitlab consisting of one group, DTaaS, and within that group, all of the projects be located, user1, user2, ... , aswell as a commons project. This can be seen in the presentation below (PDF page 26):
[this presentation](/docs/DTaaS-overview.pdf)

On how to create groups, visit the [gitlab documentation](https://docs.gitlab.com/ee/user/group/)

## Configuration setup

In order to create this environment, you need to create a `.env` file, wherein you create the following environment variables,
and insert with the correct-information relevant for your setup:

```
PORT = 3000
LOCAL_PATH ='/Users/<Username>/DTaaS/data/assets/user'
GITLAB_GROUP ="dtaas"
GITLAB_URL='https://gitlab.com/api/graphql'
TOKEN='123-sample-token'
MODE=local or gitlab
LOG_LEVEL=debug
TEST_PATH="/Users/<Username>/DTaaS/servers/lib/test/data/test_assets"
```

The `TOKEN` should be set to your GitLab Group access API token. For more information on how to create and use your access token, visit:
https://docs.gitlab.com/ee/user/group/settings/group_access_tokens.html

Once you've generated a token, copy it and replace the value of `TOKEN` with your token for the gitlab group, can be found

## Endpoint

The endpoint to query is located at

```
localhost:PORT/graphql
```
