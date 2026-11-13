"""Values, helpers and the fixture shared by the tests of the GitLab project
step (user_projects.py). The git check is patched where user_projects.py
imports it, the project call where gitlab_common's loop (project_run.py)
calls it, and the project base dir is in tmp_path."""

import json
from types import SimpleNamespace

import pytest
from dtaas_services.gitlab_common import ProjectOutcome, ProjectResult
from dtaas_services.pkg.services.gitlab import tokens_file
from dtaas_services.pkg.services.gitlab.project_templates import ProjectTemplate
from dtaas_services.pkg.services.gitlab.user_projects import Account, ProjectRun

MODULE = "dtaas_services.pkg.services.gitlab.user_projects"
ENSURE = "dtaas_services.gitlab_common.project_run.ensure_project"
COMMON = "https://gitlab.com/dtaas/common.git"
USER = "https://gitlab.com/dtaas/user1.git"
COMMIT = "299d6e62e3addf074b2bbaffe4c5804ee096255c"
TEMPLATES = {"common": ProjectTemplate(COMMON, COMMIT), "user": ProjectTemplate(USER)}
RERUN = "dtaas-services user add -s gitlab"
NEW_TOKEN = "fake-new-token"  # noqa: S105 # NOSONAR
SAVED_TOKEN = "fake-saved-token"  # noqa: S105 # NOSONAR
CREATED = ProjectResult(ProjectOutcome.CREATED)
CREATED_AT = "2026-11-10T09:14:31.123Z"
OLD_CREATED_AT = "2026-10-29T08:00:00.000Z"
NEW_ALICE = Account("alice", 42, NEW_TOKEN, CREATED_AT)
NEW_BOB = Account("bob", 9, "t", CREATED_AT)
# alice's account from before the run, as the account step found it.
FOUND_ALICE = Account("alice", 7, created_at=CREATED_AT)


def record(user_id, created_at, projects, created=True):
    """A record as config/gitlab_user_projects.json holds it."""
    return {
        "id": user_id,
        "created_at": created_at,
        "created": created,
        "projects": projects,
    }


def write_json(path, data):
    """Write *data* as JSON to *path*."""
    path.write_text(json.dumps(data), encoding="utf-8")


def read_json(path):
    """The JSON object saved in *path*."""
    return json.loads(path.read_text(encoding="utf-8"))


def requests_of(ensure):
    """The ProjectRequests the patched ensure_project was called with."""
    return [call.args[1] for call in ensure.call_args_list]


@pytest.fixture
def gitlab(mocker, tmp_path):
    """The project base dir in tmp_path, git usable and every project
    created: with the run and the paths of the token and records files."""
    mocker.patch.object(tokens_file.Config, "get_base_dir", return_value=tmp_path)
    config = tmp_path / "config"
    config.mkdir()
    tokens = config / "gitlab_user_tokens.json"
    return SimpleNamespace(
        ensure=mocker.patch(ENSURE, return_value=CREATED),
        git=mocker.patch(f"{MODULE}.git_problem", return_value=""),
        run=ProjectRun("gl", TEMPLATES, tokens),
        tokens=tokens,
        records=config / "gitlab_user_projects.json",
    )
