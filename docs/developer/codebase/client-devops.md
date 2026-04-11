# Client DevOps Integration :computer:

This page explains how the React client integrates with GitLab-backed DevOps behavior.

## Client Architecture Touchpoints

The client organizes DevOps behavior around domain models in `client/src/model/backend/`.

Primary integration points:

- `GitlabAPI` for low-level GitLab REST calls.
- `GitlabInstance` for project context and trigger token initialization.
- `DigitalTwin` for DT-specific lifecycle operations.
- Execution utility modules for status and log handling.

## User-Facing Features Enabled by Integration

- Load DT and library data directly from user/common repositories.
- Create or update DT assets from client workflows.
- Trigger GitLab pipelines from the UI.
- Monitor execution progress and show job logs.

## File and Commit Operations

The backend layer supports both single-file operations and batched commits.

Use batched commits when a workflow touches multiple files (for example DT
scaffolding or synchronized config updates). This creates one consistent Git
commit and simplifies rollback reasoning.

## Execution History Model

Execution state is tracked per DT and includes:

- Active pipeline identifiers.
- Execution statuses.
- Aggregated job logs.

This enables the UI to represent both current activity and previously
completed runs.

## Integration Boundaries

- UI routes and components should call model/backend abstractions.
- GitLab-specific behavior should stay inside backend implementations.
- Shared contracts in interface files should be updated first when API shapes
  change.

This boundary keeps the UI maintainable while allowing backend strategy evolution.
