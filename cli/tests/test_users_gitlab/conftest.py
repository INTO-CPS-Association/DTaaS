"""Fixtures shared by the tests of users_gitlab.py, which drive it through
users.add_users (the public entry point) and so mirror test_users.py's."""

from unittest.mock import patch, MagicMock
import pytest
from src.gitlab_common import ProjectTemplates
from src.pkg.gitlab.provisioner import ProvisionResult

TEMPLATE_KEYS = {
    "common_template": "https://gitlab.com/dtaas/common.git",
    "user_template": "https://gitlab.com/dtaas/user1.git",
}
TEMPLATES = ProjectTemplates(
    TEMPLATE_KEYS["common_template"],
    TEMPLATE_KEYS["user_template"],
)
# pylint: disable=redefined-outer-name,unused-argument


@pytest.fixture
def mock_config(mock_config):
    """The shared deployment config, plus the [gitlab] getters these tests
    drive provisioning through."""
    mock_config.get_gitlab_templates.return_value = (dict(TEMPLATE_KEYS), None)
    mock_config.get_gitlab_import_timeout.return_value = (None, None)
    mock_config.get_gitlab_import_deadline.return_value = (None, None)
    return mock_config


@pytest.fixture(autouse=True)
def mock_gitlab_projects():
    """Stub the project step, which every successful account run reaches, and
    the registry write that follows it, so no test in this module writes a
    real dtaas.users.registry.json into the working directory."""
    with patch(
        "src.pkg.users_gitlab.gitlabPkg.provision_user_projects", return_value=True
    ) as mock_projects, patch(
        "src.pkg.users_gitlab_records.set_gitlab_projects_created"
    ):
        yield mock_projects


@pytest.fixture
def mock_utils(yaml_io):
    """Mock the utils functions add_users calls directly."""
    with yaml_io("src.pkg.users") as mocks:
        yield mocks


@pytest.fixture
def gitlab_env(mock_config, mock_utils, mock_user_operations):
    """Enable provisioning and patch the client, the account step, the
    container work and every persistence call, so a test can drive add_users
    and assert on the project step alone."""
    mock_config.get_gitlab_provision.return_value = (True, None)
    account = ProvisionResult("alice", True, "created", "glpat-token", user_id=42)
    with patch(
        "src.pkg.users_gitlab.gitlabPkg.resolve_client",
        return_value=(MagicMock(), None),
    ), patch(
        "src.pkg.users_gitlab.gitlabPkg.ensure_user_resources", return_value=account
    ) as ensure, patch(
        "src.pkg.users_gitlab_records.utils.write_secret_file"
    ), patch(
        "src.pkg.users_gitlab_records.set_gitlab_pat_issued"
    ) as pat_issued, patch(
        "src.pkg.users_gitlab_records.set_gitlab_user_ids"
    ), patch(
        "src.pkg.users_gitlab_records.set_gitlab_projects_created"
    ) as projects_created:
        yield {
            "ensure": ensure,
            "pat_issued": pat_issued,
            "projects_created": projects_created,
        }
