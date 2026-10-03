# DTaaS Command Line Interface Developer Notes

This document outlines the development strategy and contribution guidelines.
The source code for the CLI is located in the _cli/src_ directory.

## 📦 Dependencies

A ready-made container with Python, Poetry and the rest of the toolchain
is available; see
[developer/devenv/README.md](../developer/devenv/README.md). It saves
installing these on your host.

The CLI is written in Python and uses the following libraries:

- [Click](https://click.palletsprojects.com/en/8.1.x/) : Used for
  development of the CLI commands.

- [PyYaml](https://pyyaml.org/wiki/PyYAMLDocumentation) : Used for
  handling yaml files across CLI functions. Usage of this to read
  from and write to Yaml files has been wrapped by functions in the
  _cli/src/pkg/utils.py_ file. These functions should be used directly
  to handle Yaml files.

- [TomlKit](https://readthedocs.org/projects/tomlkit/) : Used for
  handling toml files across the CLI. Usage of reading toml files
  has been wrapped in a function in _cli/src/pkg/utils.py_ file.
  This function should be used directly to read toml files.

- [python-on-whales](https://gabrieldemarmiesse.github.io/python-on-whales/) :
  Used by the `platform install` / `platform uninstall` commands
  (_cli/src/pkg/deploy.py_) to drive `docker compose up`/`down`. It wraps the
  docker CLI (which must be installed on the host) and raises a
  `python_on_whales.exceptions.DockerException` carrying the real command
  output (return code and stderr) when a compose operation fails. It is also
  used by _cli/src/pkg/state.py_ to read best-effort container id/status when
  writing the `.dtaas.state.json` runtime cache.

- [Poetry Package](https://python-poetry.org/docs/) to manage
  dependencies and build the CLI. The configuration file for this is
  _cli/pyproject.toml_. New source packages and dependencies need to be
  added here.

- [Pyright](https://github.com/microsoft/pyright) : Used for static type checking.

- [python-gitlab](https://python-gitlab.readthedocs.io/) : GitLab API client,
  used via the shared `gitlab_common` module (see below) for GitLab user
  provisioning.

## 🏗️ Code Structure

The CLI has two layers of code:

- Command line definition layer: every command follows a single
  `dtaas <noun> <verb>` grammar (see _DTaaS-CLI-Design.md_) with four nouns.
  _src/cmd.py_ defines the root `dtaas` group and wires the four noun groups
  in workflow order; each noun is its own module: _src/cmd_config.py_
  (`config generate|validate|reconcile`), _src/cmd_deployment.py_
  (`deployment generate`), _src/cmd_platform.py_
  (`platform install|uninstall|update` plus the lifecycle verbs from
  _src/cmd_lifecycle.py_), and _src/cmd_user.py_
  (`user add|delete|status`, plus the `pause|stop|resume` verbs from
  _src/cmd_user_lifecycle.py_). Options reused across nouns
  live in _src/cmd_options.py_. The CLI functions call the Package layer
  functions. Non-command helpers shared by the command definitions are split
  by concern to keep each file within a reasonable line count:
  _src/cmd_utils.py_ (uninstall/reconcile/update orchestration),
  _src/cmd_deploy_utils.py_ (deployment-generation helpers), and
  _src/cmd_user_utils.py_ (user-input resolution/validation for
  _src/cmd_user.py_'s commands). Deprecated pre-2.0 spellings
  (`admin ...`, `generate-deployment`, `generate-project`) live in
  _src/cmd_aliases.py_ as hidden aliases that warn and forward; that module is
  a self-contained deprecation-window layer, deletable in one step.

- Package layer: This is the _cli/src/pkg_ directory.
  It contains the
  singleton Config class, which is used throughout the CLI.
  Additionally,
  it contains the handling functions for each CLI subcommand.
  These functions perform
  the actual operations that the CLI command
  is responsible for. It also
  has helper functions that can be used across the CLI.

The `config` commands are backed here: `generate_config` in
_src/pkg/project.py_ copies just the `dtaas.toml` template (reusing the same
template-copy helpers as `generate_user_templates`), and
_src/pkg/config_validate.py_ checks the
values in an existing `dtaas.toml`. Each check in `config_validate.py` returns
a list of human-readable problems (empty when the value is acceptable) and
`validate_config` aggregates them so the user sees every issue at once. Most
checks are syntactic, but `path` and `certs-src` are verified against the local
filesystem (the directory must exist), so `validate` is expected to run on the
deployment host.

The `[gitlab]` section's own checks live in `src/pkg/config_validate_gitlab.py`
(`check_gitlab`), called from `config_validate.py`'s check list; they were
split out to keep that module within its line count.

`platform update --config` is backed by _src/pkg/config_update.py_, which
re-applies `dtaas.toml` to an installed deployment in place. It reuses the
existing substitution engine rather than duplicating it:
`config_validate.collect_errors` gates the run,
`deploy_config.build_file_specs` produces the per-file specs,
`deploy_config.diff_specs` previews which files a spec would change
(read-only, so it also powers `--dry-run`), and `deploy_config.apply_config`
writes them (idempotently: only changed files are touched). The deployment
type is detected from the compose service names via `deploy.compose_services`
(more robust than inspecting config-file names). When any file changed, the
whole stack is recreated through `deploy.restart_all`
(`docker compose up -d --force-recreate`), since a config change can affect any
service. `cmd_utils.run_config_update` adapts it to the CLI (mapping
`OSError`/`ValueError`/`DockerException` to a `ClickException`), alongside
`run_cert_update` and `require_update_flag` for the `update` group.

The lifecycle commands (`platform status` / `stop` / `start` / `pause` / `resume`)
are backed by _src/pkg/lifecycle.py_ and defined in _src/cmd_lifecycle.py_.
They observe or suspend an installed deployment without removing it (unlike
`uninstall`). `collect_status` returns per-service records (state and health)
for **both** the core services and the user-added `compose.users.yml` workloads,
so `platform status` reports the whole installation (and `user status` narrows
it to the user rows). The suspend verbs `stop`/`start`/`pause`/`unpause`, by
contrast, map onto `docker compose stop`/`start`/`pause`/`unpause` on the
**core services only** per-user containers are suspended individually through
_users_lifecycle.py_ (`dtaas user stop`/`pause`/`resume`), keeping the platform
and user axes orthogonal. `_state_name` presents Docker's `exited` status as
`stopped` so the reported state matches the `platform stop` verb. To keep one
definition of "the deployment", `lifecycle.py` reuses deploy.py's compose-client
plumbing (`require_compose_file`, `_client`, `compose_services`) rather than
re-deriving it. `cmd_lifecycle.py` renders the status records as a table or
(`--json`) as JSON via `echo_status` (shared with `user status`), and
`_run_suspend` reports the "nothing installed" case as an exit-0 no-op so the
commands are safe in CI/ops scripts. The commands are attached to the
`platform` group by `add_lifecycle_commands`, mirroring how
`cmd_user_lifecycle.py`'s `add_user_lifecycle_commands` attaches
`user pause|stop|resume` to the `user` group.

_src/pkg/deploy.py_'s local-file cleanup for `uninstall --remove-user-files`
lives in a separate _src/pkg/user_files.py_ (pure filesystem work, no docker):
`delete_user_files` removes the generated per-user workspace directories and
the CLI-owned `dtaas.users.registry.json`/`.dtaas.state.json`, while keeping
the `files/common` and `files/template` scaffolding so a later install can
repopulate user dirs. A plain `uninstall` keeps the registry/state files, so a
reinstall restores the same additional users.

`platform update --config` validation is scoped to the installed deployment type:
`config_validate.collect_errors(data, deploy_type)` checks only that type's
deployment section (plus shared sections like `[frontend]`), so a leftover
unrelated section -- e.g. a stale `[workspace-secure-server]` block in a
`secure-server` deployment -- does not block the update. Standalone
`config validate` passes no deploy_type and still checks every present
section.

### GitLab user provisioning

`src/pkg/gitlab/` is built on `gitlab_common` (vendored from
`lib/gitlab_common` by `src/pkg/build.py`, like the deploy templates below
see [lib/gitlab_common/README.md](../lib/gitlab_common/README.md) for why it
is copied rather than depended on) for the client, the user/PAT primitives
and the projects every user gets, so no GitLab API code is reimplemented in
the CLI. What stays here is the deployment glue: reading `dtaas.toml`,
resolving which account to act on, and printing the outcome. Creating a
user's repositories from a template is not specific to this package, so it
sits in the shared module where `dtaas-services` can use it as well; the
template itself comes from each deployment's own configuration, which for
this package means `dtaas.toml`.

- `client.py`'s `resolve_client(config_obj)` reads `[gitlab].api_url` from
  `dtaas.toml` and resolves the PAT from the `DTAAS_GITLAB_PAT` environment
  variable, falling back to `[gitlab].pat`, then builds a
  `gitlab_common.get_gitlab_client` instance.
- `provisioner.py`'s `ensure_user_resources(gl, user)` (a `GitlabUser` of
  username/email/password, plus an optional registry-stored user id)
  creates the user's GitLab account and Personal Access Token via
  `gitlab_common.create_user`/`create_user_pat`. It is idempotent: an
  already-existing account is left with its current credentials and gets no
  new PAT.
- `projects.py`'s `provision_user_projects(gl, target, templates)` creates
  the user's two repositories, `common` and `user`, from the `[gitlab]`
  template settings (`ProjectTemplates`: one template repository per
  project, `common_template` and `user_template`). Those keys have no
  built-in default:
  `config.gitlab_template_values` returns None when neither is set, and
  `projects.resolve_templates` (the template counterpart of
  `client.resolve_client`) then skips only the project step, with one notice
  per run, leaving account and token provisioning untouched. A partly
  configured template is a typo rather than an opt out, so it is an error at
  both ends: `config_validate_gitlab.py` calls the same function to report it
  before `user add` runs, and at run time it fails the users it affects
  instead of provisioning them without repositories.
- The GitLab work itself is `gitlab_common`'s, so `dtaas-services` can
  provision the same repositories from its own configuration without
  restating any of it. `user_projects.ensure_user_projects(gl, user_id,
  templates)` names the pair (`common`, `user`) and returns `(ok,
  messages)`; printing those lines is this package's job, not the shared
  module's. Each one is `projects.create_user_project`, the project
  counterpart of `users.create_user` and shaped like it (explicit arguments,
  no console output or config), which creates the project in the user's own
  namespace with GitLab's import by URL and leaves it at that: one template
  repository per project means the copy is already what the user should
  start from, every branch and the template's own default branch included,
  so nothing is switched or pruned afterwards. The import is
  asynchronous, so `project_import.await_import` polls `import_status`
  (`[gitlab].import_timeout` minutes at most, 10 by default, carried there
  on `ProjectTemplates`) before the project is reported ready. A read that
  fails (a GitLab error or a dropped connection) is retried, and only
  `IMPORT_POLL_MAX_ERRORS` failures in a row end the wait, as that user's
  error: nothing is raised, so one unreachable moment never aborts the
  users after it in the same run. The same tuple, `errors.API_ERRORS` (a
  GitLab error or a `requests` one, which python-gitlab does not wrap),
  guards every other call the package makes, the account half included, so
  a dropped connection is always one user's failure and never the run's.
  Status `none` is an
  error there rather than "nothing to wait for": every project polled was
  created with an `import_url`, so it means the instance never scheduled the
  import, and the message names the two prerequisites (the "Repository by
  URL" import source enabled, and network access from the server to the
  template) rather than reporting the empty project as ready.
- Adopting a project that is already in the namespace is `_adopt_existing`'s
  job, and it does not equate "present" with "ready". A run that stopped
  waiting on an import leaves an empty project behind, so reporting it as
  ready would mark the user `gitlab_projects_created` over an empty
  repository; an empty project is therefore waited on until its import
  finishes, unless its `import_status` is `none`, which means no import was ever
  scheduled for it: waiting would report a disabled import source, so the
  empty project is reported as itself instead. A
  project with any content is never touched, whatever its branches: its
  contents may be the user's own work. It is reported as a
  `MESSAGE_WARNING` saying it already exists and was not created, which the
  CLI prints with a `Warning:` prefix, the way an existing account is.
- GitLab never reruns an import that failed or was never scheduled, so the
  empty project either one leaves fails on every run. Those two errors end
  with `IMPORT_RETRY_HINT` (delete the empty project and re-run), because
  deleting it automatically is not safe everywhere: with delayed deletion
  the path can stay taken for days.
- An account that already exists on GitLab (the 409 path) gets no projects,
  for the same reason it gets no token: `create_user` reports
  ALREADY_EXISTS with no id, the account belongs to whoever registered it,
  and both a token and a repository act on a namespace this run cannot
  vouch for. `_account_step` therefore returns `has_account=False` for that
  outcome and `_skip_projects` stops there.
- `ProjectTarget.user_id` is the account id when it is known (created this
  run, or stored in the registry); with neither,
  `gitlab_common.users.find_user_id`, called from `pkg/gitlab/projects.py`'s
  `_resolve_user_id`, resolves it by username. Only accounts this CLI
  created reach that step now, so the lookup covers the one case its caller
  cannot supply an id for: an account created before its id reached the
  registry. The note it prints says only that, and claims nothing about
  whose account it is.

This is wired into `dtaas user add` (`pkg/users_gitlab.py`'s `provision_gitlab_users`)
behind the `[gitlab].provision` flag (default `false`, so existing
deployments are unaffected). A password is required per user via
`--password`, prompted interactively (hidden input) for a single-user add
when omitted, or via `users.csv`'s `password` column for bulk adds and is
used only to create the account; it is never written to
`dtaas.users.registry.json`, `.dtaas.state.json`, or logs. Issued PATs are
saved to `gitlab_user_tokens.json` (mode `0600`, via
`utils.write_secret_file`), and the successful issuance is recorded in the
registry as `gitlab_pat_issued` so a repeated `user add` (e.g. re-running the
same CSV after a partial failure) skips a user who already has a token rather
than minting a second one. A GitLab failure for one user (or for the whole
step, e.g. an unreachable instance) is reported and does not affect container
provisioning, which has already completed by that point, nor other users.
The account half and the project half are tracked separately in the
registry (`gitlab_pat_issued` vs `gitlab_projects_created`) because they fail
independently: a run that issues a token but cannot create the projects must
retry only the projects on the next `user add`, and the PAT skip must not
swallow the project step. Each half is persisted as soon as it finishes
rather than at the end of the run, because the project step waits on a
server side import: a token still in memory at that point is one an
interrupted run loses while it stays live on GitLab, and the next run would
mint a second one. For the same reason the password guard sits in
`_account_step` and not in front of the whole user, and `add_users` skips
the GitLab step only for `passwords=None` (what `config reconcile --fix`
passes). `stage_users_for_add` keys the password map by every user named
in the run, with None where no password was given, because
`target_usernames` reaches an already-registered user only through that
map: a user named with no entry at all would get no GitLab step, and the
retry would report success having done nothing. A project only retry is
therefore `dtaas user add alice --email ...` (or a re-run of the same CSV)
with no password. `_account_step` checks `gitlab_pat_issued` before the
password, so such a retry reports the issued token rather than a missing
password. A client that cannot be built then
fails only the users who had GitLab work waiting (`_has_gitlab_work`),
which includes an account with projects still to create: with
`provision = true` that is a failure even where tokens are issued out of
band, since the projects cannot be made without a client. The template is
therefore resolved before the client, and `wants_projects` is passed in: a
deployment that configures no template never records
`gitlab_projects_created`, so without that flag every user who ever had a
token would count as unfinished work forever and an unusable client would
fail a command with nothing left to do. Two visible
consequences follow. A `--file` import whose CSV has no password column is
refused by `require_passwords` before anything is written, naming the users
with neither a password nor an account from an earlier run; a user who
already has one is not refused, and their account step reports the issued
token rather than a missing password. And `cmd_user` does not prompt for a
password for a user already marked `gitlab_pat_issued` (`_pat_issued`),
since `_account_step` would discard it.
A run also has a budget: `[gitlab].import_deadline` minutes (60 by
default), kept by `users_gitlab_targets.RunDeadline` from the moment GitLab
provisioning starts. `_issue_gitlab_resources` checks it before each user
rather than interrupting one, since a project half way through an import
would be left behind; the users it stops short of are named as not
attempted and the command still exits 0, because nothing was tried for them
and a plain re-run picks them up. Without it a bulk add on an instance whose
imports hang (they stay `scheduled`, so nothing reports them as broken)
would wait `import_timeout` twice per user, hours for a large CSV.
`users_gitlab.py` holds that flow (`_account_step`, `_projects_step`),
`users_gitlab_targets.py` decides who is in it, and
`users_gitlab_records.py` is the disk half: the 0600 token file and the
registry markers. Group provisioning is still not implemented.

Everything these steps print goes through `pkg/messages.py`'s `echo_hint`,
over `gitlab_common.with_hint`. A failure, warning or skip opens with one
line short enough to scan in a run that touches many users, and keeps what
a reader has to act on (the PAT scopes behind a 401, the `projects_limit`
cause of a 403, GitLab's own words on a 409) in an indented line underneath.
A message that already carries a hint keeps its shape when it becomes the
detail of another, so the per user line can wrap a provisioner result
without the two running together.

### User registry and runtime state

User provisioning spans three single-owner files, modelled on the config/state
split Terraform uses for `.tf` vs `terraform.tfstate`: `dtaas.toml` holds the
hand-edited `starting` users, `dtaas.users.registry.json` is the CLI-owned store
of _additional_ users, and `.dtaas.state.json` is a git-ignored runtime cache.

- _src/pkg/registry.py_ owns `dtaas.users.registry.json`. `load_registry` reads
  the `{username: details}` store (empty when absent), `register_new_users` merges
  new users, and `remove_from_registry` drops them, each persisted atomically
  (temp file + `os.replace`), the way `useradd` owns `/etc/passwd`.
  `read_csv_users` parses a `users.csv` for bulk import. `set_desired_status`
  writes each user's intended running state (`running`/`paused`/`stopped`,
  from `constants.DESIRED_STATUSES`) without touching their email/groups/
  load_balance; see _users_lifecycle.py_ below.
- _src/pkg/users.py_ `add_users(config_obj, start_only=None)` writes every
  registry user to `compose.users.yml` (keeping the file complete) but only
  _starts_ the `start_only` users -- `user add` passes just the newly-added
  usernames (returned by `stage_users_for_add`), so adding one user never
  recreates the rest; `config reconcile --fix` passes `None`, meaning start
  every provisioned user. `delete_users` deprovisions the named users and
  removes them from the registry (`dry_run=True` previews without changing
  anything).
  `cmd_user_utils.resolve_usernames` resolves the usernames to act on from
  positional args or a `--file`/`-f users.csv` (only the `username` column is
  read), rejecting the call if both or neither are given; it is shared by
  `user delete`/`pause`/`stop`/`resume`. `cmd_user_utils.stage_users_for_add`
  merges a `--file users.csv` (or a single USERNAME) into the registry before
  `add` runs, and rejects the call (`ClickException`) if neither is given: a
  bare `user add` is never a silent no-op or an implicit reprovision.
- _src/pkg/users_lifecycle.py_ backs `user pause`/`stop`/`resume`: siblings of
  `add`/`delete` that target specific registry users (not the whole
  installation -- see `lifecycle.py` above for that) via `USERNAMES` or
  `--file`/`-f`. `pause_users`/`stop_users`/`resume_users` all funnel through
  `_apply`, which resolves each username against the registry and
  compose.users.yml's live services (`_split_targets`, distinguishing
  unregistered from registered-but-not-provisioned), runs the compose action,
  refreshes `.dtaas.state.json`, and writes the new `desired_status`. The
  compose actions are state-aware via `_live_states` (a single `compose ps`),
  so they never error on an already-in-state container: `_pause_targets` skips
  already-paused ones (`compose pause` errors on a non-running container),
  `_stop_targets` skips already-stopped ones, and `_resume_targets` dispatches
  each target to `unpause` (if paused) or `start` (if stopped), leaving
  already-running ones alone. `cmd_user_utils.reject_starting_users` rejects
  targeting a `dtaas.toml` starting user before any of this runs, since those
  aren't registry-tracked and are suspended/resumed as part of the whole
  installation instead (`platform pause`/`stop`/`resume`).
- `users_lifecycle.desired_status_drift` / `enforce_desired_status` power the
  desired-status half of `config reconcile`: `desired_status_drift` lists
  provisioned users whose live container state differs from their registry
  `desired_status`, and `enforce_desired_status` pauses/stops/resumes them to
  match. `cmd_utils.run_reconcile` reports both membership drift (from
  `state.find_drift`) and this status drift, and `--fix` reprovisions
  missing/drifted users and then enforces desired_status.
- `desired_status` is what makes a pause/stop durable: `users.py`'s
  `_provision_users` computes `_skip_start_users` from the registry's
  per-user `desired_status` and passes it to `users_compose.finalize_compose`,
  which still writes every user's compose service definition (so their config
  is never lost) but skips starting the container for anyone not `running`.
  Without this, `user add`'s idempotent "re-provision everyone on every run"
  behavior (and `config reconcile --fix`, which calls the same `add_users`)
  would silently undo a pause the next time either ran.
- _src/pkg/state.py_ owns `.dtaas.state.json`. Each add/delete fully overwrites
  it with a fresh snapshot (not an append-only log) recording, per currently
  provisioned user, a `config_hash` (a stable sha256 of the compose service)
  plus best-effort container id/status from python-on-whales.
  `find_drift(registry_users, state, services)` powers
  `dtaas config reconcile`: it treats the registry as the desired state
  and compares it against the live `compose.users.yml` services, reporting
  _missing_ (registered, not provisioned) and _unexpected_ (provisioned, not
  registered) users directly from that comparison. The state cache is used
  only for the third category, _drifted_: a user present in both whose live
  config no longer matches the hash recorded when it was last provisioned; a
  user with no recorded hash is not flagged, since reconcile has nothing to
  compare it against. `cmd_utils.run_reconcile(output_dir, fix=True)` reuses
  `run_user_command`/`userPkg.add_users` (via `_fix_reconcile`) to reprovision
  _missing_/_drifted_ users after reporting; it deliberately never acts on
  _unexpected_ users, since removing something that's actually running is a
  separate, explicit `user delete` decision.

### TOML File

The base configuration file used by the CLI is the _dtaas.toml_ file.
It has the following sections:

#### Global variables

```toml
name="Digital Twin as a Service (DTaaS)"
version="2.0.0"
owner="The INTO-CPS-Association"
git-repo="https://github.com/into-cps-association/DTaaS.git"
```

These define metadata about the DTaaS instance and are not directly used
by the CLI.

#### [common]

```toml
[common]
server-dns="intocps.org"
path="/Users/username/DTaaS"

[common.security]
tls=true
certs-src="/etc/letsencrypt/archive/intocps.org"

[common.resources]
cpus=4
mem_limit="4G"
pids_limit=4960
shm_size="512m"
```

- _server-dns_: determines localhost vs. server deploy; sets routes in docker
  compose files.
- _path_: absolute path to the DTaaS installation; required for workspace
  creation and docker services.
- _tls_: `false` uses `user.server.yml`; `true` (default) uses `user.server.secure.yml`.
- _certs-src_: source directory of the TLS certificates. For TLS deploy types,
  `deployment generate` copies the latest `fullchain.pem`/`privkey.pem` from
  here into the deployment's `certs/` directory (see `src/pkg/certs.py`).
- Resource fields set default container limits for user workspaces.

#### [[users]]

```toml
[[users]]
username="username1"
email="username1@intocps.org"
groups=["default","dtaas"]
load_balance=true

[[users]]
username="username2"
email="username2@intocps.org"
```

- Each `[[users]]` block is one self-contained, starting user installed with
  the instance, hand-edited at install time. Presence in the array is the
  desired state there is no separate add/delete list, and a username never
  needs to be kept in sync across more than one place. Additional users added
  later via `dtaas user add` are **not** listed here they live in the
  CLI-owned `dtaas.users.registry.json`.
- _username_/_email_ are required (_email_ is written to `config/conf.server`
  on `dtaas user add`); _groups_/_load_balance_ are optional per-user
  tags; _password_ is an optional field reserved for future GitLab-onboarding
  provisioning; avoid committing a real secret in it.
- This schema previously went through an intermediate `starting = [...]` list
  plus per-user `[users.<name>]` sub-table stage; that stage is now itself
  superseded by `[[users]]`.

See [User registry and runtime state](#user-registry-and-runtime-state) for the
registry and `.dtaas.state.json` cache.

#### [frontend]

```toml
[frontend]
react-app-client-id="your_client_id_here"
react-app-oauth-url="https://gitlab.com"
```

OAuth credentials for the DTaaS React client website. This is a separate OAuth application
from the server-side one (traefik-forward-auth). Values are substituted into `config/client.js`
by `deployment generate`.

#### Deployment sections

Each deploy type has its own section (`[localhost]`, `[insecure-server]`,
`[secure-server]`, `[secure-server-gitlab]`, `[workspace-localhost]`,
`[workspace-secure-server]`). These hold server-side OAuth credentials
substituted into `.env` and `conf.server` by `deployment generate`.

## ⚙️ Setup

```bash
pip install poetry               # install poetry to the system
poetry shell                     # activate the poetry virtual environment
cd cli                           # switch to the cli directory
poetry install                   # install all required python packages
```

Two things are generated and not committed to the repository. Before running
tests or building the package, copy them from their sources:

```bash
python src/pkg/build.py
```

This populates `src/templates/deploy/` from `deploy/dtaas` and
`deploy/workspace`, and `src/gitlab_common/` from `lib/gitlab_common` (see
[GitLab user provisioning](#gitlab-user-provisioning) above). Re-run it
whenever either source changes. Without it, `import src.cmd` fails with
`ModuleNotFoundError: No module named 'src.gitlab_common'`.

## 🔧 Development

Make changes to _cli/src_.
To test changes locally:

```bash
poetry shell            # activate the poetry virtual environment
python src/pkg/build.py # required before build/tests see Setup above
poetry build            # build the python package
```

## 🔍 Linting

From the _cli_ directory, run:

```bash
pylint src --rcfile=../.pylintrc
```

## 🔬 Type Checking

From the _cli_ directory, run:

```bash
pyright src
```

Pyright is configured in `pyproject.toml` under `[tool.pyright]`.
Pyright errors should be resolved before submitting a pull request.

## 🧪 Testing

Test files are placed in the _cli/tests_ directory and must follow the
_test_*.py_ naming convention.
To run all tests with coverage:

```bash
pytest --cov=src --cov-report=xml --cov-report=term-missing
```

### Caveat

Before running all tests, set the appropriate _path_ in _dtaas.toml_
and the same path in the `test_import_toml` function in _test_utils.py_.
The integration tests in _test_cli.py_ run CLI commands directly and will
fail if the DTaaS path is not set correctly.

## 🔒 Security Check

To scan for known security vulnerabilities in dependencies, use the `safety` tool.

```bash
safety scan --detailed-output # detailed security report
safety scan                   # summary security report
```

This command checks all installed packages against a database of
known vulnerabilities and provides detailed information about any
security issues found.

## 📤 Publishing

The CLI is published to [PyPI](https://pypi.org/).
Once new changes are merged into the DTaaS
repository, the CLI is published to the official DTaaS PyPI account.

To test changes as they would appear in a published package,
create a personal PyPI account, generate an
[API token](https://pypi.org/help/#apitoken), and publish using Poetry:

```bash
poetry publish
```

## 🗺️ Future Work

The long-term objective for the CLI is to serve as the standard tool for
administrators to set up, manage, and interact with a DTaaS instance.
The following are the planned next steps:

- Incorporating the AuthMS _conf_ file rules
  in the user management commands.

- [Bug fix] Currently users with usernames containing
  a '.' in it aren't handled well by the CLI and result in errors.
  This is because '.' is a special character for labels in docker compose.
  We need to include such usernames, simply by internally replacing
  '.' instances in usernames by '-' or '_'.

## 👥 User Management Files: Design Rationale

This section explains _why_ user management is split across three files. For
_where_ each piece is implemented, see
[User registry and runtime state](#user-registry-and-runtime-state) above.

### The problem this design solves

Earlier, `dtaas.toml` had a single `[users]` table with `add`/`delete` lists.
That file was expected to do two incompatible jobs at once: be a
human-edited setting, and be a machine-processed to-do list. Nothing ever
cleared the list once it was processed, so after successfully adding
`alice`, `dtaas.toml` still said `add = ["alice"]`. Running `user add` again say,
to also add `bob` had no way to tell "alice is already done, only provision
bob," which could lead to duplicate or conflicting containers.
There was no persistent record, separate from the config file, of _who had
actually already been provisioned_.

### Three files, three owners

The fix is to stop making one file do two jobs. Each file below has exactly
one owner and one responsibility:

| File | Owner | Responsibility |
|---|---|---|
| `dtaas.toml` `[[users]]` | Human, once, at install time | The `starting` users the instance is installed with |
| `dtaas.users.registry.json` | The CLI, exclusively | Every `additional` user, added at any point after install |
| `.dtaas.state.json` | The CLI, exclusively | A disposable snapshot of what is actually running right now |

### Why each file behaves the way it does

- **`dtaas.toml` is never rewritten by the CLI, ever.** Once a human commits
  `starting` users at install time, the CLI only _reads_ that list (for
  `platform install` and `deployment generate`). A comment-bearing, reviewed
  config file should never be silently mutated by a tool that risk is
  exactly what made the old `add`/`delete` design fragile.
- **`dtaas.users.registry.json` is a merge, not a replace.** `user add`
  unions new users into the existing store and skips (with a warning, not an
  overwrite) anyone already present either already registered, or already
  a `starting` user in `dtaas.toml`. This is what actually fixes the
  duplicate-container bug: there is now one unambiguous, persistent answer to
  "has this user already been added," instead of an unprocessed to-do list.
- **`.dtaas.state.json` is disposable by design.** It is gitignored, and each
  write fully replaces its contents with a fresh snapshot (it is _not_ an
  append-only log). If you delete it, nothing is lost the CLI rebuilds it
  on the next `add`/`delete`. Its only job is to remember, per user, a hash
  of the config it was last provisioned with, so a later run can tell
  whether that config has since changed underneath it.
- **`dtaas config reconcile` treats the registry as the desired
  state, not the state cache.** An earlier version of `reconcile` compared
  `.dtaas.state.json` against the live compose services but since the
  state cache is written from that same compose data at the end of every
  `add`/`delete`, the two would almost always agree by construction, so that
  comparison rarely caught anything meaningful. Comparing the _registry_
  (who should exist) against the _live services_ (who does exist) is the
  comparison that actually matters, and is what lets `reconcile` catch a
  registered user who never got provisioned (e.g. an interrupted `add`).
  `.dtaas.state.json` is kept for exactly one narrower job it's suited for:
  detecting whether a provisioned user's config has since drifted.
- **`starting` and `additional` users are provisioned through genuinely
  different mechanisms, on purpose.** `starting` users are baked into the
  main `docker-compose.yml` at `deployment generate` time, in a fixed number
  of slots per deploy type. `additional` (registry) users get a dynamically
  managed, separate `compose.users.yml`. This means `dtaas.users.registry.json`
  and `.dtaas.state.json` only ever track `additional` users `starting`
  users intentionally never appear in either file.
