# DevOps Framework :gear:

This page consolidates the DevOps framework documentation for the current
DTaaS codebase.

## Purpose

The DevOps framework allows the DTaaS client to manage Digital Twin lifecycle
actions through GitLab APIs and CI/CD pipelines.

Core capabilities include:

- Discovering DT definitions and reusable assets from repositories.
- Creating/updating DT files in Git repositories.
- Triggering pipelines for DT execution.
- Collecting pipeline/job status and logs for UI feedback.

## Current Implementation Footprint

Key code is in `client/src/model/backend/`.

Main modules:

- `gitlab/backend.ts`: GitLab API wrapper.
- `gitlab/instance.ts`: backend session and project context.
- `digitalTwin.ts`: DT-level operations and execution tracking.
- `interfaces/backendInterfaces.ts`: backend contracts and API shapes.
- `util/`: execution history and file-management helpers.

## API Integration Highlights

The GitLab backend implementation supports:

- Pipeline trigger and cancellation.
- Repository file create/edit/delete operations.
- Group and project discovery.
- Pipeline job listing and log retrieval.
- Pipeline status polling.
- Multi-file commit batching via `commitMultipleActions`.

The multi-action commit path reduces fragmentation and keeps DT creation or
updates atomic from the user perspective.

## Execution Flow

1. `GitlabInstance` resolves project IDs and trigger token.
2. The UI operation calls DT logic in `DigitalTwin`.
3. `DigitalTwin` uses backend APIs to prepare files and trigger pipeline execution.
4. Execution history is updated and surfaced to the UI.
5. Job logs and statuses are fetched and rendered for diagnostics.

## Pipeline Contract

The framework assumes GitLab CI pipelines are prepared to consume DT selection
and runner context as variables. This enables controlled execution across
available runners and environments.

## Practical Guidance

- Prefer backend interface methods over ad-hoc API calls in UI code.
- Use the batched commit method when updating multiple files.
- Keep execution history updates centralized in utilities for consistent status
  reporting.
