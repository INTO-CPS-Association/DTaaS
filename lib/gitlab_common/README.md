# gitlab-common

Provider-agnostic [python-gitlab](https://python-gitlab.readthedocs.io/)
operations shared across DTaaS Python packages: `dtaas-services` (service
provisioning) and `dtaas-cli` (`dtaas user add` GitLab account/PAT
provisioning).

Every function takes explicit arguments (URL, token, user fields) and performs
**no** environment, filesystem, console, or process-global-state I/O.
Deployment-specific glue -- URL derivation, token persistence, credential
files, docker, and terminal output -- stays in each consuming application.

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
