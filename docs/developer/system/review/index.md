# Architectural and Design Review

This section contains an independent architectural and design review of
the DTaaS codebase, performed against the `feature/distributed-demo`
branch (commit `e7f9dd6`, July 2026).

## Scope and Method

The review covers the five deliverable packages of the monorepo and the
deployment scenarios that bind them together:

| Package | Path | Technology |
| :------ | :--- | :--------- |
| React client | `client/` | React 19, Redux Toolkit, oidc-client-ts |
| Library microservice | `servers/lib/` | NestJS, GraphQL (Apollo), cloudcmd |
| DT Runner | `servers/execution/runner/` | NestJS, REST, execa |
| DTaaS CLI | `cli/` | Python, click, python-on-whales |
| Services manager | `deploy/services/cli/` | Python (dtaas-services) |
| Deployment scenarios | `deploy/dtaas/docker/`, `deploy/vagrant/` | Traefik, docker compose |

The method followed a standard system-design review framework:
requirements traceability, high-level architecture recovery from code
and deployment artifacts, per-component deep dives, and a cross-cutting
analysis of scale, reliability, and security. Findings were verified
against source files; each claim in these documents cites the file it
was observed in.

## Documents

1. [Architecture Review](architecture-review.md) — the architecture as
   actually implemented, recovered from code and compose files, with
   data flows and trade-off analysis.
1. [Design Review](design-review.md) — component-level review of the
   client, microservices, CLIs, and deployment tooling.
1. [Systemic Issues](systemic-issues.md) — cross-cutting issues that
   recur across components and releases, with evidence.
1. [Improvement Proposals](improvements.md) — prioritised, incremental
   recommendations with migration paths and explicit trade-offs.

## Summary Verdict

DTaaS has a clear product vision, unusually good documentation for a
research platform, and healthy test investment in the client. The
dominant architectural risks are concentrated in four areas: the gap
between the documented and the implemented architecture, the
delegation of core platform logic (DT lifecycle, execution, state) to
the browser and to GitLab, a perimeter-only security model in which
internal services trust the network, and a static per-user deployment
model that limits scale. None of these is fatal; all four are
addressable incrementally, and concrete paths are proposed in the
[improvements](improvements.md) document.
