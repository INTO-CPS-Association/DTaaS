# DTaaS CLI: the `<noun> <verb>` Command Design

## Purpose

This document defines the single grammar of the DTaaS CLI:

```ml
dtaas <noun> <verb> [target] [flags]
```

Every command names **what it acts on** (the noun) and then **what to do**
(the verb). The design has three aims: one command shape across the whole CLI,
an unambiguous home for lifecycle operations (status, stop, start, pause,
resume), and alignment with the widely used conventions in
[clig.dev](https://clig.dev/#subcommands) and in `git` and `docker`.

---

## 1. The rule

> **Every command is `dtaas <noun> <verb>`.** The noun is the resource. The verb
> is the action. Flags refine; they never replace the verb.

This is the pattern clig.dev recommends for multi-level CLIs:

> *"If a complex piece of software has lots of objects and operations that can
> be performed on those objects, it is a common pattern to use two levels of
> subcommand… one is a noun and one is a verb. For example, `docker container
> create`. Either `noun verb` or `verb noun` ordering works, but `noun verb`
> seems to be more common."* (clig.dev, Subcommands)

`git` and `docker` both follow it (`git remote add`, `git branch delete`,
`docker container stop`, `docker image pull`). The DTaaS CLI uses `noun verb`.

Three corollaries follow from the rule:

1. **No top-level bare verbs.** Every action sits under the resource it acts
   on; the root `dtaas` group holds only nouns.
2. **Nouns are resources, not roles.** A role such as "admin" names the actor,
   not the thing acted on, so it is not a noun.
3. **Scope is encoded by the noun.** Core platform actions live under
   `platform`; per-user actions live under `user`. The noun states the blast
   radius before the verb is read.

Why this matters, in clig.dev's terms:

* **Discoverability.** *"Where possible, a CLI should follow patterns that
  already exist. That's what makes CLIs intuitive and guessable."* A user who
  learns `config generate` can guess `deployment generate`.
* **No similarly named commands.** *"Don't have ambiguous or similarly-named
  commands."* `platform stop` and `user stop` share a verb, and the noun says
  which containers it touches.
* **Room to grow.** A new feature picks a noun and a verb; the shape of the
  command is never in question.

---

## 2. The noun set

Four nouns cover the entire command surface. Each is a real resource in the
deployment lifecycle.

| Noun | What it is | Lifecycle stage |
| --- | --- | --- |
| `config` | `dtaas.toml`, the single source of deployment configuration | Before anything exists |
| `deployment` | The generated on-disk artifacts: compose tree **and** user-management templates | Scaffolding |
| `platform` | The installed, running core services (traefik, client, gitlab, …) | Runtime |
| `user` | The additional (registry-tracked) users and their containers | Runtime |

There is no separate `project` noun: the generated files are the deployment
(see §3).

### On the choice of `platform` for the core-services noun

* **`services`**: rejected. Per-user containers are *also* services (they run
  from `compose.users.yml`), so `services` for only the core set misleads.
* **`deployment`**: rejected for the runtime group. It is better reserved for
  the generated files; reusing it for runtime control conflates "files on disk"
  with "running containers".
* **`platform`**: chosen. It names the running DTaaS instance as a whole (the
  whole installation, managed as one unit), and is distinct from both the
  generated `deployment` artifacts and the per-`user` containers.

All four nouns satisfy clig.dev's naming guidance (*"simple, memorable…
lowercase"*).

---

## 3. Generation: `config generate` and `deployment generate`

Two verbs generate files, and each owns a distinct resource:

* `config generate` writes `dtaas.toml` **and** a sample `users.csv`.
* `deployment generate --type <t>` writes the scenario-specific compose tree,
  **substituting values from `dtaas.toml`**, together with the user-management
  templates (`users.server.yml`, `users.server.secure.yml`,
  `users.resources.yml`) and the workspace directory skeleton.

```ml
dtaas config generate                       # writes dtaas.toml (+ sample users.csv)
dtaas config validate                       # checks it
dtaas deployment generate --type <type>     # writes compose tree + user templates
                                            #   + workspace skeleton, using dtaas.toml
```

Why this is the right shape:

* **One resource, one noun.** Compose files, user templates and the workspace
  skeleton are all deployment artifacts produced from `dtaas.toml`. They belong
  under one verb, and no other command writes `dtaas.toml`.
* **Respects the real ordering.** Because `deployment generate` substitutes
  values from `dtaas.toml`, config must exist first. Making `config generate`
  the sole owner of `dtaas.toml` and `deployment generate` its consumer encodes
  that dependency in the command structure. clig.dev: *"Suggest commands the
  user should run… helps them learn the workflow."* The
  `config → deployment → platform → user` chain is a legible progression.

### Overwriting existing files with `--force`

Both generation verbs take a `--force` flag to overwrite files that already
exist; without it, existing files are preserved (and reported as skipped). This
keeps regeneration a property of the single verb rather than a separate command
or noun:

* `dtaas config generate --force` overwrites an existing `dtaas.toml` (and the
  sample `users.csv`).
* `dtaas deployment generate --type <type> --force` overwrites an existing
  compose tree, user-management templates and workspace skeleton.

The default (no `--force`) is the safe, non-destructive path: a re-run touches
only what is missing. `--force` is the explicit opt-in to overwrite, matching
clig.dev's convention that `-f`/`--force` is the standard name for overriding a
safety check.

---

## 4. Full command surface

### 4a. `config`

| Verb | Purpose |
| --- | --- |
| `dtaas config generate [--force]` | Write `dtaas.toml` (and a sample `users.csv`); `--force` overwrites existing files |
| `dtaas config validate` | Validate `dtaas.toml` |
| `dtaas config reconcile [--fix]` | Compare the user registry against live state and report drift; `--fix` reprovisions drifted users |

### 4b. `deployment`

| Verb | Purpose |
| --- | --- |
| `dtaas deployment generate --type <type> [--force]` | Generate the compose tree, user-management templates and workspace skeleton for a scenario, using `dtaas.toml`; `--force` overwrites existing files |

### 4c. `platform` (core services, managed as one unit)

| Verb | Scope |
| --- | --- |
| `dtaas platform install` | all core services |
| `dtaas platform uninstall [--remove-user-files] [--yes]` | the whole installation |
| `dtaas platform update --certs` | all core services |
| `dtaas platform update --config [--dry-run]` | all core services |
| `dtaas platform status [--json]` | core **+** users (report only) |
| `dtaas platform stop` | **core services only** |
| `dtaas platform start` | **core services only** |
| `dtaas platform pause` | **core services only** |
| `dtaas platform resume` | **core services only** |

`platform stop|start|pause|resume` act on the core services defined in
`docker-compose.yml`, never on per-user containers.

### 4d. `user` (additional users, individually)

| Verb | Purpose |
| --- | --- |
| `dtaas user add <username>` / `--file <csv>` | Provision one or more users |
| `dtaas user delete <username>...` / `--file <csv>` `[--dry-run]` | Deprovision one or more users |
| `dtaas user status [<username>] [--json]` | Report state of all users, or one named user |
| `dtaas user stop <username>...` / `--file <csv>` / `--all` | Terminate one or more users' containers |
| `dtaas user pause <username>...` / `--file <csv>` / `--all` | Suspend one or more users' containers |
| `dtaas user resume <username>...` / `--file <csv>` / `--all` | Resume one or more users' containers |

The per-user lifecycle verbs take `<username>...`, `--file <csv>` or `--all`,
matching `user add`/`delete`, and record each user's intended state in
`dtaas.users.registry.json` (§5).

---

## 5. The two-axis model

```ml
dtaas platform <verb>            → acts on the core services, as one unit
        install | uninstall | update | status | stop | start | pause | resume

dtaas user <verb> [target]       → acts on additional users, individually
        add | delete | status | stop | pause | resume
```

Two rules keep the axes orthogonal:

1. **`platform` verbs never target a single user.** There is no
   `platform stop <username>`; suspending one user is a `user` operation.
2. **`user` write verbs always take a target.** `user stop` with no
   `<username>`, `--file` or `--all` is an error, never a silent "stop every
   user"; `--all` is the explicit way to target them all. This follows
   clig.dev's *"Confirm before doing anything dangerous"* and *"Validate user
   input… bail out before anything bad happens."*

To suspend or resume the whole installation, pair `dtaas user <verb> --all`
with the matching `platform` verb.

### Why `platform status` still reports users

`status` is read-only, so it cannot cause cross-axis confusion. A single "what
is the state of my whole installation?" view is what an operator expects, and
clig.dev's *"Make it easy to see the current state of the system"* (the
`git status` example) endorses a broad read-only overview. So `platform status`
reports **both** core services and user containers, while
`user status [<username>]` narrows to the user axis.

