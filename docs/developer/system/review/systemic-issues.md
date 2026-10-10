# Systemic Issues

These issues cut across packages. They recur in several packages,
survive individual refactorings and shape what the platform can
become. Each is stated with evidence and consequences; the remedies are
in [Improvement Proposals](improvements.md).

## SI-1: Documented vs implemented architecture

The [architecture page](../architecture.md) presents a microservice
architecture with a service mesh, security (RBAC), accounting, a DT
lifecycle manager and an execution manager. None of these five
components exists in any form in the codebase, and the implemented system
(edge auth, three services and GitLab) has a very different security
and data topology. The page's own component table admits three gaps
("Not available yet"), but the prose and diagrams above it describe
the planned system as if it were current.

*Consequence:* new contributors and adopters evaluating the platform
form a wrong model of the system, and design discussions argue from
components that do not exist. The architecture that is actually
implemented, which is defensible on its own terms, is not written down
anywhere. The [current-status page](../current-status.md) partly
compensates but does not describe the topology.

## SI-2: GitLab is a hard dependency, not a backend choice

Identity, asset storage, DT execution and authorisation all resolve to
GitLab. The client's backend abstraction has one implementation whose
interface leaks GitLab vocabulary (trigger tokens, pipelines).
Forward-auth is configured against GitLab OAuth URLs, the DevOps
integration assumes GitLab CI semantics, and even the services CLI
ships a GitLab compose template. There is no seam where a different
provider could be inserted without touching every layer.

*Consequence:* every GitLab breaking change is a platform breaking
change. Institutions that run GitHub, Gitea or plain git cannot adopt
DTaaS without also adopting GitLab. The execution model is permanently
constrained to CI pipeline semantics (batch jobs, per-commit refs,
runner scheduling), even where DTs need long-running or interactive
execution.

## SI-3: The browser is the platform

DT lifecycle orchestration, pipeline polling, log aggregation and the
only persistent record of executions (IndexedDB) live in the React
client. The platform's own servers neither mediate nor observe DT
executions.

*Consequence:* no headless automation (CLI, cron job, external system)
can run a DT. Execution history is stored per browser profile and
cannot support auditing, accounting or the "Save" requirement. Closing
a tab orphans in-flight orchestration, and secrets (trigger tokens)
pass through browser memory. The unbuilt Lifecycle Manager (SI-1) also
becomes harder to introduce, because its logic keeps accumulating
client-side in TypeScript coupled to React state.

## SI-4: Perimeter-only trust

A single enforcement point (Traefik with forward-auth) protects every
service. libms (including cloudcmd file management), the runner
(command execution) and the workspace containers accept any request
that reaches them. Authorisation works at the granularity of path
prefixes. The forward-auth component is a third-party image pulled at
`:latest`.

*Consequence:* one routing misconfiguration, one compromised container
on the docker network or one forward-auth regression exposes the
entire platform, including arbitrary (whitelisted) command execution
in workspaces. The design has no defence in depth, and nothing in the
codebase currently provides a second layer that could be turned on.

## SI-5: Static, file-edited user model

Users are docker compose services that the CLI generates from
templates. Provisioning requires access to the host file system and a
reconciliation of the stack, and per-user resources are unbounded in
the base scenarios.

*Consequence:* scale is capped by compose-file size and the capacity
of a single host. Onboarding cannot be self-service or API-driven.
Quotas and accounting (a stated prerequisite for commercialisation)
have no enforcement point. This is the concrete form of the missing
Execution Manager.

## SI-6: Sprawling deployment and configuration matrix

The matrix spans four docker scenarios, each with integrated or
external GitLab, plus Vagrant variants. Two Python CLIs both generate
compose files, and there are at least four configuration mechanisms
(`env.js` runtime injection, `.env` files, YAML service configs,
`dtaas.toml`). The documentation covers each cell, CI does not, and
drift between cells is already visible.

*Consequence:* maintenance effort grows with the matrix rather than
with features. Every release must be reasoned through N scenarios by
hand, and users on the less common paths find the breakage first.

## SI-7: Release engineering gaps

Compose scenarios pin superseded image versions (`dtaas-web:1.0.2`
against the released 1.3.0; `libms:0.5.9` against 0.5.11). One
security-critical image floats on `:latest`. A test library
(`mock-fs`) ships in the libms production dependencies. Versions
across npm, Docker Hub, PyPI and the compose files are coordinated by
hand.

*Consequence:* installing from the repository and installing the
release give different systems. The floating tag creates supply-chain
exposure, and misplaced dependencies bloat images and widen the attack
surface.

## SI-8: No observability plane

No platform service exposes health or metrics endpoints, there is no
structured audit log of user or DT activity, and the admin docs give
no monitoring guidance. The only operational signals are container
logs and GitLab's own UI.

*Consequence:* operators learn about failures from user reports,
accounting (SI-5) has no data source, and SLO-style operation of an
institutional deployment is not possible.

## Interdependency Map

The issues depend on each other. SI-2 and SI-3 together block the
Lifecycle and Execution managers whose absence makes up SI-1. SI-5 and
SI-8 together block accounting. SI-4 is cheap to fix only while the
number of services is small, that is, before fixing SI-1 adds
services. The
[improvement proposals](improvements.md) are prioritised in this
dependency order:

```text
SI-3 (browser logic) ──► fix first: creates the server-side seam
    │
    ├──► enables server-side history/audit ──► SI-8, then SI-5 quotas
    │
    └──► shrinks GitLab surface area ──► makes SI-2 tractable
SI-4 (perimeter trust) ── fix in parallel: cheapest now
SI-6/SI-7 (matrix, releases) ── continuous reduction, CI-enforced
SI-1 (docs) ── fix immediately: writing, not engineering
```
