# DTaaS CLI — Unified `<noun> <verb>` Command Design

## Purpose

This document defines a single, consistent grammar for the DTaaS CLI:

```ml
dtaas <noun> <verb> [target] [flags]
```

Every command names **what it acts on** (the noun) and then **what to do**
(the verb). The design has three aims: remove the competing command styles that
have accumulated in the CLI, give lifecycle operations (status, stop, pause,
resume) an unambiguous home, and align the CLI with the widely used conventions
in [clig.dev](https://clig.dev/#subcommands) and in `git`/`docker`.

---

## 1. The problem: three grammars in one CLI

The CLI currently mixes three incompatible shapes for a command.

### 1a. Top-level hyphenated verb-nouns

```ml
dtaas generate-project
dtaas generate-deployment --type <type>
```

Verb first, noun glued on with a hyphen, sitting on the root group.

### 1b. Flat verbs under `admin`

```ml
dtaas admin install
dtaas admin uninstall
dtaas admin update  --certs | --config
dtaas admin status | stop | pause | resume
```

`admin` is a role, not a resource. The object being acted on (the core
services) is implicit, and the command is a bare verb.

### 1c. Noun-grouped verbs under `admin`

```ml
dtaas admin config generate | validate | reconcile
dtaas admin user   add      | delete
```

`config` and `user` are nouns; the verb follows. This is the shape wanted
everywhere — but only two groups use it today.

### Why this matters

The inconsistency has concrete costs, several of which clig.dev names directly:

- **Discoverability / guessability.** clig.dev: *"Where possible, a CLI should
  follow patterns that already exist. That's what makes CLIs intuitive and
  guessable."* A user who learns `admin config generate` reasonably expects
  `admin deployment generate`, but the real command is the unrelated top-level
  `generate-deployment`. The mental model does not transfer.
- **Scope ambiguity.** `admin install` and `admin user add` sit at different
  depths but read as peers; nothing signals that `install` touches the whole
  platform while `user add` touches one user. The core-vs-user scope is
  invisible in the grammar.
- **Similarly-named commands.** clig.dev: *"Don't have ambiguous or
  similarly-named commands… two subcommands called 'update' and 'upgrade' is
  quite confusing."* Today `install` / `uninstall` / `stop` / `pause` /
  `update` all sit flat under `admin` as sibling verbs with no noun to
  disambiguate their scope.
- **Growth pressure.** Every new feature must pick one of three styles, and the
  choice gets re-litigated each time.

---

## 2. The unifying rule

> **Every command is `dtaas <noun> <verb>`.** The noun is the resource. The verb
> is the action. Flags refine; they never replace the verb.

This is the pattern clig.dev recommends for multi-level CLIs:

> *"If a complex piece of software has lots of objects and operations that can
> be performed on those objects, it is a common pattern to use two levels of
> subcommand… one is a noun and one is a verb. For example, `docker container
> create`. Either `noun verb` or `verb noun` ordering works, but `noun verb`
> seems to be more common."* — clig.dev, Subcommands

`git` and `docker` both settled on this (`git remote add`, `git branch delete`,
`docker container stop`, `docker image pull`). The DTaaS CLI adopts `noun verb`.

Three corollaries resolve the problems in §1:

1. **No top-level bare verbs.** `generate-project` / `generate-deployment`
   collapse into `deployment generate` (see §4).
2. **`admin` is retired as a group.** It is a role, not a resource; its children
   move to the resource they act on.
3. **Scope is encoded by the noun.** Core-platform actions live under a platform
   noun; per-user actions under `user`. The noun states the blast radius before
   the verb is read.

---

## 3. The noun set

Four nouns cover the entire command surface. Each is a real resource in the
deployment lifecycle.

| Noun | What it is | Lifecycle stage |
| --- | --- | --- |
| `config` | `dtaas.toml`, the single source of deployment configuration | Before anything exists |
| `deployment` | The generated on-disk artifacts: compose tree **and** user-management templates | Scaffolding |
| `platform` | The installed, running core services (traefik, client, gitlab, …) | Runtime |
| `user` | The additional (non-default) users and their containers | Runtime |

`config` and `user` already exist as noun groups and are kept. `deployment` and
`platform` are the groups that absorb the verb-first and flat-verb commands.
There is no separate `project` noun — see §4.

### On the choice of `platform` for the core-services noun

- **`admin`** — rejected: the actor, not the resource; keeping it preserves the
  ambiguity being removed.
- **`services`** — rejected: per-user containers are *also* services (they run
  from `compose.users.yml`), so `services` for only the core set misleads.
- **`deployment`** — rejected for the runtime group: better reserved for the
  generated files; reusing it for runtime control conflates "files on disk" with
  "running containers."
- **`platform`** — chosen: names the running DTaaS instance as a whole (the
  whole installation, managed as one unit), and is distinct from both the
  generated `deployment` artifacts and the per-`user` containers.

All four nouns satisfy clig.dev's naming guidance (*"simple, memorable…
lowercase"*).

---

## 4. Folding project generation into `deployment generate`

The CLI previously had two separate generation commands, `generate-project` and
`generate-deployment`. They are merged into a single `deployment generate` verb.
This section records why the merge is correct and what the resulting boundary is.

### What each command produces

- `generate-project` → copies user-management templates
  (`users.server.yml`, `users.server.secure.yml`, `users.resources.yml`) **and**
  `dtaas.toml`, then creates the workspace directory skeleton.
- `config generate` → copies `dtaas.toml` **and** a sample `users.csv`.
- `generate-deployment --type <t>` → copies the scenario-specific compose tree,
  **substituting values from `dtaas.toml`**, and copies example files.

Two facts drive the merge:

1. `dtaas.toml` is produced by *both* `generate-project` and `config generate` —
   a genuine overlap and a split-brain over which command owns the file.
2. There is no independent "project" resource. "Project" is just the set of
   generated deployment artifacts (compose tree, user templates, workspace
   skeleton), which is exactly what `deployment` denotes. The deployment step
   already consumes `dtaas.toml`, so the artifacts and the config are two
   distinct resources, not three.

### The resulting structure

`config` solely owns `dtaas.toml`; `deployment generate` produces every
generated artifact and consumes `dtaas.toml`:

```ml
dtaas config generate                       # writes dtaas.toml (+ sample users.csv)
dtaas config validate                       # checks it
dtaas deployment generate --type <type>     # writes compose tree + user templates
                                            #   + workspace skeleton, using dtaas.toml
```

Why this is the right shape:

- **One resource, one noun.** Compose files, user templates, and the workspace
  skeleton are all deployment artifacts produced from `dtaas.toml`. They belong
  under one verb, eliminating the two-command overlap on `dtaas.toml`.
- **Respects the real ordering.** Because `deployment generate` substitutes
  values from `dtaas.toml`, config must exist first. Making `config generate`
  the sole owner of `dtaas.toml` and `deployment generate` its consumer encodes
  that dependency in the command structure instead of hiding it. clig.dev:
  *"Suggest commands the user should run… helps them learn the workflow."* The
  `config → deployment → platform` chain becomes a legible progression.
- **Fewer commands, no lost capability.** The separate `generate-project`
  command disappears; everything it did is reachable via `config generate` (for
  `dtaas.toml`) and `deployment generate` (for the templates and skeleton).

### Behavior change to document

Previously, running `generate-project` alone also emitted `dtaas.toml`, so a
user ended up with a config file as a side effect. After the merge, the first
step of the workflow is an explicit `config generate`. This is a deliberate
change — the workflow gains an explicit first step rather than an implicit one —
and belongs in migration notes (§8).

### Overwriting existing files with `--force`

Both generation verbs take a `--force` flag to overwrite files that already
exist; without it, existing files are preserved (and reported as skipped). This
keeps regeneration a property of the single verb rather than a separate command
or noun:

- `dtaas config generate --force` — overwrite an existing `dtaas.toml` (and the
  sample `users.csv`).
- `dtaas deployment generate --type <type> --force` — overwrite an existing
  compose tree, user-management templates, and workspace skeleton.

The default (no `--force`) is the safe, non-destructive path: a re-run touches
only what is missing. `--force` is the explicit opt-in to overwrite, matching
clig.dev's convention that `-f`/`--force` is the standard name for overriding a
safety check.

---

## 5. Full command surface

### 5a. `config`

| Verb | Purpose |
| --- | --- |
| `dtaas config generate [--force]` | Write `dtaas.toml` (and a sample `users.csv`); `--force` overwrites existing files |
| `dtaas config validate` | Validate `dtaas.toml` |
| `dtaas config reconcile` | Compare desired user registry against live state and report/fix drift |

### 5b. `deployment`

| Verb | Purpose |
| --- | --- |
| `dtaas deployment generate --type <type> [--force]` | Generate the compose tree, user-management templates, and workspace skeleton for a scenario, using `dtaas.toml`; `--force` overwrites existing files |

### 5c. `platform` (core services, managed as one unit)

| Verb | Scope |
| --- | --- |
| `dtaas platform install` | all core services |
| `dtaas platform uninstall` | all core services |
| `dtaas platform update --certs` | all core services |
| `dtaas platform update --config` | all core services |
| `dtaas platform status` | core **+** users (report only) |
| `dtaas platform stop` | **core services only** |
| `dtaas platform pause` | **core services only** |
| `dtaas platform resume` | **core services only** |

`platform stop|pause|resume` act on the core services defined in
`docker-compose.yml`, never on per-user containers.

### 5d. `user` (additional users, individually)

| Verb | Purpose |
| --- | --- |
| `dtaas user add <username>` / `--file <csv>` | Provision one or more users |
| `dtaas user delete <username>...` / `--file <csv>` | Deprovision one or more users |
| `dtaas user status [<username>]` | Report state of all users, or one named user |
| `dtaas user stop <username>` / `--file <csv>` | Terminate one or more users' containers |
| `dtaas user pause <username>` / `--file <csv>` | Suspend one or more users' containers |
| `dtaas user resume <username>` / `--file <csv>` | Resume one or more users' containers |

The per-user lifecycle verbs take a `<username>` argument or `--file <csv>`,
matching `user add`/`delete`, and write through to `dtaas.users.registry.json`
and `.dtaas.state.json` (§6).

---

## 6. The two-axis model

```ml
dtaas platform <verb>            → acts on the core services, as one unit
        install | uninstall | update | status | stop | pause | resume

dtaas user <verb> [target]       → acts on additional users, individually
        add | delete | status | stop | pause | resume
```

Two rules keep the axes orthogonal:

1. **`platform` verbs never target a single user.** There is no
   `platform stop <username>`; suspending one user is a `user` operation.
2. **`user` write-verbs always take a target.** `user stop` with no `<username>`
   or `--file` is an error, never a silent "stop every user." (An explicit
   `--all` may be offered.) This follows clig.dev's *"Confirm before doing
   anything dangerous"* and *"Validate user input… bail out before anything bad
   happens."*

### Why `platform status` still reports users

`status` is read-only, so it cannot cause cross-axis confusion. A single "what
is the state of my whole installation?" view is what an operator expects, and
clig.dev's *"Make it easy to see the current state of the system"* (the
`git status` example) endorses a broad read-only overview. So `platform status`
reports **both** core services and user containers, while
`user status [<username>]` narrows to the user axis.

