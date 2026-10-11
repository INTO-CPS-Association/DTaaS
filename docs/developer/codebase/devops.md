# DevOps Framework :gear:

The DevOps framework lets the DTaaS client manage the lifecycle of a
Digital Twin through the GitLab API and GitLab CI/CD pipelines. With it
the client:

- discovers DT definitions and reusable assets in repositories,
- creates and updates DT files in Git repositories,
- triggers pipelines that execute DTs,
- collects pipeline and job status and logs to show in the UI.

## Where the Code Lives

The code is in `lib/dt-automation/src/`. The main modules are:

- `gitlab/backend.ts`: GitLab API wrapper.
- `gitlab/instance.ts`: backend session and project context.
- `digitalTwin.ts`: DT-level operations and execution tracking.
- `interfaces/backendInterfaces.ts`: backend contracts and API shapes.
- `util/`: execution history and file-management helpers.

[Client DevOps Integration](client-devops.md) describes these modules in
more detail.

## GitLab API Support

The GitLab backend implementation supports:

- pipeline trigger and cancellation,
- repository file create, edit and delete operations,
- group and project discovery,
- pipeline job listing and log retrieval,
- pipeline status polling,
- batching several file changes into one commit with
  `commitMultipleActions`.

With the batched commit, the user sees DT creation or an update as one
atomic change.

## Execution Flow

1. `GitlabInstance` resolves the project IDs and the trigger token.
2. The UI operation calls DT logic in `DigitalTwin`.
3. `DigitalTwin` uses the backend APIs to prepare files and trigger the
   pipeline.
4. The execution history is updated and shown in the UI.
5. Job logs and statuses are fetched and rendered for diagnosis.

## Pipeline Contract

The client triggers pipelines with two variables: `DTName`, the selected
digital twin, and `RunnerTag`, the tag of the GitLab runner that should
execute it. The GitLab CI pipelines must read these variables so that
each DT runs on the intended runner.

## Practical Guidance

- Prefer backend interface methods over ad hoc API calls in UI code.
- Use the batched commit method when updating several files.
- Keep execution history updates in the utility modules so that status
  reporting stays consistent.
