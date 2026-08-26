"""Tests for GitLab user provisioning (pkg/gitlab/provisioner.py)."""

from unittest.mock import MagicMock, Mock
from gitlab.exceptions import GitlabCreateError, GitlabError
from src.pkg.gitlab.provisioner import ensure_user_resources

USERNAME = "alice"
EMAIL = "alice@example.org"
PASSWORD = "S3cur3-p4ss"  # noqa: S105 # NOSONAR
TOKEN = "glpat-test-token-1234567890"  # noqa: S105 # NOSONAR


def _gl_with_pat(token):
    """Mock gitlab.Gitlab client whose PAT creation returns *token*."""
    gl = MagicMock()
    mock_user = Mock()
    mock_pat = Mock()
    mock_pat.token = token
    mock_user.personal_access_tokens.create.return_value = mock_pat
    gl.users.get.return_value = mock_user
    return gl


def test_ensure_user_resources_creates_user_and_pat():
    """A new user gets both a GitLab account and a PAT."""
    gl = _gl_with_pat(TOKEN)
    mock_user = Mock()
    mock_user.id = 7
    gl.users.create.return_value = mock_user

    result = ensure_user_resources(gl, USERNAME, EMAIL, PASSWORD)

    assert result.ok is True
    assert result.token == TOKEN
    assert result.username == USERNAME


def test_ensure_user_resources_already_exists_is_idempotent_noop():
    """An existing account is reported as ok with no PAT issued -- the
    password is never applied to someone else's account."""
    gl = MagicMock()
    gl.users.create.side_effect = GitlabCreateError(response_code=409)

    result = ensure_user_resources(gl, USERNAME, EMAIL, PASSWORD)

    assert result.ok is True
    assert result.token == ""
    gl.users.get.assert_not_called()


def test_ensure_user_resources_create_failure_is_reported():
    """A GitLab API failure creating the user is surfaced, not swallowed."""
    gl = MagicMock()
    gl.users.create.side_effect = GitlabError("connection refused")

    result = ensure_user_resources(gl, USERNAME, EMAIL, PASSWORD)

    assert result.ok is False
    assert "connection refused" in result.message
    assert result.token == ""


def test_ensure_user_resources_invalid_input_rejected_before_api_call():
    """Invalid fields are rejected by gitlab_common's validation before any
    GitLab API call is made."""
    gl = MagicMock()

    result = ensure_user_resources(gl, "bad username", EMAIL, PASSWORD)

    assert result.ok is False
    assert "Invalid user input" in result.message
    gl.users.create.assert_not_called()


def test_ensure_user_resources_pat_failure_after_user_created():
    """A PAT failure after successful user creation is reported distinctly."""
    gl = MagicMock()
    mock_user = Mock()
    mock_user.id = 7
    gl.users.create.return_value = mock_user
    gl.users.get.side_effect = GitlabError("timeout")

    result = ensure_user_resources(gl, USERNAME, EMAIL, PASSWORD)

    assert result.ok is False
    assert "PAT issuance failed" in result.message
