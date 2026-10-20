# DTaaS Services CLI — Unified `<noun> <verb>` Command Design

## Purpose

This document defines a consistent command grammar for the **`dtaas-services`**
CLI — the tool that manages the DTaaS platform's third-party services (InfluxDB,
Grafana, RabbitMQ, MongoDB, ThingsBoard with its PostgreSQL backend, and
GitLab).

It applies the same principle adopted for the deployment CLI:

```text
dtaas-services <noun> <verb> [target] [flags]
```

Every command names **what it acts on** (the noun) and then **what to do**
(the verb). The aims are to give service lifecycle operations a predictable
shape and to align with the conventions in
[clig.dev](https://clig.dev/#subcommands) and in `git`/`docker`.

This is a companion to the deployment-CLI design and uses the same rules, so the
two CLIs feel like one family.

---

## 1. Why one grammar

A CLI whose commands come in several shapes (bare top level verbs,
hyphenated verb noun names, noun groups) has to be learned command by command.
One grammar for every command fixes that.

- **Discoverability / guessability.** clig.dev: *"a CLI should follow patterns
  that already exist… that's what makes CLIs guessable."* A user who learns
  `user add` expects `service start`, and finds it. The mental model transfers
  across the whole tool.
- **Scope and kind are visible.** `service start`, `stop`, `restart`,
  `status`, `remove` and `clean` act on service *containers*; `host setup`
  acts on the *host* (certs, permissions, needs root); `service install` acts
  on a service's *database schema*. The noun signals these very different
  blast radii.
- **No similarly named commands.** clig.dev: *"Don't have ambiguous or
  similarly-named commands."* The three setup flavoured actions
  (`project generate`, `host setup`, `service install`) are told apart by
  their noun, not by reading each help text.
- **One target convention.** Every operational command shares one target
  flag, `--services/-s` with a comma separated list, which is a consistent
  base for the `service` noun.

---

## 2. The unifying rule

> **Every command is `dtaas-services <noun> <verb>`.** The noun is the resource.
> The verb is the action. Flags refine; they never replace the verb.

This is clig.dev's recommended pattern for multi-level CLIs (*"one is a noun and
one is a verb… `docker container create`… `noun verb` seems to be more
common"*), and it matches `docker`/`git`. The deployment CLI adopts it; this CLI
adopts it too, so the two are learnable as one.

Corollaries:

1. **No top-level bare verbs.** The root group holds only nouns; every verb
   lives under the resource it acts on.
2. **No hyphenated verb-nouns.** Generation is `project generate`.
3. **`host setup` and `service install` are grouped by the resource they
   target,** which makes their different scope explicit instead of implied.

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

- **`project`** names the generated scaffold as a resource:
  `project generate`. (This CLI has no `dtaas.toml`-style config command, so —
  unlike the deployment CLI — there is no `config` noun to fold generation into;
  `project` stands on its own here.)
- **`host`** is the noun that makes `host setup` legible. `host setup` prepares
  the host (copies certs, fixes permissions, requires root); it is not a service
  operation. Naming the resource `host` states that scope up front, and cleanly
  separates it from `service` operations. Candidate names `system` or `machine`
  work too; `host` is chosen to match the platform's own "DTaaS host" vocabulary.
- **`service`** is the natural home for the six operational verbs plus per-service
  schema initialization. It pairs with the already-universal `--services/-s`
  target flag.
- **`user`** groups the account verbs.

All four satisfy clig.dev's naming guidance (*"simple, memorable… lowercase"*).

---

## 4. Full command surface

### 4a. `project`

```text
dtaas-services project generate [--path <dir>] [--force]
```

`--force` gives parity with the deployment CLI: overwrite existing scaffold
files instead of skipping them (see §6).

### 4b. `host`

```text
dtaas-services host setup
```

`host setup` copies TLS certificates and sets service file permissions; it
requires root and is a prerequisite for starting services. Grouping it under
`host` makes its machine-level scope explicit and stops it reading as a peer of
`service start`.

### 4c. `service`

| Command | Scope |
|---|---|
| `dtaas-services service start [-s ...]` | all or listed services |
| `dtaas-services service stop [-s ...]` | all or listed services |
| `dtaas-services service restart [-s ...]` | all or listed services |
| `dtaas-services service status [-s ...] [--json]` | all or listed services |
| `dtaas-services service remove [-s ...] [--volumes]` | all or listed services |
| `dtaas-services service clean [-s ...] [--certs]` | all or listed services |
| `dtaas-services service install [-s <svc>]` | one service's schema / post-install |

`service install` keeps its distinct meaning — initialize a service's database
schema or run its post-install flow (ThingsBoard schema + sysadmin; GitLab
readiness + token/OAuth setup). It stays a `service` verb because it acts on a
named service, and its help text continues to carry the "run once" and
"specify -s explicitly" warnings.

### 4d. `user`

```text
dtaas-services user add            [-s ...]
dtaas-services user reset-password [-s ...]
```

---

## 5. The resulting workflow

The nouns line up with the documented Quick Start, so the command sequence now
reads as a legible progression through the lifecycle stages:

```text
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
workflow."* The "next steps" hints (printed by `host setup` and by the
GitLab not ready path) use these spellings, for example
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

`service remove` takes `--volumes` (short form `-v`) for "also remove
volumes." clig.dev reserves `-v` by convention for *verbose/version*, and warns
against spending one-letter flags on non-standard meanings, so `--volumes` is
the documented spelling. If a verbose flag is ever added, `-v` should map to
it, so scripts should prefer `--volumes`.

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
| **`noun verb` two-level subcommands** (`docker container create`) | Adopted as the single rule across the whole tool. Met. |
| **Be consistent across subcommands** | One target convention (`--services/-s`), shared error/exit handling, shared confirmation pattern. Met. |
| **Don't have ambiguous or similarly-named commands** | The setup flavoured actions are separated by noun: `host setup`, `service install`, `project generate`. Met. |
| **Use consistent verbs across object types** | `status`, `install`, and generation verbs mean the same thing here as in the deployment CLI. Met. |
| **Make it easy to see current state** (`git status`) | `service status`, table by default, `--json` for scripts (§6). Met. |
| **Display machine-readable output with `--json`** | Added to `service status`. Met (new). |
| **Prefer flags to args** | Targets are flags (`--services/-s`), never positional. Met. |
| **Use standard flag names** | `--force` for overwrite; `--volumes` promoted over non-standard `-v`. Met (corrected). |
| **Confirm before anything dangerous** | `clean` prompts already; add confirm/`--yes` to `remove --volumes`. Partially met (follow-up). |
| **Don't allow arbitrary abbreviations** | Full noun+verb spellings only; no abbreviations or command aliases. Met. |
| **Don't have a catch-all subcommand** | `dtaas-services <noun>` with no verb prints that noun's help. Met. |

**Where git informs the design.** `git` groups its top-level help by workflow
stage. The services CLI's stages — `project → host → service → user` — become
the natural grouping for `dtaas-services --help`, so the help output teaches the
install order, not just an alphabetical command list.

---

## 8. Implementation shape

The current layout already maps cleanly onto the noun set — the command modules
are grouped almost exactly along these lines, so the change is mostly wiring
groups in `cmd.py` rather than moving logic.

```text
dtaas_services/
  cmd.py                    # root `services` group; wires the noun groups
  commands/
    project_ops.py          # project generate            (was setup_ops.generate_project)
    host_ops.py             # host setup                   (was setup_ops.setup)
    service_ops.py          # service start|stop|restart|status|remove|clean|install
                            #   (install moves in from setup_ops)
    user_ops.py             # user add | reset-password
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

The single rule, **`dtaas-services <noun> <verb>`**, gives every command one
shape, separates the three kinds of setup action by resource
(`project generate`, `host setup`, `service install`), gives the six operational
verbs a `service` home next to the already-consistent `--services/-s` selector,
and keeps the tool aligned with clig.dev's `noun verb` guidance, the
`git`/`docker` precedent, and the sibling deployment CLI — so the two DTaaS CLIs
are learned once and used everywhere.
