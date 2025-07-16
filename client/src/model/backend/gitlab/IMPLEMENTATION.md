# GitLab Implementation Documentation

## Overview

The implementation provides an all-in-one backend complete with functionality for
getting pipelines, job traces, execution logs (and their maintenance), private
and common project IDs. It further provides access to an API instance.

It depends on @gitbeaker/rest and acts as a concrete implementation of the `Backend`
and `BackendAPI` interfaces..

## Architecture Components

### Instance Class

This class implements the Backend interface. Its primary responsibility is to
create the backend API instance, and to obtain the private and common project IDs
from the username and the group name defined in [constants.ts](./constants.ts).
After this, it keeps track of execution log entries and gives high-level access
to pipeline information and execution, job traces and ids for further processing
by the Backend API, which has to be Gitlab. It is only dependent on its backend
API and there are no initialization requirements.

#### Instance Constructor and Initialization

Initialization of Gitlab can be done with the `new` operator or by using the
GitlabFactory as in this example:

```typescript
    const gitlabInstance = createGitlabInstance();
    await gitlabInstance.init();
```

This will create both the GitlabInstance and the GitlabAPI based on session
storage (username and access token) as well as the OAuth2 authority from the
configuration files from the `config` folder. If the `triggerToken` does not
exist, it will throw a suitable error.

### Backend Class

The Backend class implements the BackendAPI interface. Its responsibilities
consist of direct communication with the Gitlab REST API through `gitbeaker`
while conforming to the aforementioned generalized interface. It also features
`triggerTokens` and a method for retrieving them, which is specific to this API.
It depends on `gitbeaker/rest`. Once initialized with a `triggerToken` retrieved
using the project ID provided by its backend (which also initializes this class
during its own initialization), it may be used to manage pipelines, manage and
receive repository files, obtain job logs (mainly for the `Backend`) and
`triggerTokens`. It contains a `client` field holding a `Gitlab` instance from
`@gitbeaker/rest`.

#### Backend Constructor and Initialization

Initialization is performed as described above. It is used with the projectID to
target the project containing your files on the Gitlab backend. If the `triggerToken`
is not provided upon execution of a pipeline, it will also throw an error.

## API Mapping

| Interface Method                      | Backend API Endpoint              | Parameters                                                    | Response Transformation               | Notes                                           |          |
| ------------------------------------- | --------------------------------- | ------------------------------------------------------------- | ------------------------------------- | ----------------------------------------------- | -------- |
| `startPipeline(projectId, ref, vars)` | `PipelineTriggerTokens.trigger`   | `projectId`, `ref`, `triggerToken`, `{ variables }, triggerToken`           | `{ id: response.id }`                 |   Implemented both in Instance and Backend     |
| `cancelPipeline(projectId, id)`       | `Pipelines.cancel`                | `projectId`, `pipelineId`                                     | `{ id: response.id }`                 |                                                 |          |
| `createRepositoryFile(...)`           | `RepositoryFiles.create`          | `projectId`, `filePath`, `branch`, `content`, `commitMessage` | `{ content }`                         |                                                 |          |
| `editRepositoryFile(...)`             | `RepositoryFiles.edit`            | Same as above                                                 | `{ content }`                         |                                                 |          |
| `removeRepositoryFile(...)`           | `RepositoryFiles.remove`          | Same as above                                                 | `{ content: '' }`                     | Content is always empty string on delete        |          |
| `getRepositoryFileContent(...)`       | `RepositoryFiles.show`            | `projectId`, `filePath`, `ref`                                | `{ content: atob(response.content) }` | Decodes base64 content                          |          |
| `listRepositoryFiles(...)`            | `Repositories.allRepositoryTrees` | `projectId`, `{ path, ref, recursive }`                       | Maps to `{ name, type, path }[]`      | `type` is cast from response string to `'blob' \| 'tree'` ||
| `getGroupByName(groupName)`           | `Groups.show`                     | `groupName`                                                   | Response passed directly              |                                                 |          |
| `listGroupProjects(groupId)`          | `Groups.allProjects`              | `groupId`                                                     | Response passed directly              |                                                 |          |
| `listPipelineJobs(projectId, id)`     | `Jobs.all`                        | `projectId`, `{ pipelineId }`                                 | Response passed directly              |                                                 |          |
| `getJobLog(projectId, jobId)`         | `Jobs.showLog`                    | `projectId`, `jobId`                                          | Response passed directly (string)     |                                                 |          |
| `getPipelineStatus(projectId, id)`    | `Pipelines.show`                  | `projectId`, `pipelineId`                                     | `pipeline.status`                     |                                                 |          |
| `getTriggerToken(projectId)`          | `PipelineTriggerTokens.all`       | `projectId`                                                   | `triggers[0].token`                   | Unique to GitLab backend                        |          |

## Configuration Requirements

### Environment Variables

You must have `REACT_APP_AUTH_AUTHORITY` defined in config. This specifies where
the Gitlab instance is hosted. The remaining config must also be valid to fill
out the session storage items of `access_token` and `username` upon signing in,
used by the backend.

Example:

`REACT_APP_AUTH_AUTHORITY: 'https://gitlab.com`

### External Service Setup

Please follow [config guide](../docs/admin/client/config.md) for setting up the
configuration. You may also wish to change certain constants, like
`COMMON_LIBRARY_PROJECT_NAME` and `DT_DIRECTORY` in the [constants](./constants.ts)
file.

<!--
Maybe something about setting up the folder structure.
-->

### Application Configuration

If you wish to further configure GitLab, it may be done within the profile tab
on the application website. Here you can change runner tag and more.
