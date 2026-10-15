# Local Registry Testing

This guide covers the GitLab container registry and a GitLab runner on
a development machine. It assumes the integrated GitLab package runs
under `intocps.test`, as set up in
[Local Server Testing](local-server-testing.md). The script's `check`
command runs every test below:

```bash
python3 script/local_server/local_server.py check
```

## Trust the Registry CA

The Docker daemon pulls and pushes images, so the daemon, not only the
browser, must trust the CA that signed the registry's certificate. The
`host` command of the script does this for the runtime of the active
Docker context. Where the CA goes depends on the runtime:

| Runtime                 | CA location                                                                                         |
| :---------------------- | :-------------------------------------------------------------------------------------------------- |
| Docker Engine (Linux)   | `/etc/docker/certs.d/<host>:<port>/ca.crt`, written with `sudo`                                     |
| Docker Engine in WSL2   | `/etc/docker/certs.d/<host>:<port>/ca.crt` inside the WSL distribution                              |
| Docker Desktop          | macOS: `~/.docker/certs.d/<host>:<port>/ca.crt` or the keychain. Windows: the Windows certificate store. Restart Docker Desktop afterwards |
| Rancher Desktop (Linux) | `~/.docker/certs.d/<host>:<port>/ca.crt`, which Rancher Desktop links into its virtual machine      |

Docker does not document a location for Docker Desktop on Linux; the
script uses `~/.docker/certs.d` there, as on macOS. With Docker Engine
in WSL2, browsers on Windows also need the CA in the Windows
certificate store and the hostname in the Windows `hosts` file.

## Push and Pull by Hand

Log in with a GitLab username and a personal access token that has the
`api` or `write_registry` scope, then push and pull an image to a
project:

```bash
docker login intocps.test:5050
docker tag alpine:3 intocps.test:5050/<group>/<project>/alpine:3
docker push intocps.test:5050/<group>/<project>/alpine:3
docker pull intocps.test:5050/<group>/<project>/alpine:3
```

The `check` command does the same with the root token, in the project
`dtaas/registry-test`.

The registry port is `REGISTRY_PORT` in the integrated package's
`config/.env`, or `GITLAB_REGISTRY_PORT` in the services CLI's
`config/services.env`; both default to `5050`. The services CLI does
not report the registry: `dtaas-services service status` lists only the
containers.

## Pipeline Test

The `check` command registers an instance runner and starts it from
`~/dtaas-local-test/runner`. The runner and its jobs join the
`dtaas-frontend` network, where `intocps.test` resolves to Traefik, and
the runner gives jobs the CA in `CI_SERVER_TLS_CA_FILE`. The runner is
not privileged.

The command then commits this pipeline to `dtaas/registry-test` and
runs it:

```yaml
stages: [publish, reuse]

publish:
  stage: publish
  image:
    name: gcr.io/go-containerregistry/crane:debug
    entrypoint: [""]
  script:
    - export SSL_CERT_FILE="$CI_SERVER_TLS_CA_FILE"
    - echo "$CI_REGISTRY_PASSWORD" |
      crane auth login "$CI_REGISTRY" -u "$CI_REGISTRY_USER" --password-stdin
    - crane copy alpine:3 "$CI_REGISTRY_IMAGE/ci-env:1.0"

reuse:
  stage: reuse
  image: $CI_REGISTRY_IMAGE/ci-env:1.0
  script:
    - cat /etc/os-release
```

The first job publishes an image to the project's registry, and the
second job runs inside that image. The check passes when both jobs
succeed. If GitLab restarts while a job starts, the job can stay in
`running` without a log; run `check` again.

## Clean Up

The `down` and `clean` commands of the script also stop the runner.
The CA copies in `~/.docker/certs.d/` or `/etc/docker/certs.d/` stay
until you delete them.