### State contract for `user` lifecycle verbs

The grammar alone does not make suspension safe; the implementation honours a
state contract:

* `user stop|pause|resume` record each affected user's intended lifecycle state
  as `desired_status` in `dtaas.users.registry.json`, which stays authoritative
  for *who* is a user, and refresh the observed snapshot in `.dtaas.state.json`.
* `user add` and `config reconcile --fix` treat a user that is intentionally
  `stopped` or `paused` as **in the desired state**, not as drift, so they never
  fight the operator by restarting a suspended user.

In short: the registry answers both "should this user exist?" and "what
lifecycle state should this user be in?", while `.dtaas.state.json` only records
what the CLI last observed. `platform` lifecycle verbs act on core compose
services and do **not** write either file.

> Boundary note: `config reconcile` compares the user registry against live user
> containers, so a case exists for placing it under `user`. It is kept under
> `config` because it is driven by and reports on `dtaas.toml` and registry
> configuration drift rather than acting on an individual user. This is a
> deliberate boundary choice, revisitable if reconcile grows per-user
> sub-operations.

---

## 6. Alignment with clig.dev and git

A point-by-point audit of the design against the two references.

| Guideline (clig.dev / git) | This design |
| --- | --- |
| **`noun verb` two-level subcommands** (`docker container create`, `git remote add`) | Adopted as the single rule. Met. |
| **Be consistent across subcommands** (same flag names, output) | `--output-dir`, `--file`/`csv_file`, `--json`, `--force`, `--dry-run` reused verbatim across every noun (§7). Met. |
| **Don't have ambiguous or similarly-named commands** | `install`/`uninstall`/`stop`/`pause`/`update` sit under the `platform` noun, so their scope is explicit. Met. |
| **Use consistent verbs across object types** | `status`/`stop`/`pause`/`resume` mean the same thing under both `platform` and `user`. Met. |
| **Make it easy to see current state** (`git status`) | `platform status` (whole install) + `user status` (per-user), table + `--json`. Met. |
| **Display machine-readable output with `--json`** | `status` verbs offer `--json`; success and errors go to the correct streams. Met. |
| **Prefer flags to args** | Targets use a positional `<username>` (justified below); bulk input uses `--file`; all refinement is via flags. Partially met (see note). |
| **Confirm before anything dangerous** | `uninstall --remove-user-files` prompts (`--yes` to skip); `user delete`/`stop` operate on explicit targets, and `user delete --dry-run` previews. Met. |
| **Don't allow arbitrary abbreviations of subcommands** | No prefix matching; every noun and verb is spelled in full. Met. |
| **Don't have a catch-all subcommand** | No implicit default verb; `dtaas platform` with no verb shows help. Met. |
| **Return zero/non-zero exit codes correctly** | Idempotent absent case = exit 0. Met. |

