# Implemented Classes

In order to facilitate the management of the lifecycle of DTs via the web
application interfaces, it was necessary to develop specific code within the
project client. The code was designed to facilitate efficient API calls through
the use of Gitbeaker as a wrapper, as this approach simplifies interactions
with GitLab’s REST API and reduces the complexity of the project code.

The APIs have been integrated into the front-end by wiring up API endpoints to
front-end components, ensuring a seamless data flow. Unit and integration
testing was done to ensure the coverage of all functional requirements and solve
all problems regarding data consistency, performance, or user experience.

Given below is our implementation of these classes in TypeScript:

```typescript
class GitlabInstance {
  async init();
  async getProjectId();
  async getTriggerToken(projectId: number);
  async getDTSubfolders(projectId: number);
  async getLibrarySubfolders(
    projectId: number,
    type: string,
    isPrivate: boolean,
  );
  executionLogs();
  async getPipelineJobs(
    projectId: number,
    pipelineId: number,
  );
  async getJobTrace(projectId: number, jobId: number);
  async getPipelineStatus(
    projectId: number,
    pipelineId: number,
  );
}

class DigitalTwin {
  async getDescription();
  async getFullDescription();
  private async triggerPipeline();
  async execute();
  async stop(projectId: number, pipeline: string);
  async create(
    files: FileState[],
    cartAssets: LibraryAsset[],
    libraryFiles: LibraryConfigFile[],
  );
  async delete();
  async getDescriptionFiles();
  async getConfigFiles();
  async getLifecycleFiles();
  async prepareAllAssetFiles(
    cartAssets: LibraryAsset[],
    libraryFiles: LibraryConfigFile[],
  );
  async getAssetFiles();
}

class LibraryAsset {
  async getDescription();
  async getFullDescription();
  async getConfigFiles();
}
```

## GitlabInstance

The `GitlabInstance` class was created in order to manage the APIs and
information related to the GitLab profile, the project, and the user-specific
data stored in their account.

The username and the token required to instantiate the Gitbeaker _Gitlab_
component, which is required for making the API calls, are retrieved from the
session storage, taking the _access_token_ of the user already logged into the
DTaaS application.

The initialisation of the `GitlabInstance` object is concluded with the
execution of the `init()` method, which enables the retrieval and storage of
the `projectId` and `triggerToken` attributes. The _projectId_ is a unique
identifier for projects in GitLab and it is essential for subsequent API calls.
For example, it is passed to the method that retrieves a _trigger token_,
which is used to trigger CI/CD pipelines in GitLab.

The objective of the `getDTSubfolders` method was to retrieve the names and
corresponding descriptions of the DTs of the user, so that these could be shown
at the front-end interface. This approach would obviate the user from having to
input the name of a DT; hence, saving the user from possible error and
inefficiencies arising from manual input. The user interface makes it easier
for the user to deal with DTs by automatizing their selection and manages them
more accurately. This implementation also eliminates the necessity for manual
input from users for the access token and the username, which are automatically
provided via the GitLab OAuth login.

Furthermore, logs maintained in the `GitlabInstance` class improve awareness
and transparency over the operations conducted. The final three methods are
employed in conjunction to oversee the execution of a DT. In particular,
individual logs are saved for each job in the pipeline, and the status of the
latter is monitored so that, once the entire pipeline is complete, the results
can be displayed in detail within the user interface. In this way, all statuses
of each operation are logged for better debugging and performance analysis,
including possible errors. Having trace logs exposed to the user means
troubleshooting will be more effective and insight into execution and
management of DTs will be gained, improving system reliability and user
confidence.

## DigitalTwin

The DigitalTwin class was created in order to manage the APIs and information
related to a specific DT.

The creation of a DigitalTwin object requires a pre-existing GitlabInstance to
be associated with the object. It was determined that matching a different
GitlabInstance for each DigitalTwin would be the optimal approach to ensure the
maintenance of independence between the various DTs. The _api_ attribute of
GitlabInstance facilitates the execution of Gitbeaker APIs pertinent to the DT.

The class allows a pipeline to be started and stopped, thus giving the user full
control of the execution. The execute() method uses the previous methods
internally. This approach ensures that there are no errors due to missing design
information during the execution of the pipeline. Responsibilities have been
divided into smaller methods in order to make the code more modular, facilitating
debugging and testing. In both execute() and stop(), the status of operations
executed on the DT is monitored, keeping track of them via the logs attribute of
GitlabInstance. Errors are identified and tracked, providing a complete view and
the ability to monitor performance.

The `descriptionFiles`, `lifecycleFiles` and `configFiles` attributes are used
to keep track of the files within the corresponding GitLab folder of the
DT, thus enabling the read and modify features.<br>
The create() method enables the creation of a DT and saves all its files
in the user’s corresponding GitLab folder. Additionally, if the DT is
configured as _common_, it is also added to GitLab’s shared folder,
making it part of the Library and accessible to other users.

Similarly, the delete() method removes a DT from GitLab. If the DT was
part of the Library, it is also removed from the shared folder.

A crucial aspect of these two methods is their integration with the
DevOps infrastructure. When a DT is created or deleted, the
`.gitlab-ci.yml` file of the parent pipeline is updated to add or remove
the _trigger_DTName_ section associated with the DT. This ensures that a
user-created DT can be executed via the web interface without requiring
manual updates to pipeline configuration files on GitLab. Instead, these
files are automatically updated, providing an effortless user experience
and maintaining alignment with the infrastructure.

## LibraryAsset

The LibraryAsset class was created in order to manage the APIs and information
related to a specific library asset.

It is similar to the DigitalTwin class, but contains only the methods required
to display files. This focused design reflects its limited scope and ensures
simplicity and clarity for use cases involving the library.

---

Ref: Vanessa Scherma, Design and implementation of an integrated DevOps
framework for Digital Twins as a Service software platform,
Master's Degree Thesis, Politecnico Di Torino, 2024.
