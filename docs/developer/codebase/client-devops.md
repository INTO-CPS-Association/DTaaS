# Client DevOps Integration

This page describes how the React client manages digital twins through
GitLab.

## Scope

The DevOps integration in the client:

- discovers Digital Twin and library assets in GitLab repositories,
- creates, updates and deletes DT files,
- triggers and stops CI/CD pipeline executions,
- collects pipeline status and logs for the execution views.

## Current Module Map

The implementation lives in `lib/dt-automation/src/`:

- `gitlab/backend.ts`: `GitlabAPI`, the concrete `BackendAPI`
  implementation.
- `gitlab/instance.ts`: `GitlabInstance`, which holds the project context
  and trigger token.
- `gitlab/execution/`: pipeline polling, status checks and log fetching.
- `digitalTwin.ts`: DT lifecycle operations and execution hooks.
- `DTAssets.ts`, `fileHandler.ts`, `libraryAsset.ts`, `libraryManager.ts`:
  file and asset management primitives.
- `util/digitalTwinPipelineExecution.ts`: start and stop execution paths.
- `util/digitalTwinExecutionHistory.ts`: execution history and log updates.
- `state/`: Redux state for execution history and status views.
- `interfaces/backendInterfaces.ts`: backend contracts and shared types.

## Architectural Roles

Context, API access and DT domain behaviour sit in separate classes.

- `GitlabAPI` calls the GitLab REST API through `@gitbeaker/rest`
  (files, pipelines, groups and projects, jobs, logs, multi-action
  commits).
- `GitlabInstance` resolves `projectId` and `commonProjectId`, retrieves
  the trigger token and exposes accessors for execution data.
- `DigitalTwin` combines DT asset and file operations with pipeline
  execution and execution-history updates.
- `DTAssets`, `LibraryAsset`, `LibraryManager` and `FileHandler` handle
  low-level file and repository interactions.

UI code therefore does not depend on GitLab implementation details.

## Execution Flow

1. A session creates and initializes `GitlabInstance`.
2. The UI performs DT actions through `DigitalTwin` and the backend
   utility modules.
3. Pipeline start and stop calls go through `GitlabInstance` and
   `GitlabAPI`.
4. Status polling and job log fetching update the execution history
   state.
5. UI components render current and past execution results.

## File Operations and Commit Strategy

The client supports both per-file operations and batched commits.

- Single-file operations use `createRepositoryFile`, `editRepositoryFile`
  and `removeRepositoryFile`.
- Multi-file updates should use `commitMultipleActions` to produce one
  commit when scaffolding or reconfiguring a DT.

A batched commit keeps a lifecycle update atomic and avoids a long trail
of single-file commits.

## Main Contracts

The `BackendAPI` contract includes:

- pipeline trigger, cancel and status,
- pipeline job listing and job log retrieval,
- repository file create, read, update and delete, and tree listing,
- group and project discovery,
- multi-action commits (`commitMultipleActions`).

When extending DevOps behaviour, update the interface contracts first,
then the GitLab implementation and its call sites.

## Contributor Guidance

- Keep GitLab-specific details inside `lib/dt-automation/src/gitlab/`.
- Keep route and page components focused on presentation and user
  interaction.
- Reuse the utility and state modules for execution history instead of
  adding ad hoc polling to UI components.
- Add or update unit and integration tests when changing backend
  contracts.
