# Design Review (Per Component)

Component-level findings. Cross-cutting problems are collected in
[Systemic Issues](systemic-issues.md); this page stays at the level of
individual packages.

## React Client (`client/`)

**Strengths.** The client is the most mature package: ~16 kLOC of
source with ~28 kLOC of tests (unit, integration, and Playwright e2e
under `client/test/`), a documented internal architecture
(`client/src/model/backend/ARCHITECTURE.md`), typed Redux slices, and
runtime configuration injection via `env.js` that keeps one build
usable across deployments.

**Findings.**

1. *The backend abstraction is honest in intent but leaky in
   practice.* `BackendInterface` and the builder/strategy design
   described in `ARCHITECTURE.md` promise swappable backends, but the
   only implementation is GitLab, and the interfaces expose GitLab
   concepts directly — `getTriggerToken`, `Pipeline`, pipeline refs
   and job artifacts (`model/backend/interfaces/execution.ts`,
   `gitlab/instance.ts`). A second backend (e.g. Gitea) could not be
   written against these interfaces without changing them, which is
   the definition of a leaky abstraction. Either commit to GitLab and
   simplify, or lift the abstraction to lifecycle verbs
   (`start/stop/status/logs`) and push pipeline vocabulary down into
   the GitLab adapter.

1. *Too much platform logic lives here.* Pipeline orchestration,
   polling, log collection, retry and status interpretation
   (`gitlab/execution/`) are platform behaviour, not presentation.
   Consequences are detailed in
   [SI-3](systemic-issues.md#si-3-the-browser-is-the-platform).

1. *Execution and measurement history are browser-local.*
   `src/database/executionHistoryDB.ts` and
   `measurementHistoryDB.ts` persist to IndexedDB. History is lost on
   another machine, another browser, or a cleared profile, and cannot
   be shared between the users the platform otherwise emphasises
   sharing for.

1. *Parallel `util/` and `utils/` directories* (`src/util/`,
   `src/utils/`) and parallel store trees (`src/store/` and
   `src/model/store/`) blur module boundaries. Small, but it is the
   kind of drift that spreads.

1. *Benchmark/measurement task code ships with the product client.*
   `model/backend/gitlab/measure/tasks/` (multiple-identical-DTs,
   different-runners scenarios) is experiment tooling embedded in the
   production bundle; it belongs in a separate package or at least
   behind a build flag.

## Library Microservice (`servers/lib/`)

**Strengths.** Small and focused (~600 LOC src, test LOC exceeds
source). Clean NestJS module layout with a config service, a files
module with two swappable providers (local, git) behind
`files-service.factory.ts` — this is what a non-leaky strategy
pattern looks like, and it contrasts favourably with the client's.

**Findings.**

1. *No authentication or authorisation of its own.* The GraphQL API
   and the embedded cloudcmd file manager trust the perimeter
   entirely. cloudcmd in particular allows file modification and
   upload; behind a single mis-scoped Traefik rule it is an
   unauthenticated file manager over the shared asset store.

1. *`mock-fs` is declared as a production dependency*
   (`package.json` `dependencies`), pulling a test-only filesystem
   mocking library into every production install and Docker image.
   It should be in `devDependencies`.

1. *Dual API surface without a stated contract.* The service exposes
   GraphQL (files resolver), cloudcmd's own HTTP/WebSocket API, and
   git operations via isomorphic-git. Which surface is the supported
   integration contract is not documented; `API.md` and `HTTP.md`
   describe surfaces separately.

## DT Runner (`servers/execution/runner/`)

**Strengths.** Minimal by design (~400 LOC): a whitelist of permitted
commands from `runner.yaml`, Zod-validated DTOs, execa-based process
management. The whitelist model is the right instinct.

**Findings.**

1. *No caller authentication.* Any process that can reach the port
   can run any whitelisted command and read execution history. The
   runner relies wholly on network placement; a bearer-token check
   (even a static shared secret from its YAML config) would be a
   cheap, meaningful hardening step.

1. *`Queue` is not a queue.* `queue.service.ts` appends every command
   ever received to an array; `activeCommand()` returns the last
   element; nothing is ever dequeued; `checkHistory()` returns the
   whole array. It is an unbounded execution log with a misleading
   name — memory grows monotonically with use, and concurrent command
   handling semantics (is a second command rejected? queued?) are not
   expressed anywhere in the type. Rename it, bound it, and make the
   concurrency policy explicit.

1. *Silent failure channel.* `newCommand` reduces all failure to one
   boolean, and the controller maps it to a generic
   `invalid command` response — the caller cannot distinguish
   "not whitelisted" from "spawned but exited non-zero" from
   "spawn failed".

## DTaaS CLI (`cli/`) and Services Manager (`deploy/services/cli/`)

**Strengths.** The new CLI (commit `e7f9dd6`) consolidates user and
config management with templates (`dtaas.toml`, generated compose
files), validation, and reconcile/uninstall flows — clearly the right
direction for taming the deployment matrix. dtaas-services has a
proper test tree per service.

**Findings.**

1. *Two Python CLIs with overlapping missions.* `cli/` (platform
   install, users) and `deploy/services/cli/` (third-party services,
   including its own GitLab compose template) both template compose
   files, both wrap docker, and are packaged and released separately.
   The boundary between them is historical rather than conceptual;
   admins must learn both.

1. *Compose-file rewriting as the user model.* Users are managed by
   editing YAML service definitions. This works at current scale but
   couples user management to file-format details and requires
   filesystem access to the deployment host; there is no API surface
   an admin UI could ever call. (Accepted for now — see improvement
   I-6 before investing here.)

## Deployment Scenarios (`deploy/`)

**Findings.**

1. *Four docker scenarios plus Vagrant plus two CLIs* form the real
   installation matrix (localhost, server, secure-server,
   secure-server+GitLab, vagrant single/two-machine). Each scenario
   has its own compose file and CONFIG.md; drift between them is
   already visible (see next point). Every scenario added multiplies
   the testing and documentation burden — the `workspace.yml` CI job
   cannot cover this matrix.

1. *Image version drift and unpinned images.* The `server` scenario
   pins `intocps/dtaas-web:1.0.2` and `intocps/libms:0.5.9` while the
   repo releases are 1.3.0 and 0.5.11; `traefik-forward-auth` uses
   `:latest` of a third-party image whose upstream maintenance has
   stalled. Compose files are not updated by the release process
   (see [SI-7](systemic-issues.md#si-7-release-engineering-gaps)).

1. *No resource limits on user workspaces.* Workspace containers in
   the base scenarios carry no CPU/memory limits, so one user can
   starve a shared host — the accounting/quota functions the intended
   architecture assigns to the (unbuilt) accounting service.

## Documentation and CI

The docs tree is a genuine asset: per-package DEVELOPER.md files,
admin scenario guides, a test pyramid description, and mkdocs
publishing. CI is per-package (client, lib-ms, runner, python CLIs,
docs, workspace) with Codecov upload and SonarCloud badges. Gaps: no
cross-package integration pipeline exercises a composed deployment
end-to-end, and quality gates are not uniform across packages (client
has extensive e2e; runner and libms stop at unit/integration level;
the Python packages' coverage is not surfaced in STATUS.md).
