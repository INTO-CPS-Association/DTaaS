# DTaaS Services CLI — Unified `<noun> <verb>` Command Design

## Purpose

This document defines a consistent command grammar for the **`dtaas-services`**
CLI — the tool that manages the DTaaS platform's third-party services (InfluxDB,
Grafana, RabbitMQ, MongoDB, ThingsBoard with its PostgreSQL backend, and
GitLab).

It applies the same principle adopted for the deployment CLI:

```
dtaas-services <noun> <verb> [target] [flags]
```

Every command names **what it acts on** (the noun) and then **what to do**
(the verb). The aims are to remove the mixed command styles the tool has
accumulated, to give service lifecycle operations a predictable shape, and to
align with the conventions in [clig.dev](https://clig.dev/#subcommands) and in
`git`/`docker`.

This is a companion to the deployment-CLI design and uses the same rules, so the
two CLIs feel like one family.

---

## 1. The problem: three grammars in one CLI

Like the deployment CLI, `dtaas-services` currently mixes three shapes.

**1a. Top-level hyphenated verb-noun**

```
dtaas-services generate-project [--path <dir>]
```

Verb first, noun glued on with a hyphen.

**1b. Flat top-level verbs**

```
dtaas-services setup
dtaas-services install   [-s <service>]
dtaas-services start     [-s <services>]
dtaas-services stop      [-s <services>]
dtaas-services restart   [-s <services>]
dtaas-services status    [-s <services>]
dtaas-services remove    [-s <services>] [-v]
dtaas-services clean     [-s <services>] [--certs]
```

Eight bare verbs on the root group. The object acted on (the services) is
implicit; `setup` and `install` are different *kinds* of action (host
provisioning vs. per-service schema init) but read as peers of `start`/`stop`.

**1c. Noun-grouped verbs**

```
dtaas-services user add            [-s <services>]
dtaas-services user reset-password [-s <services>]
```

`user` is a noun; the verb follows. This is the shape wanted everywhere — but
only one group uses it today.

### Why this matters

- **Discoverability / guessability.** clig.dev: *"a CLI should follow patterns
  that already exist… that's what makes CLIs guessable."* A user who learns
  `user add` reasonably expects `service start`, but the real command is the
  top-level `start`. The mental model does not transfer between the two halves
  of the tool.
- **Scope and kind are invisible.** `start`, `stop`, `restart`, `status`,
  `remove`, `clean` all act on service *containers*; `setup` acts on the *host*
  (certs, permissions, needs root); `install` acts on a service's *database
  schema*. Flattened together, nothing signals these three very different blast
  radii.
- **Similarly-named commands.** clig.dev: *"Don't have ambiguous or
  similarly-named commands."* `setup` vs. `install` vs. `generate-project` are
  three setup-flavored verbs at the top level whose differences only become
  clear after reading each help text.
- **Split target conventions.** Every operational command already shares one
  target flag — `--services/-s` with a comma-separated list — which is a good,
  consistent base to build the noun on.

---

## 2. The unifying rule

> **Every command is `dtaas-services <noun> <verb>`.** The noun is the resource.
> The verb is the action. Flags refine; they never replace the verb.

This is clig.dev's recommended pattern for multi-level CLIs (*"one is a noun and
one is a verb… `docker container create`… `noun verb` seems to be more
common"*), and it matches `docker`/`git`. The deployment CLI adopts it; this CLI
adopts it too, so the two are learnable as one.

Corollaries:

1. **No top-level bare verbs.** `start`/`stop`/`status`/… move under the resource
   they act on.
2. **No hyphenated verb-nouns.** `generate-project` becomes `<noun> generate`.
3. **`setup`/`install` are grouped by the resource they target,** which makes
   their different scope explicit instead of implied.

---

## 3. The noun set

Four nouns cover the whole surface. Each maps to a real resource in the services
lifecycle.

| Noun | What it is | Lifecycle stage |
|---|---|---|
| `project` | The generated on-disk scaffold: `config/`, `data/`, and the `compose.*.yml` files | Scaffolding |
| `host` | The machine-level prerequisites: TLS certificates and file permissions (root-only) | Host preparation |
| `service` | The running service containers (InfluxDB, RabbitMQ, MongoDB, ThingsBoard/PostgreSQL, GitLab, Grafana) | Runtime |
| `user` | Service user accounts driven by `config/credentials.csv` | Runtime |

### Notes on the noun choices

- **`project`** keeps the existing `generate-project` intent but as a resource:
  `project generate`. (This CLI has no `dtaas.toml`-style config command, so —
  unlike the deployment CLI — there is no `config` noun to fold generation into;
  `project` stands on its own here.)
- **`host`** is the missing noun that makes `setup` legible. `setup` prepares the
  host (copies certs, fixes permissions, requires root); it is not a service
  operation. Naming the resource `host` states that scope up front, and cleanly
  separates it from `service` operations. Candidate names `system` or `machine`
  work too; `host` is chosen to match the platform's own "DTaaS host" vocabulary.
- **`service`** is the natural home for the six operational verbs plus per-service
  schema initialization. It pairs with the already-universal `--services/-s`
  target flag.
- **`user`** already exists as a noun group and is kept.

All four satisfy clig.dev's naming guidance (*"simple, memorable… lowercase"*).

---

## 4. Full command surface (current → proposed)

### 4a. `project` (from the hyphenated verb-noun)

| Current | Proposed |
|---|---|
| `dtaas-services generate-project [--path <dir>]` | `dtaas-services project generate [--path <dir>] [--force]` |

`--force` is added for parity with the deployment CLI: overwrite existing
scaffold files instead of skipping them (see §6).

### 4b. `host` (from flat `setup`)

| Current | Proposed |
|---|---|
| `dtaas-services setup` | `dtaas-services host setup` |

`host setup` copies TLS certificates and sets service file permissions; it
requires root and is a prerequisite for starting services. Grouping it under
`host` makes its machine-level scope explicit and stops it reading as a peer of
`service start`.

### 4c. `service` (from six flat verbs + per-service `install`)

| Current | Proposed | Scope |
|---|---|---|
| `dtaas-services start [-s ...]` | `dtaas-services service start [-s ...]` | all or listed services |
| `dtaas-services stop [-s ...]` | `dtaas-services service stop [-s ...]` | all or listed services |
| `dtaas-services restart [-s ...]` | `dtaas-services service restart [-s ...]` | all or listed services |
| `dtaas-services status [-s ...]` | `dtaas-services service status [-s ...]` | all or listed services |
| `dtaas-services remove [-s ...] [-v]` | `dtaas-services service remove [-s ...] [--volumes]` | all or listed services |
| `dtaas-services clean [-s ...] [--certs]` | `dtaas-services service clean [-s ...] [--certs]` | all or listed services |
| `dtaas-services install [-s <svc>]` | `dtaas-services service install [-s <svc>]` | one service's schema / post-install |

`service install` keeps its distinct meaning — initialize a service's database
schema or run its post-install flow (ThingsBoard schema + sysadmin; GitLab
readiness + token/OAuth setup). It stays a `service` verb because it acts on a
named service, and its help text continues to carry the "run once" and
"specify -s explicitly" warnings.

### 4d. `user` (unchanged verbs)

| Current | Proposed |
|---|---|
| `dtaas-services user add [-s ...]` | `dtaas-services user add [-s ...]` |
| `dtaas-services user reset-password [-s ...]` | `dtaas-services user reset-password [-s ...]` |

Already `noun verb`; kept as-is.

---

## 5. The resulting workflow

The nouns line up with the documented Quick Start, so the command sequence now
reads as a legible progression through the lifecycle stages:

```
dtaas-services project generate          # scaffold config/, data/, compose files
#   edit config/services.env, config/credentials.csv, config/gitlab_oauth.json
dtaas-services host setup                # copy certs + set permissions (root)
dtaas-services service clean             # prepare data/log dirs for a fresh install
dtaas-services service start             # bring services up
dtaas-services service install -s thingsboard   # one-time schema init
dtaas-services service install -s gitlab        # one-time post-install setup
dtaas-services user add                  # create accounts from credentials.csv
dtaas-services user reset-password -s gitlab
```

clig.dev: *"Suggest commands the user should run… helps them learn the
workflow."* The existing "next steps" hints (printed by `setup` and by the
GitLab-not-ready path) update to the new spellings, e.g.
`dtaas-services service status -s gitlab` and
`dtaas-services service install -s gitlab`.

