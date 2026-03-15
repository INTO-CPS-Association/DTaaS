"""Tests for GitLab root password retrieval and reset (password.py)."""

from unittest.mock import MagicMock
from gitlab.exceptions import GitlabError
from dtaas_services.pkg.services.gitlab import password
# pylint: disable=W0212

TEST_TOKEN = "glpat-test-token-1234567890"  # noqa: S105 # NOSONAR
TEST_PASSWORD = "Astr0n0m1c@lG28ww"  # noqa: S105 # NOSONAR
TEST_NEW_PASSWORD = "NewP@ssw0rd!"  # noqa: S105 # NOSONAR


def test_get_password_file_success(mocker):
    """Test reading password file successfully."""
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.password.execute_docker_command",
        return_value=(True, "Password: secret123\n"),
    )
    success, output = password.get_password_file()
    assert success is True
    assert "Password:" in output


def test_get_password_file_not_found(mocker):
    """Test password file not found (24h expiry)."""
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.password.execute_docker_command",
        return_value=(False, "No such file or directory"),
    )
    success, msg = password.get_password_file()
    assert success is False
    assert "Password file not found" in msg
    assert "24 hours" in msg


def test_get_password_file_other_failure(mocker):
    """Test password file read with other Docker error."""
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.password.execute_docker_command",
        return_value=(False, "container not running"),
    )
    success, msg = password.get_password_file()
    assert success is False
    assert "Failed to read initial password" in msg


def test_get_initial_root_password_success(mocker):
    """Test successfully retrieving and parsing initial root password."""
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.password.get_password_file",
        return_value=(True, "Password: MyRootPass123\n"),
    )
    success, pw = password.get_initial_root_password()
    assert success is True
    assert pw == "MyRootPass123"


def test_get_initial_root_password_parse_failure(mocker):
    """Test when file is read but password cannot be parsed."""
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.password.get_password_file",
        return_value=(True, "Some content without password line"),
    )
    success, msg = password.get_initial_root_password()
    assert success is False
    assert "Could not parse password" in msg


def test_get_initial_root_password_file_failure(mocker):
    """Test when file cannot be read."""
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.password.get_password_file",
        return_value=(False, "container error"),
    )
    success, msg = password.get_initial_root_password()
    assert success is False
    assert "container error" in msg


def test_get_root_new_password_set(monkeypatch):
    """Test reading new password from environment."""
    monkeypatch.setenv("GITLAB_ROOT_NEW_PASSWORD", TEST_NEW_PASSWORD)
    success, pw = password._get_root_new_password()
    assert success is True
    assert pw == TEST_NEW_PASSWORD


def test_get_root_new_password_not_set(monkeypatch):
    """Test error when new password env var is missing."""
    monkeypatch.delenv("GITLAB_ROOT_NEW_PASSWORD", raising=False)
    success, msg = password._get_root_new_password()
    assert success is False
    assert "GITLAB_ROOT_NEW_PASSWORD" in msg


def test_apply_password_reset_success(mocker):
    """Test successful password reset via API."""
    mock_gl = MagicMock()
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.password.get_gitlab_client",
        return_value=mock_gl,
    )
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.password.save_password",
    )
    success, msg = password._apply_password_reset(TEST_TOKEN, TEST_NEW_PASSWORD)
    assert success is True
    assert "updated successfully" in msg
    mock_gl.users.get.assert_called_once_with(password.ROOT_USER_ID)


def test_apply_password_reset_api_failure(mocker):
    """Test password reset when API request fails."""
    mock_gl = MagicMock()
    mock_gl.users.get.side_effect = GitlabError("connection refused")
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.password.get_gitlab_client",
        return_value=mock_gl,
    )
    success, msg = password._apply_password_reset(TEST_TOKEN, TEST_NEW_PASSWORD)
    assert success is False
    assert "connection refused" in msg


def test_reset_gitlab_password_success(mocker):
    """Test full password reset flow."""
    mocker.patch("dtaas_services.pkg.services.gitlab.password.Config")
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.password._load_pat_from_tokens",
        return_value=(True, TEST_TOKEN),
    )
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.password._get_root_new_password",
        return_value=(True, TEST_NEW_PASSWORD),
    )
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.password._apply_password_reset",
        return_value=(True, "GitLab root password updated successfully"),
    )
    success, msg = password.reset_gitlab_password()
    assert success is True
    assert "updated" in msg


def test_reset_gitlab_password_no_pat(mocker):
    """Test reset when PAT file is missing."""
    mocker.patch("dtaas_services.pkg.services.gitlab.password.Config")
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.password._load_pat_from_tokens",
        return_value=(False, "Token file not found"),
    )
    success, msg = password.reset_gitlab_password()
    assert success is False
    assert "Token file not found" in msg


def test_reset_gitlab_password_no_new_password(mocker):
    """Test reset when new password env var is not set."""
    mocker.patch("dtaas_services.pkg.services.gitlab.password.Config")
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.password._load_pat_from_tokens",
        return_value=(True, TEST_TOKEN),
    )
    mocker.patch(
        "dtaas_services.pkg.services.gitlab.password._get_root_new_password",
        return_value=(False, "GITLAB_ROOT_NEW_PASSWORD is not set"),
    )
    success, msg = password.reset_gitlab_password()
    assert success is False
    assert "GITLAB_ROOT_NEW_PASSWORD" in msg
