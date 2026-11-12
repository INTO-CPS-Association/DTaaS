"""Values, helpers and the fixture shared by the tests of the GitLab project
step (user_projects.py). The git check, the project call and the user lookup
are patched where user_projects.py imports them, and the project base dir is
in tmp_path."""

import json
from types import SimpleNamespace

import pytest
from dtaas_services.gitlab_common import ProjectOutcome, ProjectResult, UserInfo
from dtaas_services.pkg.services.gitlab import tokens_file
from dtaas_services.pkg.services.gitlab.project_templates import ProjectTemplate
from dtaas_services.pkg.services.gitlab.user_projects import Account, ProjectRun

MODULE = "dtaas_services.pkg.services.gitlab.user_projects"
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
    """The project base dir in tmp_path, git usable, every project created
    and every lookup answering the account 7: with the run, the config
    folder and the paths of the token and records files."""
    mocker.patch.object(tokens_file.Config, "get_base_dir", return_value=tmp_path)
    config = tmp_path / "config"
    config.mkdir()
    tokens = config / "gitlab_user_tokens.json"
    return SimpleNamespace(
        ensure=mocker.patch(f"{MODULE}.ensure_project", return_value=CREATED),
        git=mocker.patch(f"{MODULE}.git_problem", return_value=""),
        find=mocker.patch(
            f"{MODULE}.find_user", return_value=(UserInfo(7, CREATED_AT), "")
        ),
        run=ProjectRun("gl", TEMPLATES, tokens),
        tokens=tokens,
        records=config / "gitlab_user_projects.json",
    )