---

## 6. Conventions to standardize

The redesign is the moment to make the shared conventions uniform across every
noun. Most already hold; a few need alignment.

### Target selection: `--services/-s`

Every operational verb already accepts `--services/-s` as a comma-separated
list, defaulting to "all services" when omitted. This is kept verbatim as the
one target convention. `parse_service_list` (splitting and trimming) stays the
single parser.

- clig.dev prefers flags to positional args, and this CLI already does the right
  thing here — a service selector is a flag, not a positional. Keep it that way;
  do not add positional service arguments.

### `--force` on generation

`project generate` gains `--force`, matching the deployment CLI: without it,
existing scaffold files are preserved and reported as skipped; with it, they are
overwritten. `-f`/`--force` is clig.dev's standard name for overriding a safety
check.

### `--volumes` long form

`remove` currently exposes `-v` for "also remove volumes." clig.dev reserves
`-v` by convention for *verbose/version*, and warns against spending one-letter
flags on non-standard meanings. The redesign keeps `-v` working (backward
compatibility) but documents `--volumes` as the primary spelling. If a verbose
flag is ever added, `-v` should map to it, so new scripts should prefer
`--volumes`.

### Destructive actions confirm

`clean` already prompts for confirmation and refuses to run against
still-running services; `remove` deletes containers (and, with `--volumes`,
data). clig.dev: *"Confirm before doing anything dangerous."* Keep `clean`'s
prompt; consider a matching confirm (or a `--yes` bypass) for
`service remove --volumes`, since that path is data-destroying.

