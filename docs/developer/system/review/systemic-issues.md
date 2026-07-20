# Systemic Issues

These are cross-cutting issues: patterns that recur across packages,
survive individual refactorings, and shape what the platform can
become. Each is stated with evidence and consequence; remedies are in
[Improvement Proposals](improvements.md).

## SI-1: Documented vs implemented architecture

The [architecture page](../architecture.md) presents a
microservice architecture with a service mesh, security (RBAC),
accounting, DT lifecycle manager, and execution manager. Four of
these components do not exist in any form in the codebase, and the
implemented system (edge-auth + three services + GitLab) has a very
different security and data topology. The page's own component table
admits three gaps ("Not available yet"), but the prose and diagrams
above it describe the aspirational system as if current.

*Consequence:* new contributors and evaluating adopters form a wrong
model of the system; design discussions argue from components that do
not exist; the genuinely implemented architecture (which is defensible
on its own terms) is nowhere written down. The
[current-status page](../current-status.md) partially compensates but
does not describe topology.

## SI-2: GitLab is a hard dependency, not a backend choice

Identity, asset storage, DT execution, and authorisation all resolve
to GitLab. The client's backend abstraction has one implementation
whose interface leaks GitLab vocabulary (trigger tokens, pipelines);
forward-auth is configured against GitLab OAuth URLs; the DevOps
integration assumes GitLab CI semantics; even the services CLI ships
a GitLab compose template. There is no seam at which a different
provider could be inserted without touching every layer.

*Consequence:* every GitLab breaking change is a platform breaking
change; institutions that run GitHub/Gitea/plain-git infrastructure
cannot adopt DTaaS without also adopting GitLab; the execution model
is permanently constrained to CI-pipeline semantics (batch, per-commit
refs, runner scheduling) even where DTs need long-running or
interactive execution.

## SI-3: The browser is the platform

DT lifecycle orchestration, pipeline polling, log aggregation, and the
only persistent record of executions (IndexedDB) live in the React
client. The platform's own servers neither mediate nor observe DT
executions.

*Consequence:* no headless automation (CLI, cron, external system)
can run a DT; execution history is per-browser-profile and cannot
back auditing, accounting, or the "Save" requirement; closing a tab
orphans in-flight orchestration; secrets (trigger tokens) transit
browser memory; and the unbuilt Lifecycle Manager (SI-1) grows harder
to introduce because its logic keeps accreting client-side, in
TypeScript coupled to React state.

## SI-4: Perimeter-only trust

Exactly one enforcement point (Traefik + forward-auth) protects every
service. libms (including cloudcmd file management), the runner
(command execution), and workspace containers accept any request that
reaches them. Authorisation granularity is path-prefix. The
forward-auth component is a third-party image pulled at `:latest`.

*Consequence:* the blast radius of one routing misconfiguration, one
compromised container on the docker network, or one forward-auth
regression is the entire platform, including arbitrary (whitelisted)
command execution in workspaces. Defence-in-depth is absent by
design, not by accident, and nothing in the codebase currently
provides a second layer to turn on.

## SI-5: Static, file-edited user model

Users are docker compose services generated from templates by the
CLI. Provisioning requires host filesystem access and stack
reconciliation; per-user resources are unbounded in the base
scenarios.

*Consequence:* scale is capped at compose-file size and single-host
capacity; onboarding cannot be self-service or API-driven; quota and
accounting (a stated commercialisation prerequisite) have no
enforcement point. This is the concrete form of the missing Execution
Manager.

## SI-6: Sprawling deployment and configuration matrix

Four docker scenarios × integrated-or-external GitLab × Vagrant
variants, two Python CLIs that both generate compose files, and at
least four configuration mechanisms (`env.js` runtime injection,
`.env` files, YAML service configs, `dtaas.toml`). Documentation
covers each cell, but CI does not, and drift is already observable
between cells.

*Consequence:* maintenance effort scales with the matrix rather than
with features; every release must be manually reasoned through N
scenarios; users on the less-travelled paths find breakage first.

## SI-7: Release engineering gaps

Compose scenarios pin superseded image versions (`dtaas-web:1.0.2`
vs released 1.3.0; `libms:0.5.9` vs 0.5.11); one security-critical
image floats on `:latest`; a test library (`mock-fs`) ships in libms
production dependencies; versions across npm, Docker Hub, PyPI, and
compose files are coordinated by hand.

*Consequence:* "install from the repo" and "install the release"
give different systems; supply-chain exposure via the floating tag;
image bloat and needless attack surface from misplaced dependencies.

## SI-8: No observability plane

No platform service exposes health or metrics endpoints; there is no
structured audit log of user or DT activity; monitoring guidance is
absent from the admin docs. The only operational signals are container
logs and GitLab's own UI.

*Consequence:* operators discover failures from user reports;
accounting (SI-5) has no data source; SLO-style operation of an
institutional deployment is not possible.

## Interdependency Map

The issues are not independent. SI-2 and SI-3 jointly block the
Lifecycle/Execution managers whose absence constitutes SI-1; SI-5 and
SI-8 jointly block accounting; SI-4 is cheap to fix only while the
service count is small (i.e. before fixing SI-1 adds services).
The dependency order matters for sequencing and is used to prioritise
the [improvement proposals](improvements.md):

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
