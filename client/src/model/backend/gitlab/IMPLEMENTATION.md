# GitLab Implementation Documentation

## Overview
The implementation provides an all-in-one backend complete with functionality for getting pipelines, job traces, execution logs (as well as maintaining), project and common id. It further features an API interface configured according to a specific project. It depends on @gitbeaker/rest and acts as a concretizisations of the Backend and BackendAPI interfaces.

## Architecture Components
### GitlabInstance Class
This class implements the Backend interface. Its primary responsability consists of initializing the Backend api, and obtaining the project id and common project id from the name and hard-coded common group name. After this, it keeps track of execution log entries and gives high-level access to pipeline information, job traces and ids for further processing by the chosen Backend API, which does not necessarily have to be Gitlab. It is only dependent on its backend api and there are no initialization requirements.

#### Constructor and Initialization
Initialization of Gitlab can be done with the `new` operator or by using the GitlabFactory as in this example:
```typescript
    const gitlabInstance = createGitlabInstance();
    await gitlabInstance.init();
```
This will create both the GitlabInstance and the GitlabAPI based on session storage (username and access token) as well as the OAuth2 authority from the configuration files from the `/config` folder.

### GitlabAPI Class
The GitlabAPI class implements the BackendAPI class. Its responsibilities consists of direct communication with the Gitlab REST API through `gitbeaker` while conforming to the aforementioned generalized interface. It furthermore features `triggerTokens` and associated method for obtaining it, of which is unique to this API. It depends on `gitbeaker/rest`. Once initialized with a `triggerToken` retrieved from the project id passed by its backend (of which also initializes this class upon initialization), it may be used to manage pipelines, manage and receive repository files, obtain job logs (mainly for the `Backend`) and `triggerTokens`. It contains a `client` field of a `Gitlab` object from `Gitbeaker` as well as `triggerToken`.

#### Constructor and Initialization
Initialization is performed as is described above. It uses the projectID to target the project containing your files on the Gitlab backend. If the `triggerToken` does not exist, it will throw a suitable error.

## API Mapping
| Interface Method                      | Backend API Endpoint              | Parameters                                                    | Response Transformation               | Notes                                           |          |
| ------------------------------------- | --------------------------------- | ------------------------------------------------------------- | ------------------------------------- | ----------------------------------------------- | -------- |
| `init(projectId)`                     | `PipelineTriggerTokens.all`       | `projectId`                                                   | `triggers[0].token`                   | Throws if no token found                        |          |
| `startPipeline(projectId, ref, vars)` | `PipelineTriggerTokens.trigger`   | `projectId`, `ref`, `triggerToken`, `{ variables }`           | `{ id: response.id }`                 | Uses the `triggerToken` stored during `init()`  |          |
| `cancelPipeline(projectId, id)`       | `Pipelines.cancel`                | `projectId`, `pipelineId`                                     | `{ id: response.id }`                 |                                                 |          |
| `createRepositoryFile(...)`           | `RepositoryFiles.create`          | `projectId`, `filePath`, `branch`, `content`, `commitMessage` | `{ content }`                         |                                                 |          |
| `editRepositoryFile(...)`             | `RepositoryFiles.edit`            | Same as above                                                 | `{ content }`                         |                                                 |          |
| `removeRepositoryFile(...)`           | `RepositoryFiles.remove`          | Same as above                                                 | `{ content: '' }`                     | Content is always empty string on delete        |          |
| `getRepositoryFileContent(...)`       | `RepositoryFiles.show`            | `projectId`, `filePath`, `ref`                                | `{ content: atob(response.content) }` | Decodes base64 content                          |          |
| `listRepositoryFiles(...)`            | `Repositories.allRepositoryTrees` | `projectId`, `{ path, ref, recursive }`                       | Maps to `{ name, type, path }[]`      | `type` is cast from response string to \`'blob' | 'tree'\` |
| `getGroupByName(groupName)`           | `Groups.show`                     | `groupName`                                                   | Response passed directly              |                                                 |          |
| `listGroupProjects(groupId)`          | `Groups.allProjects`              | `groupId`                                                     | Response passed directly              |                                                 |          |
| `listPipelineJobs(projectId, id)`     | `Jobs.all`                        | `projectId`, `{ pipelineId }`                                 | Response passed directly              |                                                 |          |
| `getJobLog(projectId, jobId)`         | `Jobs.showLog`                    | `projectId`, `jobId`                                          | Response passed directly (string)     |                                                 |          |
| `getPipelineStatus(projectId, id)`    | `Pipelines.show`                  | `projectId`, `pipelineId`                                     | `pipeline.status`                     |                                                 |          |
| `getTriggerToken(projectId)`          | `PipelineTriggerTokens.all`       | `projectId`                                                   | `triggers[0].token`                   | Unique to GitLab backend                        |          |

## Configuration Requirements
### Environment Variables
<!--
List all environment variables:
- Variable name
- Purpose
- Required/optional
- Example values
- Where they're used in the code
-->
You must have `REACT_APP_AUTH_AUTHORITY` defined in config. This specifies where the Gitlab instance is hosted. The remaining config must also be valid to fill out the session storage items of `access_token` and `username` upon signing in.

Example:

`REACT_APP_AUTH_AUTHORITY: 'https://gitlab.com`

### External Service Setup
Please follow [config guide](../docs/admin/client/config.md) for setting up the configuration. Also you may wish to change certain constants, like `COMMON_LIBRARY_PROJECT_NAME` and `DT_DIRECTORY` in the [constants](./constants.ts) file.

<!--
Maybe something about setting up the folder structure.
-->

### Application Configuration
If you wish to further configure GitLab, it may be done within the profile tab on the application website. Here you can change runner tag and more.