### Output: human-first, with a machine-readable path

`service status` renders a rich table for humans. clig.dev: *"Display output as
formatted JSON if `--json` is passed."* Add a `--json` option to
`service status` so health can be consumed by scripts and monitoring, mirroring
the deployment CLI's `platform status --json`. Keep the table as the default.

### Errors and exit codes

The existing pattern — wrap failures in `click.ClickException`, exit non-zero,
print a green success line otherwise — is consistent and is preserved across all
nouns. Idempotent "nothing to do" paths (e.g. a service already stopped) should
continue to exit `0`.

---

## 7. Alignment with clig.dev and git

| Guideline (clig.dev / git) | This design |
|---|---|
| **`noun verb` two-level subcommands** (`docker container create`) | Adopted as the single rule across the whole tool. ✔ |
| **Be consistent across subcommands** | One target convention (`--services/-s`), shared error/exit handling, shared confirmation pattern. ✔ |
| **Don't have ambiguous or similarly-named commands** | `setup` vs `install` vs `generate-project` are separated by noun: `host setup`, `service install`, `project generate`. ✔ |
| **Use consistent verbs across object types** | `status`, `install`, and generation verbs mean the same thing here as in the deployment CLI. ✔ |
| **Make it easy to see current state** (`git status`) | `service status`, table by default, `--json` for scripts (§6). ✔ |
| **Display machine-readable output with `--json`** | Added to `service status`. ✔ (new) |
| **Prefer flags to args** | Targets are flags (`--services/-s`), never positional. ✔ |
| **Use standard flag names** | `--force` for overwrite; `--volumes` promoted over non-standard `-v`. ✔ (corrected) |
| **Confirm before anything dangerous** | `clean` prompts already; add confirm/`--yes` to `remove --volumes`. ◑ (follow-up) |
| **Keep changes additive; warn before non-additive changes** | Old spellings kept as deprecated aliases for one release (§8). ✔ |
| **Don't allow arbitrary abbreviations** | Full noun+verb spellings; aliases explicit and stable. ✔ |
| **Don't have a catch-all subcommand** | `dtaas-services <noun>` with no verb prints that noun's help. ✔ |

