"""Check the container registry by hand and from a CI/CD pipeline."""

import time
import urllib.error

from configure import read_secret
from gitlab import GitLab
from runner import start_runner
from settings import TOOL_DIR
from shell import run, step

TEST_IMAGE = "alpine:3"
FINAL_STATES = ("success", "failed", "canceled", "skipped")
PIPELINE_FILE = TOOL_DIR / "registry-test.gitlab-ci.yml"


def push_and_pull(settings, token, project_path):
    """Log in to the registry, push an image to the project, and pull it."""
    image = f"{settings.registry}/{project_path}/alpine:3"
    step(f"Pushing and pulling {image}")
    run(["docker", "login", settings.registry, "-u", "root", "--password-stdin"],
        input_text=token)
    try:
        run(["docker", "pull", "-q", TEST_IMAGE])
        run(["docker", "tag", TEST_IMAGE, image])
        run(["docker", "push", "-q", image])
        run(["docker", "rmi", image])
        run(["docker", "pull", "-q", image])
    finally:
        run(["docker", "logout", settings.registry])


def commit_pipeline(gitlab, project_id):
    """Create or update .gitlab-ci.yml on the main branch."""
    exists = gitlab.find(
        f"projects/{project_id}/repository/files/.gitlab-ci.yml?ref=main")
    gitlab.request("POST", f"projects/{project_id}/repository/commits", {
        "branch": "main", "commit_message": "Add container registry test",
        "actions": [{"action": "update" if exists else "create",
                     "file_path": ".gitlab-ci.yml",
                     "content": PIPELINE_FILE.read_text(encoding="utf-8")}],
    })


def wait_for_pipeline(gitlab, project_id, pipeline_id, timeout=900):
    """Wait for the pipeline to finish and return its jobs."""
    deadline = time.monotonic() + timeout
    path = f"projects/{project_id}/pipelines/{pipeline_id}"
    while time.monotonic() < deadline:
        if gitlab.request("GET", path)["status"] in FINAL_STATES:
            return gitlab.request("GET", f"{path}/jobs")
        time.sleep(5)
    raise TimeoutError(f"Pipeline {pipeline_id} did not finish")


def run_pipeline(gitlab, project_id):
    """Commit the test pipeline, run it, and print each job's result."""
    step("Running the publish-and-reuse pipeline")
    commit_pipeline(gitlab, project_id)
    try:
        pipeline = gitlab.request(
            "POST", f"projects/{project_id}/pipeline?ref=main")
    except urllib.error.HTTPError as error:
        raise RuntimeError(f"Could not start the pipeline: {error}") from error
    jobs = wait_for_pipeline(gitlab, project_id, pipeline["id"])
    for job in sorted(jobs, key=lambda job: job["id"]):
        print(f"    {job['name']}: {job['status']}")
    return all(job["status"] == "success" for job in jobs)


def check_registry(settings):
    """Run the manual and the pipeline registry checks; return True if both pass."""
    token = read_secret(settings, "root-token")
    gitlab = GitLab(settings.gitlab_url, token, settings.ca_file)
    group = gitlab.ensure_group("dtaas")
    project = gitlab.ensure_project(group, "registry-test")
    push_and_pull(settings, token, project["path_with_namespace"])
    start_runner(settings, gitlab)
    passed = run_pipeline(gitlab, project["id"])
    print("Registry check passed." if passed else "Registry check FAILED.")
    return passed
