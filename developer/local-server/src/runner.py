"""Register and start a GitLab runner on the package's frontend network."""

import shutil
from string import Template

from files import write_private
from settings import TOOL_DIR
from shell import run, step

RUNNER_FILES = TOOL_DIR / "runner"


def runner_config(gitlab_url, token):
    """Return config.toml for the runner from the template file."""
    template = (RUNNER_FILES / "config.toml.template").read_text(encoding="utf-8")
    return Template(template).substitute(gitlab_url=gitlab_url, token=token)


def start_runner(settings, gitlab):
    """Register an instance runner in GitLab and start its container."""
    step("Registering and starting a GitLab runner")
    runner = gitlab.request("POST", "user/runners", {
        "runner_type": "instance_type", "run_untagged": True,
        "description": "local-test-runner",
    })
    directory = settings.runner_dir
    directory.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(RUNNER_FILES / "compose.yml", directory / "compose.yml")
    write_private(directory / "config.toml",
                  runner_config(settings.gitlab_url, runner["token"]))
    shutil.copyfile(settings.ca_file, directory / "ca.crt")
    run(["docker", "compose", "up", "-d", "--force-recreate"], cwd=directory)


def stop_runner(settings):
    """Stop the runner container if its compose project exists."""
    if (settings.runner_dir / "compose.yml").exists():
        step("Stopping the GitLab runner")
        run(["docker", "compose", "down"], cwd=settings.runner_dir)