### State-file contract for `user` lifecycle verbs

The grammar alone does not make suspension safe; the implementation must honor a
state contract:

- `user stop|pause|resume` must **update `.dtaas.state.json`** with each
  affected user's intended lifecycle state, keeping `dtaas.users.registry.json`
  authoritative for *who* is a user.
- `config reconcile` must treat a user that is intentionally `stopped`/`paused`
  (per `.dtaas.state.json`) as **in the desired state**, not as drift.
  Otherwise suspending a user shows up as drift on the next reconcile and
  `--fix` fights the operator by restarting them.

In short: the registry answers "should this user exist?"; the state file answers
"what lifecycle state should this existing user be in?". The `user` lifecycle
verbs write the second; `reconcile` must read both. `platform` lifecycle verbs
act on core compose services and do **not** write these files.

> Boundary note: `config reconcile` compares the user registry against live user
> containers, so a case exists for placing it under `user`. It is kept under
> `config` because it is driven by and reports on `dtaas.toml`/registry
> configuration drift rather than acting on an individual user. This is a
> deliberate boundary choice, revisitable if reconcile grows per-user
> sub-operations.

---

## 7. Alignment with clig.dev and git

A point-by-point audit of the design against the two references.

| Guideline (clig.dev / git) | This design |
| --- | --- |
| **`noun verb` two-level subcommands** (`docker container create`, `git remote add`) | Adopted as the single rule. ✔ |
| **Be consistent across subcommands** (same flag names, output) | `--output-dir`, `--file`/`csv_file`, `--json`, `--force`, `--dry-run` reused verbatim across every noun (§8). ✔ |
| **Don't have ambiguous or similarly-named commands** | Flat `install`/`uninstall`/`stop`/`pause`/`update` siblings are disambiguated by the `platform` noun; `update`'s scope is now explicit. ✔ |
| **Use consistent verbs across object types** | `status`/`stop`/`pause`/`resume` mean the same thing under both `platform` and `user`. ✔ |
| **Make it easy to see current state** (`git status`) | `platform status` (whole install) + `user status` (per-user), table + `--json`. ✔ |
| **Display machine-readable output with `--json`** | `status` verbs offer `--json`; success/error go to the correct streams. ✔ |
| **Prefer flags to args** | Targets use a positional `<username>` (justified below); bulk input uses `--file`; all refinement is via flags. ◑ (see note) |
| **Confirm before anything dangerous** | `uninstall --remove-user-files` prompts (`--yes` to skip); `user delete`/`stop` operate on explicit targets. ✔ |
| **Keep changes additive; warn before non-additive changes** | Migration uses a deprecation-alias window, not a flag day (§8). ✔ |
| **Don't allow arbitrary abbreviations of subcommands** | No prefix-matching; every noun and verb is spelled in full. Aliases (if any) are explicit and stable. ✔ |
| **Don't have a catch-all subcommand** | No implicit default verb; `dtaas platform` with no verb shows help. ✔ |
| **Return zero/non-zero exit codes correctly** | Idempotent absent-case = exit 0, preserved. ✔ |

