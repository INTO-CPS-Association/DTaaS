"""Register and start a GitLab runner on the package's frontend network."""

import shutil

from shell import run, step

RUNNER_COMPOSE = """services:
  gitlab-runner:
    container_name: gitlab-runner
    image: gitlab/gitlab-runner:alpine
    volumes:
      - "./config.toml:/etc/gitlab-runner/config.toml:ro"
      - "/var/run/docker.sock:/var/run/docker.sock:ro"
      - "./{hostname}.crt:/etc/gitlab-runner/certs/{hostname}.crt:ro"
    networks:
      - frontend

networks:
  frontend:
    name: dtaas-frontend
    external: true
"""


def runner_config(gitlab_url, token):
    """Return config.toml for a Docker executor on the frontend network.

    Jobs join dtaas-frontend so that the server's hostname resolves to
    Traefik, which serves both GitLab and the registry.
    """
    return f"""concurrent = 2

[[runners]]
  name = "local-test-runner"
  url = "{gitlab_url}/"
  token = "{token}"
  executor = "docker"
  [runners.docker]
    image = "alpine:3"
    privileged = false
    volumes = ["/cache"]
    network_mode = "dtaas-frontend"
"""


def start_runner(settings, gitlab):
    """Register an instance runner in GitLab and start its container."""
    step("Registering and starting a GitLab runner")
    runner = gitlab.request("POST", "user/runners", {
        "runner_type": "instance_type", "run_untagged": True,
        "description": "local-test-runner",
    })
    directory = settings.runner_dir
    directory.mkdir(parents=True, exist_ok=True)
    (directory / "compose.yml").write_text(
        RUNNER_COMPOSE.format(hostname=settings.hostname), encoding="utf-8")
    config = directory / "config.toml"
    config.touch(mode=0o600)
    config.write_text(runner_config(settings.gitlab_url, runner["token"]),
                      encoding="utf-8")
    shutil.copyfile(settings.ca_file, directory / f"{settings.hostname}.crt")
    run(["docker", "compose", "up", "-d", "--force-recreate"], cwd=directory)


def stop_runner(settings):
    """Stop the runner container if its compose project exists."""
    if (settings.runner_dir / "compose.yml").exists():
        step("Stopping the GitLab runner")
        run(["docker", "compose", "down"], cwd=settings.runner_dir)
