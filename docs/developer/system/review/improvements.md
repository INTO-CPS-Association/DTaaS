# Improvement Proposals

These proposals are prioritised and incremental. Each names the
systemic issues it addresses, sketches a migration path that avoids a
big-bang rewrite, and states the trade-off it accepts. The priorities
are **P1** (do next; unblocks the rest), **P2** (do after the P1 seams
exist) and **P3** (continuous or opportunistic).

## I-1 (P1): Introduce a minimal DT Lifecycle service

*Addresses SI-1, SI-3; enables I-2, I-4, I-7.*

Create the first real increment of the documented DT Lifecycle
Manager: a small NestJS service (matching the team's existing skills
and the libms and runner idioms) that owns the verbs
`start / stop / status / logs / history` for DT executions. Its first
version implements them by calling GitLab exactly as the client does
today. The orchestration code in
`lib/dt-automation/src/gitlab/execution/` serves as a de facto
specification and can be ported almost mechanically.

Migration path: (1) stand the service up behind Traefik next to libms;
(2) port the pipeline start, poll and log logic from the client;
(3) switch the client's `BackendInterface` implementation to call the
lifecycle service instead of GitLab, removing gitbeaker from the
browser bundle; (4) move trigger tokens server-side. The client's
existing abstraction is the right cut point, and this is where
building it pays off.

Trade-off: one more service to deploy and operate, and the direct
path from browser to GitLab, which currently keeps that traffic off
the platform, becomes platform traffic. This is accepted because every
further platform capability (headless API, history, accounting,
quotas) needs this seam.

## I-2 (P1): Server-side execution history

*Addresses SI-3, SI-8; prerequisite for accounting.*

Give the lifecycle service a persistent store (SQLite per deployment
is enough at first; the schema in
`client/src/database/executionHistoryDB.ts` is a starting point) and
record every execution with user, DT, timestamps and outcome. IndexedDB
can stay as an offline cache, but the server becomes the source of
truth. This also produces the audit trail that SI-8 notes is missing.

Trade-off: this introduces the platform's first stateful service, so
the admin docs need a note on backup and restore. This is accepted,
because IndexedDB cannot serve as the system of record for a
multi-user platform.

## I-3 (P1): Second security layer behind the perimeter

*Addresses SI-4.*

Three cheap, independent steps:

1. Validate the identity issued by forward-auth at each service.
   Forward-auth already forwards `X-Forwarded-User`; services should
   reject requests without it, and the Traefik edge should strip the
   header so that it cannot be spoofed from outside.
1. Add a shared-secret or JWT check to the DT Runner. It executes
   commands, so it must not be open.
1. Replace `thomseddon/traefik-forward-auth:latest` with a maintained,
   version-pinned equivalent (for example oauth2-proxy), or at least
   pin a digest.

A small shared NestJS guard package keeps this uniform across libms,
the runner and the new lifecycle service.

Trade-off: slightly more configuration per service and a migration
note for existing deployments. There is no architectural cost; the
current design simply omits this defence in depth.

## I-4 (P2): Reshape the backend abstraction around lifecycle verbs

*Addresses SI-2.*

After I-1, the GitLab vocabulary (pipelines, trigger tokens, refs)
lives in exactly one adapter inside the lifecycle service. Define the
provider interface there in DT terms (`execute(dt, config)`,
`status(execution)`, `logs(execution)`) and keep GitLab as the
reference implementation. Do **not** build a second provider
speculatively. The goal is an honest seam, so that a Gitea, GitHub or
local-executor provider becomes a bounded project when a concrete
adopter needs one.

Trade-off: the abstraction has to be maintained without a second
implementation to validate it. Deriving the interface from verbs
already in use, rather than from anticipated generality, reduces this
risk.

## I-5 (P2): Collapse the deployment matrix

*Addresses SI-6, SI-7.*

Declare the new DTaaS CLI (`cli/`) the single supported entry point for
platform deployment, and turn the four docker scenario directories into
generated artifacts (or examples explicitly marked as frozen) instead
of parallel copies maintained by hand. Remove the overlap between
`cli/` and `deploy/services/cli/`, either by making the services CLI a
dependency that the platform CLI invokes or by merging the packages. In
CI, add one composed smoke test: bring up the localhost scenario via
the CLI, log in, list library assets and run one trivial DT. This
single job catches the cross-package breakage that per-package
workflows cannot detect.

Trade-off: scenario flexibility narrows and some existing installation
habits break, so a deprecation cycle of one release is needed. This is
accepted because the matrix is the project's largest hidden
maintenance cost.

## I-6 (P2): Release-time consistency checks

*Addresses SI-7.*

Automate what is currently coordinated by hand. Add a release workflow
step that (1) rewrites image tags in the compose scenarios (generated,
after I-5) to the versions being released; (2) fails on any `:latest`
tag; (3) runs `npm pkg`-level checks such as "no test libraries in
`dependencies`". Moving `mock-fs` to devDependencies in libms can
happen immediately, independent of the rest. These steps take hours of
CI work.

## I-7 (P3): Quotas and the path to the Execution Manager

*Addresses SI-5; depends on I-1, I-2.*

In the near term, add CPU and memory limits to the workspace container
templates. This takes one line per service and protects shared hosts
immediately. In the medium term, once the lifecycle service records
executions (I-2), quota enforcement has both a data source and an
enforcement point. "Users as data" (an API-driven provisioner wrapping
the docker API, replacing compose-file rewriting) then becomes the
first real slice of the Execution Manager. Defer any discussion of
Kubernetes until a deployment outgrows one host; compose with limits
is the right tool at current scale.

## I-8 (P3): Truth-first documentation and ADRs

*Addresses SI-1.*

Restructure the architecture page into "Implemented architecture" (the
recovered diagram in the
[architecture review](architecture-review.md) can seed it) and "Target
architecture", and make the status column of the component table
prominent. Record the load-bearing decisions that are currently
implicit (GitLab as backend, perimeter auth, users as services,
browser-side orchestration) as short ADRs. The repository has no
`adr/` directory today. ADRs let future contributors tell decisions
made for stated reasons from ones that accumulated. This proposal costs
only writing time and can begin immediately.

## Observability note (cross-cutting)

Fold this into I-1 and I-3 instead of running a separate project:
every service gains a `/health` endpoint (NestJS Terminus is one
dependency), and the lifecycle service logs structured events. Grafana
is already in the list of supported services, so pointing it at the
platform's own signals closes SI-8 with tooling that admins already
deploy.

## What to Revisit as the System Grows

These signals should trigger a re-evaluation of decisions that this
review otherwise endorses:

- more than about 50 workspaces on a host, or any multi-host
  deployment (revisit compose-based provisioning, I-7);
- a concrete non-GitLab adopter (fund the second provider, I-4);
- commercial accounting requirements (the SQLite store of I-2 becomes
  Postgres and event-shaped);
- a need for interactive or long-running DT execution. Then the
  CI pipeline execution model itself becomes the constraint, not just
  where it runs. That is a larger redesign and should get its own ADR
  when it arrives.
