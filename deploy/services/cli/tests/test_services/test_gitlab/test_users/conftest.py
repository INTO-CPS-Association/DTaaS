"""Values and fixtures shared by the tests of the GitLab account step and
its orchestration (users.py)."""

from pathlib import Path
from types import SimpleNamespace

import pytest
from dtaas_services.pkg.services.gitlab import tokens_file
from dtaas_services.pkg.services.gitlab.user_projects import ProjectTally

MODULE = "dtaas_services.pkg.services.gitlab.users"
TEST_TOKEN = "fake-user-token"  # noqa: S105 # NOSONAR
ADMIN_TOKEN = "fake-admin-token"  # noqa: S105 # NOSONAR
TEST_PASSWORD = "UserP@ss123"  # noqa: S105 # NOSONAR
TEST_USERNAME = "testuser"
TEST_EMAIL = "test@example.com"
ROW = {"username": TEST_USERNAME, "email": TEST_EMAIL, "password": TEST_PASSWORD}
TEMPLATES = {"common": "https://gitlab.com/dtaas/common.git"}


def csv_rows(*names):
    """CSV rows for the users *names*."""
    return [
        {"username": name, "email": f"{name}@x.com", "password": TEST_PASSWORD}
        for name in names
    ]


@pytest.fixture
def setup(mocker, tmp_path):
    """setup_gitlab_users with the base dir in tmp_path and everything around
    the account step patched: the admin PAT and credentials file found, the
    templates set, a client, and a project step that touches nothing. Each
    test sets _process_credentials' answer (setup.process)."""
    mocker.patch(f"{MODULE}.Config")
    mocker.patch.object(tokens_file.Config, "get_base_dir", return_value=tmp_path)
    return SimpleNamespace(
        prereq=mocker.patch(
            f"{MODULE}._load_gitlab_prerequisites",
            return_value=(True, ADMIN_TOKEN, Path("/test/creds.csv")),
        ),
        templates=mocker.patch(
            f"{MODULE}.read_templates", return_value=(TEMPLATES, "")
        ),
        client=mocker.patch(f"{MODULE}.get_gitlab_client", return_value="gl"),
        process=mocker.patch(f"{MODULE}._process_credentials"),
        projects=mocker.patch(
            f"{MODULE}.provision_projects", return_value=ProjectTally()
        ),
        tokens=tmp_path / "config" / "gitlab_user_tokens.json",
    )
