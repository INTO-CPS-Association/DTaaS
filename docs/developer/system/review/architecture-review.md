# Architecture Review (As Implemented)

The existing [architecture page](../architecture.md) describes the
intended architecture. This page documents the architecture that the
code and deployment artifacts actually realise today, because the two
differ in important ways; see systemic issue
[SI-1](systemic-issues.md#si-1-documented-vs-implemented-architecture).

## Requirements Traceability

The architecture page lists eight user requirements. Their current
implementation status, recovered from code:

| Requirement | Status | Implemented by |
| :---------- | :----- | :------------- |
| Author | Implemented | User workspaces (containers), integrated GitLab |
| Consolidate | Implemented | Library microservice, client library pages |
| Configure | Partial | Client editors (`client/src/route/digitaltwins/editor`, Monaco) |
| Execute | Partial | GitLab CI pipelines triggered from the browser; DT Runner |
| Explore | Partial | Client DevOps pages, IndexedDB execution history |
| Save | Not implemented | — |
| Services | Implemented | dtaas-services CLI (MQTT, InfluxDB, Grafana, …) |
| Share | Partial | GitLab group/project visibility; common library files |

Components named in the architecture but absent from the codebase:
DT Lifecycle Manager, DT Execution Manager, Accounting microservice,
Security microservice (RBAC), and a service mesh. The architecture
page's own component table already marks three of these "Not
available yet"; the review confirms no partial implementations exist
either.

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

Three facts define this architecture, and none of them appears in the
intended-architecture diagram:

1. **GitLab is the de facto platform backend.** It provides identity
   (OAuth), asset and DT storage (repositories), the execution engine
   (CI pipelines and runners), and authorisation boundaries (group and
   project membership). Evidence: `client/src/model/backend/gitlab/`
   implements pipeline start/cancel/log-fetch against the GitLab REST
   API; `deploy/dtaas/docker/*/docker-compose.yml` wires
   `traefik-forward-auth` to GitLab OAuth endpoints.

1. **The browser is the DT lifecycle manager.** Orchestration —
   resolving projects, fetching trigger tokens, starting pipelines,
   polling status, collecting logs — runs client-side
   (`client/src/model/backend/gitlab/execution/pipelinePolling.ts`,
   `instance.ts`). Execution history is persisted in the browser's
   IndexedDB (`client/src/database/executionHistoryDB.ts`), so the
   platform itself holds no record of DT executions.

1. **Security is perimeter-only.** Traefik routes by path prefix and
   `traefik-forward-auth` authenticates at the edge. Behind the
   perimeter, no service authenticates its callers: the library
   microservice exposes GraphQL and cloudcmd without authentication
   checks (`servers/lib/src/` contains no auth middleware), and the DT
   Runner executes configured commands for any caller
   (`servers/execution/runner/src/app.controller.ts`).

## Data Flows

**DT execution flow (primary flow):** user clicks Execute → client
resolves GitLab project ID and trigger token → client starts a GitLab
CI pipeline with variables → client polls pipeline/job status →
client fetches job logs → results written to browser IndexedDB.
The platform's servers are not in this loop at all; a network
observer sees browser↔GitLab traffic only.

**Asset flow:** library assets live either on the filesystem mounted
into `libms` (local backend) or in git repositories (git backend,
`servers/lib/src/files/git/git-files.service.ts` using
isomorphic-git). The client queries them over GraphQL and renders
file trees; cloudcmd provides direct file management.

**User provisioning flow:** an admin runs the Python CLI (`cli/`),
which rewrites docker compose files from templates to add or remove
per-user workspace services, then reconciles the running deployment
via python-on-whales. Users are compose services, not data.

## Trade-off Analysis of the Current Architecture

The current shape is not accidental; it buys real things. The review's
job is to make the price explicit.

**Delegating the backend to GitLab** bought the team an enormous
amount of functionality (auth, storage, CI, permissions, web IDE) for
near-zero implementation cost — a rational choice for a small research
team. The price is hard vendor coupling (the "backend abstraction" in
`client/src/model/backend/` has exactly one implementation and its
interfaces leak GitLab concepts such as pipelines and trigger tokens),
an execution model constrained to CI-pipeline semantics, and a
security model bounded by what GitLab OAuth scopes can express.

**Putting lifecycle logic in the client** avoided building and
operating a lifecycle service. The price: no headless API (a CLI or a
scheduled job cannot execute a DT without a browser), state that dies
with the browser profile, trigger tokens handled in browser memory,
and polling load generated per open tab.

**Perimeter-only security** kept the microservices simple. The price:
a single misconfigured Traefik rule or any foothold inside the docker
network reaches unauthenticated services, including one whose purpose
is to execute shell commands.

**Users as compose services** made multi-user hosting achievable with
plain docker compose. The price: O(users) compose definitions, restart
of the stack topology to add users, no resource quotas per user in the
base scenarios, and a hard ceiling well below "as a Service" scale.

## Scale and Reliability Posture

There is no load-relevant state in the platform services themselves
(libms is stateless over mounted files; runner is per-workspace), so
the practical limits are the single Traefik instance, the single
GitLab instance, and the per-user container model. Single points of
failure: Traefik, forward-auth, GitLab. There is no platform-level
health/metrics/alerting story: no `/health` endpoints, no metrics
export, no structured audit log of user actions (see
[SI-8](systemic-issues.md#si-8-no-observability-plane)). For the
current deployment sizes (tens of users per host) this is tolerable;
it is the first thing to revisit if institutional deployments grow.
