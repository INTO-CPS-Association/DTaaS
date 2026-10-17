# Architectural and Design Review

This section contains an independent architectural and design review of
the DTaaS codebase, performed against the `feature/distributed-demo`
branch (commit `e7f9dd6`, July 2026). The findings describe the
codebase at that commit.

## Scope and Method

The review covers the five deliverable packages of the monorepo, and
the deployment scenarios that bind them together (the last row):

| Package | Path | Technology |
| :------ | :--- | :--------- |
| React client | `client/` | React 19, Redux Toolkit, oidc-client-ts |
| Library microservice | `servers/lib/` | NestJS, GraphQL (Apollo), cloudcmd |
| DT Runner | `servers/execution/runner/` | NestJS, REST, execa |
| DTaaS CLI | `cli/` | Python, click, python-on-whales |
| Services manager | `deploy/services/cli/` | Python, click (dtaas-services) |
| Deployment scenarios | `deploy/dtaas/docker/`, `deploy/vagrant/` | Traefik, docker compose |

The review followed a standard system design review framework:
requirements traceability, recovery of the high-level architecture from
code and deployment artifacts, deep dives into each component, and an
analysis of scale, reliability and security across components. Each
finding was checked against the source files, and each claim in these
documents cites the file it was observed in.

## Documents

1. [Architecture Review](architecture-review.md): the architecture as
   implemented, recovered from code and compose files, with data flows
   and trade-off analysis.
1. [Design Review](design-review.md): component-level review of the
   client, microservices, CLIs and deployment tooling.
1. [Systemic Issues](systemic-issues.md): issues that recur across
   components and releases, with evidence.
1. [Improvement Proposals](improvements.md): prioritised, incremental
   recommendations with migration paths and explicit trade-offs.

## Changes Since the Review

The findings are kept as written at commit `e7f9dd6`. These statements
in them no longer describe the current branch:

- *Packages.* Three packages added since then are not reviewed: the
  logger microservice (`servers/logger/`), the DT automation library
  (`lib/dt-automation/`) and the shared GitLab Python library
  (`lib/gitlab_common/`).
- *Services.* The platform now runs three backend services: the
  library microservice, the DT Runner and the logger microservice.
- *Image pins.* The docker compose files now pin
  `intocps/dtaas-web:1.7.2` and `intocps/libms:0.5.13` (at the review:
  `1.0.2` and `0.5.9`), and add `intocps/logger-ms`.
- *Observability.* The logger microservice exposes `GET /logger/health`
  and writes workflow events as JSON Lines
  (`logs/workflow-logs.jsonl` by default). The library microservice and
  the runner still have no health endpoint.
- *CI.* The `workspace.yml` workflow is gone, and `logger-ms.yml`,
  `dt-automation.yml`, `gitlab-common.yml`, `docs-publish.yml` and
  `qlty.yml` have been added.
- *Resource limits.* Users added through the DTaaS CLI get CPU, memory
  and process limits from the `[common.resources]` section of
  `dtaas.toml` (`cli/src/templates/users.resources.yml`). The finding
  on missing limits applies to the users defined directly in the base
  compose files.

## Summary Verdict

DTaaS has a clear product vision, unusually good documentation for a
research platform and substantial test investment in the client. The
main architectural risks are concentrated in four areas:

- the gap between the documented and the implemented architecture;
- the delegation of core platform logic (DT lifecycle, execution,
  state) to the browser and to GitLab;
- a perimeter-only security model in which internal services trust
  the network;
- a static per-user deployment model that limits scale.

None of these is fatal. All four can be addressed incrementally, and
the [improvements](improvements.md) document proposes concrete paths.
