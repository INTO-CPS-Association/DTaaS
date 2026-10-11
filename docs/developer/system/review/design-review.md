# Design Review (Per Component)

This page collects findings for individual packages. Problems that cut
across packages are in [Systemic Issues](systemic-issues.md).

## React Client (`client/`)

**Strengths.** The client is the most mature package. It has about
16 kLOC of source and about 28 kLOC of tests (unit, integration and
Playwright end-to-end tests under `client/test/`), a documented
internal architecture (`lib/dt-automation/src/ARCHITECTURE.md`),
typed Redux slices, and runtime configuration injection via `env.js`
that lets one build serve many deployments.

**Findings.**

1. *The backend abstraction leaks.* `BackendInterface` and the
   builder/strategy design described in `ARCHITECTURE.md` promise
   swappable backends, but GitLab is the only implementation, and the
   interfaces expose GitLab concepts directly: `getTriggerToken`,
   `Pipeline`, pipeline refs and job artifacts
   (`lib/dt-automation/src/interfaces/execution.ts`,
   `lib/dt-automation/src/gitlab/instance.ts`). A
   second backend (for example Gitea) could not be written against
   these interfaces without changing them. Either commit to GitLab and
   simplify, or lift the abstraction to lifecycle verbs
   (`start/stop/status/logs`) and push the pipeline vocabulary down
   into the GitLab adapter.

1. *Too much platform logic lives here.* Pipeline orchestration,
   polling, log collection, retries and status interpretation
   (`gitlab/execution/`) are platform behaviour rather than
   presentation. The consequences are detailed in
   [SI-3](systemic-issues.md#si-3-the-browser-is-the-platform).

1. *Execution and measurement history are browser-local.*
   `src/database/executionHistoryDB.ts` and
   `measurementHistoryDB.ts` persist to IndexedDB. History is lost on
   another machine, in another browser or after clearing the profile,
   and users cannot share it, even though the platform otherwise
   emphasises sharing.

1. *Parallel `util/` and `utils/` directories* (`src/util/`,
   `src/utils/`) and separate store trees (`client/src/store/` and
   `lib/dt-automation/src/store/`) blur module boundaries. This is
   minor, but this kind of drift spreads.

1. *Benchmark and measurement task code ships with the product
   client.* `lib/dt-automation/src/gitlab/measure/tasks/` (scenarios with
   multiple identical DTs and with different runners) is experiment
   tooling embedded in the production bundle. It belongs in a separate
   package, or at least behind a build flag.

## Library Microservice (`servers/lib/`)

**Strengths.** The service is small and focused (about 600 LOC of
source, with more test code than source). It has a clean NestJS module
layout with a config service and a files module whose two swappable
providers (local and git) sit behind `files-service.factory.ts`. This
strategy pattern does not leak, unlike the client's.

**Findings.**

1. *No authentication or authorisation of its own.* The GraphQL API
   and the embedded cloudcmd file manager trust the perimeter
   entirely. cloudcmd allows file modification and upload, so behind a
   single mis-scoped Traefik rule it becomes an unauthenticated file
   manager over the shared asset store.

1. *`mock-fs` is declared as a production dependency*
   (`package.json` `dependencies`). Every production install and
   Docker image pulls in this test-only file system mocking library.
   It should be in `devDependencies`.

1. *Several API surfaces without a stated contract.* The service
   exposes GraphQL (files resolver), cloudcmd's own HTTP/WebSocket API
   and git operations via isomorphic-git. The documentation does not
   say which surface is the supported integration contract; `API.md`
   and `HTTP.md` describe the surfaces separately.

## DT Runner (`servers/execution/runner/`)

**Strengths.** The runner is minimal by design (about 400 LOC): a
whitelist of permitted commands from `runner.yaml`, Zod-validated DTOs
and execa-based process management. The whitelist model is the right
instinct.

**Findings.**

1. *No caller authentication.* Any process that can reach the port can
   run any whitelisted command and read the execution history. The
   runner relies entirely on network placement. A bearer-token check,
   even a static shared secret from its YAML config, would be a cheap
   and meaningful hardening step.

1. *`Queue` is not a queue.* `queue.service.ts` appends every command
   it receives to an array; `activeCommand()` returns the last element,
   nothing is ever dequeued, and `checkHistory()` returns the whole
   array. It is an unbounded execution log with a misleading name.
   Memory grows with every command, and the type does not express how
   concurrent commands are handled (is a second command rejected or
   queued?). Rename it, bound it and make the concurrency policy
   explicit.

1. *Silent failure channel.* `newCommand` reduces every failure to one
   boolean, and the controller maps it to a generic `invalid command`
   response. The caller cannot tell "not whitelisted" from "spawned
   but exited non-zero" or "spawn failed".

## DTaaS CLI (`cli/`) and Services Manager (`deploy/services/cli/`)

**Strengths.** The new CLI (commit `e7f9dd6`) consolidates user and
configuration management with templates (`dtaas.toml`, generated
compose files), validation, and reconcile and uninstall flows. This is
the right direction for reducing the deployment matrix. dtaas-services
has its own test tree for each service.

**Findings.**

1. *Two Python CLIs with overlapping missions.* `cli/` (platform
   installation, users) and `deploy/services/cli/` (third-party
   services, including its own GitLab compose template) both template
   compose files and wrap docker, and they are packaged and released
   separately. The boundary between them is historical rather than
   conceptual, and admins must learn both.

1. *Compose-file rewriting as the user model.* Users are managed by
   editing YAML service definitions. This works at current scale, but
   it couples user management to file-format details and requires
   file system access to the deployment host. There is no API that an
   admin UI could call. (Accepted for now; see improvement I-7 before
   investing here.)

## Deployment Scenarios (`deploy/`)

**Findings.**

1. *Four docker scenarios, Vagrant and two CLIs* form the real
   installation matrix (localhost, server, secure-server,
   secure-server with GitLab, and Vagrant single-machine and
   two-machine setups). Each scenario has its own compose file and
   CONFIG.md, and drift between them is already visible (see the next
   point). Each new scenario adds to the testing and documentation
   burden.

1. *Image version drift and unpinned images.* The docker compose files
   pin versions of the `intocps/dtaas-web` and `intocps/libms` images
   that can lag behind the latest releases on
   [Docker Hub](https://hub.docker.com/u/intocps).
   `traefik-forward-auth` uses the `:latest` tag of a third-party image
   whose upstream maintenance has stalled. The release process does
   not update the compose files
   (see [SI-7](systemic-issues.md#si-7-release-engineering-gaps)).

1. *No resource limits on user workspaces.* Workspace containers in
   the base scenarios have no CPU or memory limits, so one user can
   starve a shared host. The intended architecture assigns these
   accounting and quota functions to the accounting service, which has
   not been built.

## Documentation and CI

The documentation tree is a real asset: per-package DEVELOPER.md
files, admin scenario guides, a test pyramid description and MkDocs
publishing. CI runs per package (client, lib-ms, runner, Python CLIs,
docs, workspace) with Codecov upload and SonarCloud badges. The gaps:
no integration pipeline exercises a composed deployment end to end,
and quality gates differ between packages. The client has extensive
end-to-end tests, the runner and libms stop at the unit and integration
level, and STATUS.md does not show coverage for the Python packages.
