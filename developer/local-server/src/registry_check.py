"""Check the container registry by hand and from a CI/CD pipeline."""

import base64
import datetime
import subprocess
import urllib.error

from configure import read_secret
from gitlab_api import GitLab
from runner import start_runner
from settings import TOOL_DIR, USERS
from shell import run, step, wait_until

TEST_IMAGE = "alpine:3"
FINAL_STATES = ("success", "failed", "canceled", "skipped")
PIPELINE_FILE = TOOL_DIR / "registry-test.gitlab-ci.yml"
# Not a member of the test project, so the registry must refuse its pulls.
OUTSIDER = USERS[1]


def project_image(settings, project_path):
    """Return the name of the test image in the project's registry."""
    return f"{settings.registry}/{project_path}/{TEST_IMAGE}"


def check_token(gitlab):
    """Fail with a hint when the stored root token no longer works."""
    try:
        gitlab.request("GET", "user")
    except urllib.error.HTTPError as error:
        if error.code == 401:
            raise RuntimeError("The stored root token has expired or is invalid; "
                               "run the 'configure' command again") from error
        raise


def push_and_pull(settings, token, image):
    """Log in to the registry as root, push image, and pull it back."""
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


def outsider_is_denied(settings, gitlab, image):
    """Tell whether a user outside the project fails to pull image."""
    step(f"Checking that {OUTSIDER} cannot pull {image}")
    user = gitlab.find_user(OUTSIDER)
    expires = datetime.date.today() + datetime.timedelta(days=1)
    token = gitlab.request("POST", f"users/{user['id']}/impersonation_tokens", {
        "name": "local-server-test", "scopes": ["read_registry"],
        "expires_at": expires.isoformat(),
    })["token"]
    run(["docker", "rmi", image])
    run(["docker", "login", settings.registry, "-u", OUTSIDER,
         "--password-stdin"], input_text=token)
    try:
        run(["docker", "pull", "-q", image])
    except subprocess.CalledProcessError:
        return True
    finally:
        run(["docker", "logout", settings.registry])
    return False


def commit_pipeline(gitlab, project_id):
    """Put the test pipeline on the main branch without starting a pipeline.

    The commit carries [skip ci] so that only run_pipeline starts one, and
    it is skipped when the file already has the same content.
    """
    content = PIPELINE_FILE.read_text(encoding="utf-8")
    current = gitlab.find(
        f"projects/{project_id}/repository/files/.gitlab-ci.yml?ref=main")
    if current and base64.b64decode(current["content"]).decode() == content:
        return
    gitlab.request("POST", f"projects/{project_id}/repository/commits", {
        "branch": "main", "commit_message": "Add container registry test [skip ci]",
        "actions": [{"action": "update" if current else "create",
                     "file_path": ".gitlab-ci.yml", "content": content}],
    })


def wait_for_pipeline(gitlab, project_id, pipeline_id, timeout=900):
    """Wait for the pipeline to finish and return its jobs."""
    path = f"projects/{project_id}/pipelines/{pipeline_id}"
    wait_until(lambda: gitlab.request("GET", path)["status"] in FINAL_STATES,
               timeout, 5, f"pipeline {pipeline_id}")
    return gitlab.request("GET", f"{path}/jobs")


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
    """Run the manual, access and pipeline checks; return True if all pass."""
    token = read_secret(settings, "root-token")
    gitlab = GitLab(settings.gitlab_url, token, settings.ca_file)
    check_token(gitlab)
    group = gitlab.ensure_group("dtaas")
    project = gitlab.ensure_project(group, "registry-test")
    image = project_image(settings, project["path_with_namespace"])
    push_and_pull(settings, token, image)
    denied = outsider_is_denied(settings, gitlab, image)
    print(f"    {OUTSIDER} denied: {'yes' if denied else 'NO'}")
    start_runner(settings, gitlab)
    passed = run_pipeline(gitlab, project["id"]) and denied
    print("Registry check passed." if passed else "Registry check FAILED.")
    return passed
