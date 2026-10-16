# Local Server

Runs the integrated GitLab installation package
(`deploy/dtaas/docker/secure-server_with_integrated-gitlab`) on one
Linux machine under the hostname `intocps.test`, then tests the GitLab
container registry by hand and from a pipeline.

```bash
python3 developer/local-server/local_server.py all
```

The guides explain the prerequisites, every command and what the script
changes on the machine:

- [Local Server Testing](../../docs/developer/contributions/local-server-testing.md)
- [Local Registry Testing](../../docs/developer/contributions/local-registry-testing.md)

## Files

| File | Purpose |
| :--- | :--- |
| `local_server.py` | Command line: `host`, `package`, `up`, `configure`, `check`, `all`, `down`, `clean` |
| `*.py` | The steps behind the commands; standard library only |
| `compose.local.yml` | Override that the script copies next to the package's `docker-compose.yml` |
| `forward-auth/Dockerfile` | traefik-forward-auth image that trusts the mkcert root CA |
| `runner/` | Compose file and configuration template of the test runner |
| `registry-test.gitlab-ci.yml` | Pipeline that publishes an image and runs a job inside it |
| `tests/` | Unit tests: `python -m pytest`, run from this directory |

The script never changes the package in `deploy/`. It copies the package
to `~/dtaas-local-test`, where the generated configuration, certificates
and secrets stay out of Git.
