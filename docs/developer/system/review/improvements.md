# Improvement Proposals

Prioritised, incremental proposals. Each names the systemic issues it
addresses, sketches a migration path that never requires a big-bang
rewrite, and states the trade-off being accepted. Priorities: **P1**
(do next, unblocks the rest), **P2** (do after P1 seams exist),
**P3** (continuous or opportunistic).

## I-1 (P1): Introduce a minimal DT Lifecycle service

*Addresses SI-1, SI-3; enables I-2, I-4, I-7.*

Create the first real increment of the documented DT Lifecycle
Manager: a small NestJS service (matching existing team skills and
the libms/runner idioms) that owns the verbs
`start / stop / status / logs / history` for DT executions and, in
its first version, implements them by calling GitLab exactly as the
client does today — the orchestration code in
`client/src/model/backend/gitlab/execution/` is a de facto
specification and can be ported nearly mechanically.

Migration path: (1) stand the service up behind Traefik next to
libms; (2) port pipeline start/poll/log logic from the client;
(3) switch the client's `BackendInterface` implementation to call the
lifecycle service instead of GitLab, deleting gitbeaker from the
browser bundle; (4) trigger tokens move server-side. The client's
existing abstraction is exactly the right cut point — this is the
payoff for having built it.

Trade-off: one more service to deploy and operate, and the browser↔
GitLab direct path (which currently offloads all traffic) becomes
platform traffic. Accepted because every further platform capability
(headless API, history, accounting, quotas) needs this seam.

## I-2 (P1): Server-side execution history

*Addresses SI-3, SI-8; prerequisite for accounting.*

Give the lifecycle service a persistent store (SQLite per deployment
is sufficient initially; the schema in
`client/src/database/executionHistoryDB.ts` is a starting point) and
record every execution with user, DT, timestamps, and outcome.
Keep IndexedDB as an offline cache if desired, but the server becomes
the source of truth. This simultaneously produces the audit trail
that SI-8 notes is missing.

Trade-off: introduces the platform's first stateful service —
backup/restore now needs a sentence in the admin docs. Accepted;
IndexedDB-as-system-of-record is not defensible for a multi-user
platform.

## I-3 (P1): Second security layer behind the perimeter

*Addresses SI-4.*

Three cheap, independent steps: (1) validate the forward-auth-issued
identity at each service — forward-auth already forwards
`X-Forwarded-User`; services should reject requests without it, and
the header should be stripped at the Traefik edge so it cannot be
spoofed from outside; (2) add a shared-secret or JWT check to the DT
Runner (it executes commands; it must not be open); (3) replace
`thomseddon/traefik-forward-auth:latest` with a maintained,
version-pinned equivalent (e.g. oauth2-proxy), or at minimum pin a
digest. A small shared NestJS guard package keeps this uniform across
libms, runner, and the new lifecycle service.

Trade-off: slightly more configuration per service and a migration
note for existing deployments. No architectural cost — this is
defence-in-depth the current design simply omits.

## I-4 (P2): Reshape the backend abstraction around lifecycle verbs

*Addresses SI-2.*

After I-1, the GitLab vocabulary (pipelines, trigger tokens, refs)
lives in exactly one adapter inside the lifecycle service. Define the
provider interface there in DT terms (`execute(dt, config)`,
`status(execution)`, `logs(execution)`), keeping GitLab as the
reference implementation. Do **not** build a second provider
speculatively; the goal is that the seam exists and is honest, so a
Gitea/GitHub/local-executor provider is a bounded project when a
concrete adopter needs one.

Trade-off: abstraction maintenance without a second implementation to
validate it. Mitigated by deriving the interface from real verbs
already in use, not from anticipated generality.

## I-5 (P2): Collapse the deployment matrix

*Addresses SI-6, SI-7.*

Declare the new DTaaS CLI (`cli/`) the single supported entry point
for platform deployment, and make the four docker scenario
directories generated artifacts (or examples explicitly marked
frozen) rather than hand-maintained parallel truths. Fold the
overlap between `cli/` and `deploy/services/cli/` by making the
services CLI a dependency invoked by the platform CLI, or merging the
packages. In CI, add one composed smoke test: bring up the localhost
scenario via the CLI, log in, list library assets, run one trivial DT
— this single job catches the cross-package breakage the per-package
workflows structurally cannot.

Trade-off: scenario flexibility narrows and some existing
installation habits break; a deprecation cycle across one release is
needed. Accepted: the matrix is the project's largest silent
maintenance cost.

## I-6 (P2): Release-time consistency checks

*Addresses SI-7.*

Automate what is currently manual coordination: a release workflow
step that (1) rewrites image tags in the (generated, post-I-5)
compose scenarios to the versions being released; (2) fails on any
`:latest` tag; (3) runs `npm pkg`-level checks such as "no test
libraries in `dependencies`" (moves `mock-fs` to devDependencies in
libms immediately, independent of the rest). These are hours of CI
work, not a project.

## I-7 (P3): Quotas and the path to the Execution Manager

*Addresses SI-5; depends on I-1, I-2.*

Near term: add CPU/memory limits to workspace container templates —
one line per service, immediate protection for shared hosts. Medium
term: once the lifecycle service records executions (I-2), quota
enforcement has both a data source and an enforcement point, and
"users as data" (an API-driven provisioner wrapping the docker API,
replacing compose-file rewriting) becomes the first real slice of the
Execution Manager. Defer any Kubernetes discussion until a deployment
actually exceeds one host; compose + limits is the right tool at
current scale.

## I-8 (P3): Truth-first documentation and ADRs

*Addresses SI-1.*

Restructure the architecture page into "Implemented architecture"
(the recovered diagram in the
[architecture review](architecture-review.md) can seed it) and
"Target architecture", with the component table's status column made
prominent. Record the load-bearing decisions that are currently
implicit — GitLab as backend, perimeter auth, users-as-services,
browser-side orchestration — as short ADRs (the repo has no `adr/`
directory today), so future contributors can distinguish "chosen,
with reasons" from "accreted". This proposal costs writing time only
and can begin immediately.

## Observability note (cross-cutting)

Fold into I-1/I-3 rather than a separate project: every service gains
a `/health` endpoint (NestJS Terminus is one dependency), and the
lifecycle service logs structured events. Grafana is already in the
supported services list — pointing it at the platform's own signals
closes SI-8 with tooling admins already deploy.

## What to Revisit as the System Grows

Signals that should trigger re-evaluation of decisions this review
otherwise endorses: more than ~50 workspaces on a host or any
multi-host deployment (revisit compose-based provisioning, I-7);
a concrete non-GitLab adopter (fund the second provider, I-4);
commercial accounting requirements (the SQLite of I-2 becomes
Postgres and event-shaped); interactive/long-running DT execution
needs (the CI-pipeline execution model itself, not just its location,
becomes the constraint — that is a larger redesign and should get its
own ADR when it arrives).
