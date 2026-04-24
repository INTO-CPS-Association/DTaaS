# Client DevOps Integration

This page consolidates the previous DevOps overview and implementation notes
for the current React client codebase.

## Scope

The DevOps integration in the client is responsible for:

- discovering Digital Twin and library assets from GitLab repositories,
- creating, updating, and deleting DT files,
- triggering and stopping CI/CD pipeline executions,
- collecting pipeline status and logs for user-facing execution views.

## Current Module Map

Primary implementation lives in `client/src/model/backend/`:

- `gitlab/backend.ts`: `GitlabAPI` concrete `BackendAPI` implementation.
- `gitlab/instance.ts`: `GitlabInstance` project context and trigger-token holder.
- `digitalTwin.ts`: DT lifecycle operations, execution orchestration hooks.
- `DTAssets.ts`, `fileHandler.ts`, `libraryAsset.ts`, `libraryManager.ts`:
  file and asset management primitives.
- `util/digitalTwinPipelineExecution.ts`: start/stop execution paths.
- `util/digitalTwinExecutionHistory.ts`: execution history and log updates.
- `state/`: Redux state for execution history and status views.
- `interfaces/backendInterfaces.ts`: backend contracts and shared types.

## Architectural Roles

The implementation keeps a clear split between context, API access, and DT
domain behavior.

- `GitlabAPI` handles direct GitLab REST operations via `@gitbeaker/rest`
  (files, pipelines, groups/projects, jobs, logs, multi-action commits).
- `GitlabInstance` resolves `projectId` and `commonProjectId`, retrieves the
  trigger token, and exposes high-level execution data accessors.
- `DigitalTwin` composes DT asset/file operations with pipeline execution and
  execution-history updates.
- Supporting classes (`DTAssets`, `LibraryAsset`, `LibraryManager`,
  `FileHandler`) isolate low-level file and repository interactions.

This separation keeps UI code independent from GitLab implementation details.

## Execution Flow

1. A session creates/initializes `GitlabInstance`.
2. The UI performs DT actions through `DigitalTwin` and backend utility modules.
3. Pipeline start/stop calls are routed through `GitlabInstance` and `GitlabAPI`.
4. Status polling and job log fetching update execution history state.
5. UI components render current and historical execution results.

## File Operations and Commit Strategy

The client supports both per-file operations and batched commit updates.

- Single-file operations use `createRepositoryFile`, `editRepositoryFile`, and
  `removeRepositoryFile`.
- Multi-file updates should use `commitMultipleActions` to produce one coherent
  commit for DT scaffolding/reconfiguration workflows.

The batched path reduces commit fragmentation and keeps lifecycle updates atomic.

## Key Contracts

The `BackendAPI` contract includes:

- pipeline trigger/cancel/status,
- pipeline job listing and job log retrieval,
- repository file CRUD and tree listing,
- group/project discovery,
- multi-action commit support (`commitMultipleActions`).

When extending DevOps behavior, update interface contracts first, then concrete
GitLab implementation and call sites.

## Contributor Guidance

- Keep GitLab-specific details inside `model/backend/gitlab/`.
- Keep route/page components focused on presentation and user interaction.
- Reuse utility/state modules for execution history instead of introducing
  ad-hoc polling in UI components.
- Add or update unit/integration tests when introducing backend contract changes.
