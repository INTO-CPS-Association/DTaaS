"""Start and stop the package's services with the local compose override."""

from gitlab_api import wait_for
from shell import run, step


def compose(settings, *args):
    """Run docker compose in the package with the local override."""
    run(["docker", "compose", "--env-file", "config/.env",
         "-f", "docker-compose.yml", "-f", "compose.local.yml", *args],
        cwd=settings.package_dir)


def readiness_checks(settings):
    """Return the URLs and HTTP statuses that show GitLab is ready.

    GitLab's health check passes minutes before its web interface answers,
    so the sign-in page and the registry are checked directly.
    """
    return [
        (f"{settings.gitlab_url}/users/sign_in", 200),
        (f"https://{settings.registry}/v2/", 401),
    ]


def start(settings):
    """Start every service and wait until GitLab and its registry answer."""
    step("Starting the services")
    compose(settings, "up", "-d")
    step("Waiting for GitLab; the first start takes several minutes")
    wait_for(readiness_checks(settings), settings.ca_file)


def stop(settings, remove_volumes=False):
    """Stop the services, and delete GitLab's data if remove_volumes is set."""
    if not (settings.package_dir / "compose.local.yml").exists():
        print(f"No prepared package in {settings.package_dir}; nothing to stop.")
        return
    step("Stopping the services")
    compose(settings, "down", *(["-v"] if remove_volumes else []))
