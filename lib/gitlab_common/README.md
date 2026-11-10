# gitlab-common

Provider-agnostic [python-gitlab](https://python-gitlab.readthedocs.io/)
operations shared across DTaaS Python packages: `dtaas-services` (GitLab
account, PAT and project provisioning in `dtaas-services user add -s gitlab`)
and the DTaaS CLI `dtaas` (the same in `dtaas user add`, PAT revocation in
`dtaas user delete`).

Every function takes explicit arguments (URL, token, user fields) and reads
**no** configuration, environment or credential file of its own. The API
calls perform no console or process-global-state I/O. The project step's git
work (`git_run.py`, `template_checks.py`, `repos.py`, `project_fill.py`) runs
`git` on the host in a temporary folder, and lives here so that both
consumers fill projects with the same safeguards: the template is cloned
bare and checked first, the push runs as the user with their own token and
`-o ci.skip`, and every git command is bounded in time. Deployment-specific
glue (URL derivation, token and state persistence, credential files, docker
and terminal output) stays in each consuming application.

## This package is not installed as a dependency

`gitlab_common` is **not** published and is **not** added as a Poetry
dependency by its consumers. There is no `path = "../../lib/gitlab_common"`
entry anywhere, on purpose: a path dependency bakes an absolute local path
into a published wheel's metadata, which PyPI rejects and which cannot
resolve on any other machine (this was tried and reverted -- see git history).

Instead, each consumer **vendors** (copies) this package's `gitlab_common/`
source directory into its own tree at build/test time, via its own
`pkg/build.py`, which also stamps the copy with the git commit it came from
(`__source_version__` in `gitlab_common/__init__.py`) so a divergence between
an installed wheel and this source is traceable:

```
lib/gitlab_common/gitlab_common/   <-- single source of truth (this directory)
        |
        |  copied by each consumer's own pkg/build.py
        +---------------------------------------------+
        v                                               v
dtaas_services/gitlab_common/       cli/src/gitlab_common/
(deploy/services/cli)               (the DTaaS CLI)
gitignored, regenerated, never committed either way
```

This keeps `dtaas-services` and the DTaaS CLI fully independent of each other
and of this package at install time -- neither has a runtime or packaging
dependency on the other, only a shared source location during development.

## Public API

| Function | Purpose |
| --- | --- |
| `get_gitlab_client(url, private_token, *, ssl_verify=True)` | Build an authenticated `gitlab.Gitlab` client. `ssl_verify` accepts a CA-bundle path as well as a bool. |
| `validate_user_row(username, email, password)` | Validate user inputs before any API call. |
| `create_user(gl, *, username, email, password)` | Create a user; returns a `CreateUserResult` with an explicit `CreateOutcome` (CREATED / ALREADY_EXISTS / FAILED) rather than encoding "already exists" as a nullable id. |
| `create_user_pat(gl, user_id, username, options=None)` | Issue a Personal Access Token. `PatOptions` (name/scopes/expiry) defaults to least-privilege repository scopes; widen explicitly per call site. |
| `revoke_user_pats(gl, user_id, name="dtaas")` | Revoke the user's active Personal Access Tokens with that name. Finding none counts as success. |
| `find_user_project(gl, user_id, name)` | Look up the project whose path is `name` among the projects of GitLab user `user_id` (`GET /users/:user_id/projects`); returns a `ProjectLookup` whose `ProjectState` is MISSING (no such project), EMPTY (GitLab reports `empty_repo`), HAS_CONTENT (anything else, an unreported state included) or FAILED (an unknown user id included, with GitLab's words in `error`). `path` holds GitLab's `path_with_namespace` for a project found. |
| `create_user_project(gl, user_id, name)` | Create an empty private project in the user's namespace through the administrator endpoint `POST /projects/user/:user_id`, with no `import_url`. Returns `(True, path_with_namespace)` or `(False, error)`. |
| `find_user_id(gl, username)` | Look up the id of the account whose username is exactly `username` (`GET /users?username=`). Returns `(user_id, "")`, or `(None, error)` when there is no such account or the request failed. |
| `ensure_project(gl, request)` | Make sure the project of a `ProjectRequest` (user id, username, project name, template URL, `rerun` command, the user's token) exists, filled from its template when this call creates it. A missing project is created only after the template has been cloned bare and checked (no commits, Git LFS pointers), then pushed as the user with `-o ci.skip`. A project that exists is never touched. Returns a `ProjectResult` whose `ProjectOutcome` is CREATED, EMPTY, HAS_CONTENT or FAILED (with why, and after a failed push the `rerun` command to finish with). |
| `git_problem()` | Why `git` cannot be used on this host (missing, or older than 2.31), or `""`. Check it once before any project. |
| `template_urls(host, group)` | `{project name: template URL}` for `PROJECT_TEMPLATES` (`common` from `common`, `user` from `user1`), each `<host>/<group>/<repository>.git`. |
| `template_errors(host, group, keys)` | What is wrong with the template settings (each `None` when unset), named with the consumer's `TemplateKeys`: the group must pass `is_namespace_path`, the host `is_http_url`, and the two are set together or not at all. |
| `is_http_url(value)`, `is_namespace_path(value)` | The value rules of the template settings: an http(s) URL with a host and an optional port and path, and a GitLab group path such as `dtaas` or `dtaas/templates`. |
| `describe_api_error(exc)` | One short line for a caught `API_ERRORS` exception: GitLab's own message as python-gitlab prints it, or, when GitLab answered with an HTML error page, `<status>: GitLab error page (request ID <id>)` instead of the whole page. |
| `with_hint(summary, hint)` | Format a message as one short summary line with its detail indented underneath, the shape every message in this package and its consumers follows. |

Every git command runs through `git_run.run_git`, which stops it after 15
minutes, and git aborts a transfer slower than 1000 bytes a second for 60
seconds. Settings reach git through `GIT_CONFIG_COUNT` variables, never the
command line, and the user's token travels in an HTTP header scoped to the
GitLab URL, never to the template host.

Every GitLab call in this package catches `errors.API_ERRORS`
(`gitlab.exceptions.GitlabError` plus `requests.RequestException`, which
python-gitlab does not wrap), so an unreachable instance is reported as one
user's failure and never raised into a caller's loop over other users.
Its message names the exception through `describe_api_error`, so an HTML
error page never floods the output.

## Developing this package in isolation

```bash
cd lib/gitlab_common
poetry install --with dev
poetry run pytest
poetry run pylint gitlab_common tests --rcfile=../../.pylintrc --fail-under=9.0
poetry run pyright gitlab_common
```

After changing this package, re-run each consumer's vendor step (e.g.
`python -m dtaas_services.pkg.build` from `deploy/services/cli/`) before
testing or packaging that consumer -- CI does this automatically.