**Note on "prefer flags to args".** clig.dev prefers flags, but also says
*"Multiple arguments are fine for simple actions against multiple files"*
(`rm file1 file2`) and endorses a common primary action taking a positional
(`cp <src> <dst>`). A username is the direct object of `user add alice` and
`user stop alice`, so `<username>` is positional, with `--file` (short form
`-f`, dest `csv_file`) for bulk input on every `user` verb that takes targets.

**Where git informs the design.** `git`'s top-level help groups commands by
workflow stage ("start a working area", "work on the current change", "examine
the history"). The DTaaS equivalent is the `config → deployment → platform →
user` progression, which the noun set mirrors and `dtaas --help` lists in that
order.

---

## 7. Implementation shape

Each noun is a Click group whose leaf commands live in `cmd_<noun>.py` modules
and are registered onto the root group in workflow order.

```ml
src/
  cmd.py                 # root `dtaas` group; wires the noun groups
  cmd_config.py          # config generate | validate | reconcile
  cmd_deployment.py      # deployment generate (compose tree + user templates + skeleton)
  cmd_platform.py        # platform install | uninstall | update
  cmd_lifecycle.py       # platform status | stop | start | pause | resume
  cmd_user.py            # user add | delete | status
  cmd_user_lifecycle.py  # user pause | stop | resume
  cmd_options.py         # shared options (--output-dir, --json, --file, --force)
  pkg/
    deploy.py            # install/uninstall/update/compose plumbing
    lifecycle.py         # core-service status/stop/start/pause/unpause
    users.py             # user add
    users_delete.py      # user delete
    users_lifecycle.py   # user pause/stop/resume + desired_status writes
    project.py           # generate compose tree + user templates
    host_dirs.py         # files/ and logs/logger/ creation and ownership
```

Conventions to preserve across every noun:

* `--output-dir` (`default="."`, `show_default=True`) on every directory-scoped
  `config`, `deployment` and `platform` command; `user` verbs act on the
  current directory.
* `--file` (dest `csv_file`) for bulk targets; positional `<username>` /
  `<usernames>...` for explicit targets.
* `except (OSError, DockerException) → click.ClickException(str(exc))`.
* One exception to "modules under `src/pkg/` raise": the ownership helpers in
  `pkg/host_dirs.py` are best-effort. A failed `sudo chown` or `chmod`
  (`CalledProcessError`, or `FileNotFoundError` when `sudo` is missing), a
  failed `mkdir` of `logs/logger/` (`OSError`) or a symlinked `logs/` prints
  a warning naming the commands to run by hand (`messages.echo_hint`), and
  the command carries on with exit code 0. The containers can still start,
  and the admin can fix the owner later. `create_user_dirs` still raises.
* `"<Thing> <verbed> successfully"` success messages; idempotent absent case via
  a shared "no installation" message and presence check.
* Dual output for `status` verbs: aligned table by default, `--json` for
  automation.
* Full help text with a leading example per command (clig.dev: *"Lead with
  examples"*), and `dtaas <noun>` with no verb prints that noun's help.

---

## 8. Summary

The single rule, **`dtaas <noun> <verb>`**, gives the CLI one command shape,
encodes core-versus-user scope in the noun, gives `config` sole ownership of
`dtaas.toml` and `deployment generate` every generated artifact, and aligns the
CLI with clig.dev's `noun verb` subcommand guidance and the `git`/`docker`
precedent. Lifecycle operations have an unambiguous home: core-service control
under `platform`, per-user control under `user`, with the §5 state contract as
the condition for the latter.
