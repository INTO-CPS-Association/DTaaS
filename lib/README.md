# dtaas-gitlab

Reusable, provider-agnostic [python-gitlab](https://python-gitlab.readthedocs.io/)
operations shared across DTaaS Python packages (`dtaas-services` and the DTaaS
CLI).

Every function takes explicit arguments (URL, token, user fields) and performs
**no** environment, filesystem, or console I/O. Deployment-specific glue -- URL
derivation, token persistence, credential files, docker, and terminal output --
stays in the consuming application.

## Public API

| Function | Purpose |
| --- | --- |
| `get_gitlab_client(url, private_token, *, ssl_verify=True)` | Build an authenticated `gitlab.Gitlab` client. |
| `validate_user_row(username, email, password)` | Validate user inputs before any API call. |
| `create_user(gl, *, username, email, password, name=None)` | Create a user; a 409 (already exists) is reported as success with `user_id=None`. |
| `create_user_pat(gl, user_id, username, ...)` | Issue a Personal Access Token for a user. |

## Consuming it

During local development both packages depend on this library via a Poetry path
dependency, e.g.:

```toml
dtaas-gitlab = { path = "../../../lib", develop = true }   # from deploy/services/cli
dtaas-gitlab = { path = "../lib", develop = true }         # from cli
```