**Where git informs the design.** `git` groups its top-level help by workflow
stage. The services CLI's stages — `project → host → service → user` — become
the natural grouping for `dtaas-services --help`, so the help output teaches the
install order, not just an alphabetical command list.

---

## 8. Migration, compatibility, and implementation shape

### Backward compatibility

Renaming breaks existing scripts and the documented Quick Start. Following
clig.dev's future-proofing guidance (*"warn before you make a non-additive
change"*), use a **one-release deprecation window**:

- Keep every old spelling (`generate-project`, `setup`, `install`, `start`,
  `stop`, `restart`, `status`, `remove`, `clean`) as an **explicit, hidden
  alias** that forwards to the new command and prints a one-line deprecation
  notice to `stderr` naming the replacement. These are named aliases, never
  prefix-abbreviations.
- Update `README.md`, `DEVELOPER.md`, `GITLAB_INTEGRATION.md`, and the printed
  "next steps" hints to the new spellings.
- Remove the aliases at the next major version bump; announce in the changelog.

### Implementation shape

The current layout already maps cleanly onto the noun set — the command modules
are grouped almost exactly along these lines, so the change is mostly wiring
groups in `cmd.py` rather than moving logic.

```
dtaas_services/
  cmd.py                    # root `services` group; wires the noun groups
  commands/
    project_ops.py          # project generate            (was setup_ops.generate_project)
    host_ops.py             # host setup                   (was setup_ops.setup)
    service_ops.py          # service start|stop|restart|status|remove|clean|install
                            #   (install moves in from setup_ops)
    user_ops.py             # user add | reset-password
    aliases.py              # deprecated old spellings → new commands (temporary)
    utility.py              # shared helpers (parse_service_list, runners, result handling)
  pkg/                      # unchanged service/domain logic
```

`cmd.py` gains three groups (`project`, `host`, `service`) alongside the existing
`user` group, each populated via `add_command` — the pattern already used for
`user`. No package (`pkg/`) logic needs to move; only the command layer is
regrouped.

Conventions to preserve across every noun:

- `--services/-s` comma-separated selector on every `service` verb, default =
  all.
- `--force` on `project generate`; `--volumes` (with `-v` alias) on
  `service remove`; `--certs` on `service clean`.
- `click.ClickException` for failures, non-zero exit; green success line
  otherwise; idempotent no-op = exit 0.
- Rich table for `service status` by default, `--json` for automation.
- Full help text with a leading example per command; `dtaas-services <noun>`
  with no verb prints that noun's help.

---

## 9. Summary

| Before (three grammars) | After (`dtaas-services <noun> <verb>`) |
|---|---|
| `dtaas-services generate-project` | `dtaas-services project generate [--force]` |
| `dtaas-services setup` | `dtaas-services host setup` |
| `dtaas-services install -s <svc>` | `dtaas-services service install -s <svc>` |
| `dtaas-services start [-s ...]` | `dtaas-services service start [-s ...]` |
| `dtaas-services stop [-s ...]` | `dtaas-services service stop [-s ...]` |
| `dtaas-services restart [-s ...]` | `dtaas-services service restart [-s ...]` |
| `dtaas-services status [-s ...]` | `dtaas-services service status [-s ...] [--json]` |
| `dtaas-services remove [-s ...] [-v]` | `dtaas-services service remove [-s ...] [--volumes]` |
| `dtaas-services clean [-s ...] [--certs]` | `dtaas-services service clean [-s ...] [--certs]` |
| `dtaas-services user add [-s ...]` | `dtaas-services user add [-s ...]` |
| `dtaas-services user reset-password [-s ...]` | `dtaas-services user reset-password [-s ...]` |

The single rule — **`dtaas-services <noun> <verb>`** — removes the three
competing styles, separates the three kinds of setup action by resource
(`project generate`, `host setup`, `service install`), gives the six operational
verbs a `service` home next to the already-consistent `--services/-s` selector,
and keeps the tool aligned with clig.dev's `noun verb` guidance, the
`git`/`docker` precedent, and the sibling deployment CLI — so the two DTaaS CLIs
are learned once and used everywhere.