**Note on "prefer flags to args".** clig.dev prefers flags, but also says
*"Multiple arguments are fine for simple actions against multiple files"*
(`rm file1 file2`) and endorses a common primary action taking a positional
(`cp <src> <dst>`). A username is the direct object of `user add alice` /
`user stop alice`, and the existing `user add`/`delete` commands already take it
positionally. Keeping `<username>` positional (with `--file` for bulk) is
therefore consistent internally and with the guideline's stated exception. One
correction: standardize bulk input on `--file` (dest `csv_file`) everywhere;
`-f` may be offered as a short alias for `--file` where it doesn't conflict
with `--force` in the same command group.

**Where git specifically informs the design.** `git`'s top-level help groups
commands by workflow stage ("start a working area," "work on the current
change," "examine the history"). The DTaaS equivalent is the
`config → deployment → platform → user` progression, which the noun set mirrors.
Grouping `dtaas --help` output by that progression (not just the command tree)
is a concrete follow-up.

---

## 8. Migration, compatibility, and implementation shape

### Backward compatibility

Renaming the surface breaks scripts and docs. clig.dev is explicit:
*"it's crucial that interfaces don't change without a lengthy and
well-documented deprecation process,"* and *"warn before you make a
non-additive change."*

A **one-release deprecation window** is used:

- The old spellings (`admin install`, `generate-deployment`, `generate-project`,
  `admin user add`, …) remain as **explicit, hidden aliases** that forward to
  the new command and print a one-line deprecation warning to `stderr` naming
  the replacement. clig.dev: *"There's nothing wrong with aliases… but they
  should be explicit and remain stable"* — so these are named aliases, never
  prefix-abbreviations.
- The alias layer lives in a single `cmd_aliases.py`, trivial to delete when the
  window closes.
- New lifecycle verbs ship directly as `platform`/`user` verbs with no alias
  debt.
- Aliases are removed at the next major version bump, announced in `README.md`
  and `CHANGELOG`.

Because `generate-project` folds into `config generate` + `deployment generate`
(§4), its alias forwards to `deployment generate` and prints an additional line
noting that `config generate` now owns `dtaas.toml`.

### Implementation shape

Each noun is a Click group whose leaf commands live in a `cmd_<noun>.py` module
and are registered onto the root group — the pattern already used to attach the
`user` subcommands.

```ml
src/
  cmd.py              # root `dtaas` group; wires the noun groups
  cmd_config.py       # config generate | validate | reconcile
  cmd_deployment.py   # deployment generate (compose tree + user templates + skeleton)
  cmd_platform.py     # platform install | uninstall | update | status | stop | pause | resume
  cmd_user.py         # user add | delete | status | stop | pause | resume
  cmd_aliases.py      # deprecated old spellings → new commands (temporary)
  pkg/
    deploy.py         # install/uninstall/update/compose plumbing
    lifecycle.py      # core-service status/stop/pause/unpause  (→ platform)
    users.py          # user add/delete + user lifecycle + state writes
    project.py        # generate compose tree + user templates
```

Conventions to preserve across every noun:

- `--output-dir` (`default="."`, `show_default=True`) on every directory-scoped
  command.
- `--file` (dest `csv_file`) for bulk targets; positional `<username>` /
  `<usernames>...` for explicit targets.
- `except (OSError, DockerException) → click.ClickException(str(exc))`.
- `"<Thing> <verbed> successfully"` success messages; idempotent absent-case via
  a shared "no installation" message and presence check.
- Dual output for `status` verbs: aligned table by default, `--json` for
  automation.
- Full help text with a leading example per command (clig.dev: *"Lead with
  examples"*), and `dtaas <noun>` with no verb prints that noun's help.

---

## 9. Summary

| Before (three grammars) | After (`dtaas <noun> <verb>`) |
| --- | --- |
| `dtaas generate-project` | *(folded)* `dtaas config generate` + `dtaas deployment generate` |
| `dtaas generate-deployment --type t` | `dtaas deployment generate --type t` |
| `dtaas admin config generate` | `dtaas config generate` |
| `dtaas admin config validate` | `dtaas config validate` |
| `dtaas admin config reconcile` | `dtaas config reconcile` |
| `dtaas admin install` | `dtaas platform install` |
| `dtaas admin uninstall` | `dtaas platform uninstall` |
| `dtaas admin update --certs/--config` | `dtaas platform update --certs/--config` |
| `dtaas admin status` | `dtaas platform status` |
| `dtaas admin stop/pause/resume` | `dtaas platform stop/pause/resume` (core only) |
| `dtaas admin user add/delete` | `dtaas user add/delete` |
| — | `dtaas user status/stop/pause/resume` (per-user, writes state) |

The single rule — **`dtaas <noun> <verb>`** — removes the three competing
styles, encodes core-vs-user scope in the noun, folds the redundant project
generation into `deployment generate`, and aligns the CLI with clig.dev's
`noun verb` subcommand guidance and the `git`/`docker` precedent. Lifecycle
operations then have an unambiguous home: core-service control under `platform`,
per-user control under `user`, with the §6 state-file contract as the condition
for the latter.
