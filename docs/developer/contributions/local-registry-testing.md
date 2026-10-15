# Local Registry Testing

Use this guide to try the GitLab container registry and a GitLab runner
on a development machine. It picks up where
[Local Server Testing](local-server-testing.md) ends, with the
integrated GitLab package running under `intocps.test`.

## Push and Pull Images

The Docker daemon trusts a registry's certificate only if it finds the
CA in `/etc/docker/certs.d/<host>:<port>/ca.crt`. Rancher Desktop links
that directory to `~/.docker/certs.d` on the host:

```bash
mkdir -p ~/.docker/certs.d/intocps.test:5050
cp "$(mkcert -CAROOT)/rootCA.pem" ~/.docker/certs.d/intocps.test:5050/ca.crt
```

With Docker Engine, copy the file into `/etc/docker/certs.d/` instead.
Log in with a GitLab username and a personal access token that has the
`api` or `write_registry` scope, then push and pull an image to a
project:

```bash
docker login intocps.test:5050
docker tag alpine:3 intocps.test:5050/<group>/<project>/alpine:3
docker push intocps.test:5050/<group>/<project>/alpine:3
docker pull intocps.test:5050/<group>/<project>/alpine:3
```

Use the port set in `REGISTRY_PORT` (integrated package) or
`GITLAB_REGISTRY_PORT` (services CLI) if it is not `5050`.

## Run Pipelines

Attach the runner to the `dtaas-frontend` network so that its jobs
reach GitLab and the registry through Traefik. In
`~/dtaas-local-test/runner`, create `compose.yml`:

```yaml
services:
  gitlab-runner:
    container_name: gitlab-runner
    image: gitlab/gitlab-runner:alpine
    volumes:
      - "./config.toml:/etc/gitlab-runner/config.toml:ro"
      - "/var/run/docker.sock:/var/run/docker.sock:ro"
      - "./intocps.test.crt:/etc/gitlab-runner/certs/intocps.test.crt:ro"
    networks:
      - frontend

networks:
  frontend:
    name: dtaas-frontend
    external: true
```

Copy `$(mkcert -CAROOT)/rootCA.pem` to `intocps.test.crt`, create an
instance runner in GitLab (**Admin > CI/CD > Runners**), and write its
token into `config.toml`:

```toml
concurrent = 2

[[runners]]
  name = "local-test-runner"
  url = "https://intocps.test/gitlab/"
  token = "glrt-..."
  executor = "docker"
  [runners.docker]
    image = "alpine:3"
    privileged = false
    volumes = ["/cache"]
    network_mode = "dtaas-frontend"
```

Start it with `docker compose up -d`. After editing `config.toml`, run
`docker compose up -d --force-recreate`. An editor that replaces the
file leaves the container reading the old copy.

This pipeline publishes an image to the project's registry without a
privileged runner, then runs a job inside it. The runner passes the CA
to jobs in `CI_SERVER_TLS_CA_FILE`.

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

If GitLab restarts while a job starts, the job can stay in `running`
without a log. Cancel the pipeline and run it again.

## Clean Up

```bash
cd ~/dtaas-local-test/runner && docker compose down
rm -r ~/.docker/certs.d/intocps.test:*
```

Then follow the clean-up steps of the
[Local Server Testing](local-server-testing.md) guide.
