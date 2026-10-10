# Architecture Review (As Implemented)

The [architecture page](../architecture.md) describes the intended
architecture. This page documents the architecture that the code and
deployment artifacts realised at the time of the review, because the
two differ in important ways; see systemic issue
[SI-1](systemic-issues.md#si-1-documented-vs-implemented-architecture).

## Requirements Traceability

The architecture page lists eight user requirements. Their
implementation status, recovered from code, is:

| Requirement | Status | Implemented by |
| :---------- | :----- | :------------- |
| Author | Implemented | User workspaces (containers), integrated GitLab |
| Consolidate | Implemented | Library microservice, client library pages |
| Configure | Partial | Client editors (`client/src/route/digitaltwins/editor`, Monaco) |
| Execute | Partial | GitLab CI pipelines triggered from the browser; DT Runner |
| Explore | Partial | Client DevOps pages, IndexedDB execution history |
| Save | Not implemented | None |
| Services | Implemented | dtaas-services CLI (MQTT, InfluxDB, Grafana, …) |
| Share | Partial | GitLab group/project visibility; common library files |

Components named in the architecture but absent from the codebase are
the DT Lifecycle Manager, DT Execution Manager, Accounting
microservice, Security microservice (RBAC) and a service mesh. The
architecture page's own component table already marks three of these
"Not available yet", and the review found no partial implementations
of any of them.

## High-Level Architecture (Recovered)

```text
                       ┌────────────────────────────┐
  Browser              │  Traefik (service router)  │
 ┌──────────────┐      │  + traefik-forward-auth    │
 │ React client │──────│  (OAuth2 via GitLab)       │
 │              │      └──────┬──────┬──────┬───────┘
 │ DT lifecycle │             │      │      │
 │ orchestration│      ┌──────┘      │      └──────────┐
 │ (gitbeaker)  │      ▼             ▼                 ▼
 │ IndexedDB    │  ┌────────┐  ┌───────────┐  ┌───────────────┐
 │ exec history │  │ libms  │  │ user1..N  │  │ static files, │
 └──────┬───────┘  │(NestJS)│  │ workspace │  │ client assets │
        │          └────────┘  │ containers│  └───────────────┘
        │ REST (direct)        └─────┬─────┘
        ▼                            │ DT Runner (NestJS)
 ┌─────────────────────┐             │ inside workspace
 │ GitLab              │◄────────────┘
 │ - OAuth provider    │
 │ - DT/asset storage  │
 │ - CI pipeline       │
 │   executor          │
 │ - trigger tokens    │
 └─────────────────────┘
```

Three facts define this architecture, and the intended-architecture
diagram shows none of them:

1. **GitLab is the de facto platform backend.** It provides identity
   (OAuth), asset and DT storage (repositories), the execution engine
   (CI pipelines and runners) and authorisation boundaries (group and
   project membership). Evidence: `lib/dt-automation/src/gitlab/`
   implements pipeline start, cancel and log fetching against the
   GitLab REST API, and `deploy/dtaas/docker/*/docker-compose.yml`
   wires `traefik-forward-auth` to GitLab OAuth endpoints.

1. **The browser is the DT lifecycle manager.** Orchestration runs
   client-side: resolving projects, fetching trigger tokens, starting
   pipelines, polling status and collecting logs
   (`lib/dt-automation/src/gitlab/execution/pipelinePolling.ts`,
   `instance.ts`). Execution history is persisted in the browser's
   IndexedDB (`client/src/database/executionHistoryDB.ts`), so the
   platform itself holds no record of DT executions.

1. **Security is perimeter-only.** Traefik routes by path prefix and
   `traefik-forward-auth` authenticates at the edge. Behind the
   perimeter, no service authenticates its callers. The library
   microservice exposes GraphQL and cloudcmd without authentication
   checks (`servers/lib/src/` contains no auth middleware), and the DT
   Runner executes configured commands for any caller
   (`servers/execution/runner/src/app.controller.ts`).

## Data Flows

**DT execution flow (primary flow):** when the user clicks Execute,
the client resolves the GitLab project ID and trigger token, starts a
GitLab CI pipeline with variables, polls the pipeline and job status,
fetches the job logs and writes the results to browser IndexedDB. The
platform's servers take no part in this loop; a network observer sees
only browser-to-GitLab traffic.

**Asset flow:** library assets live either on the file system mounted
into `libms` (local backend) or in git repositories (git backend,
`servers/lib/src/files/git/git-files.service.ts` using
isomorphic-git). The client queries them over GraphQL and renders
file trees; cloudcmd provides direct file management.

**User provisioning flow:** an admin runs the Python CLI (`cli/`),
which rewrites docker compose files from templates to add or remove
per-user workspace services, then reconciles the running deployment
via python-on-whales. Users are compose services, not data.

## Trade-off Analysis of the Current Architecture

The current shape was chosen for real benefits. This section states
what each choice costs.

**Delegating the backend to GitLab** gave the team a large amount of
functionality (auth, storage, CI, permissions, web IDE) for almost no
implementation cost, which is a rational choice for a small research
team. The price is hard vendor coupling, an execution model
constrained to CI pipeline semantics, and a security model bounded by
what GitLab OAuth scopes can express. The "backend abstraction" in
`lib/dt-automation/src/` has exactly one implementation, and its
interfaces leak GitLab concepts such as pipelines and trigger tokens.

**Putting lifecycle logic in the client** avoided building and
operating a lifecycle service. The price is that there is no headless
API (a CLI or a scheduled job cannot execute a DT without a browser),
state dies with the browser profile, trigger tokens are handled in
browser memory, and every open tab generates its own polling load.

**Perimeter-only security** kept the microservices simple. The price
is that a single misconfigured Traefik rule, or any foothold inside
the docker network, reaches unauthenticated services, including one
whose purpose is to execute shell commands.

**Users as compose services** made multi-user hosting possible with
plain docker compose. The price is O(users) compose definitions, a
restart of the stack topology to add users, no per-user resource
quotas in the base scenarios, and a hard ceiling well below "as a
Service" scale.

## Scale and Reliability Posture

The platform services hold no state that matters for load (libms is
stateless over mounted files and the runner runs per workspace), so the
practical limits are the single Traefik instance, the single GitLab
instance and the per-user container model. The single points of
failure are Traefik, forward-auth and GitLab. The platform has no
health, metrics or alerting support: no `/health` endpoints, no
metrics export and no structured audit log of user actions (see
[SI-8](systemic-issues.md#si-8-no-observability-plane)). This is
tolerable at current deployment sizes (tens of users per host), and it
is the first thing to revisit if institutional deployments grow.
