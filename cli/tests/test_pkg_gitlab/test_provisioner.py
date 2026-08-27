"""Tests for GitLab user provisioning (pkg/gitlab/provisioner.py)."""

from unittest.mock import MagicMock, Mock
from gitlab.exceptions import GitlabCreateError, GitlabError
from src.pkg.gitlab.provisioner import GitlabUser, ensure_user_resources

USERNAME = "alice"
EMAIL = "alice@example.org"
PASSWORD = "S3cur3-p4ss"  # noqa: S105 # NOSONAR
TOKEN = "glpat-test-token-1234567890"  # noqa: S105 # NOSONAR


def _user(username=USERNAME, existing_user_id=None):
    """A GitlabUser for the standard test account."""
    return GitlabUser(username, EMAIL, PASSWORD, existing_user_id=existing_user_id)


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

    result = ensure_user_resources(gl, _user())

    assert result.ok is True
    assert result.token == TOKEN
    assert result.username == USERNAME
    assert result.user_id == 7


def test_ensure_user_resources_pat_failure_reports_user_id_for_a_later_retry():
    """A PAT failure after account creation still reports the new user_id, so
    the caller can persist it for a retry that skips create_user next time."""
    gl = MagicMock()
    mock_user = Mock()
    mock_user.id = 7
    gl.users.create.return_value = mock_user
    gl.users.get.side_effect = GitlabError("timeout")

    result = ensure_user_resources(gl, _user())

    assert result.ok is False
    assert result.user_id == 7


def test_ensure_user_resources_retries_pat_with_existing_user_id():
    """A caller-supplied existing_user_id (from the registry) skips
    create_user entirely and reissues a PAT directly against that id."""
    gl = _gl_with_pat(TOKEN)

    result = ensure_user_resources(gl, _user(existing_user_id=7))

    assert result.ok is True
    assert result.token == TOKEN
    assert result.user_id == 7
    assert result.already_exists is False
    gl.users.create.assert_not_called()
    gl.users.get.assert_called_once_with(7)


def test_ensure_user_resources_retry_pat_failure_is_reported():
    """A retried PAT issuance that fails again is reported, still carrying
    the user_id so a subsequent retry can try once more."""
    gl = MagicMock()
    gl.users.get.side_effect = GitlabError("timeout")

    result = ensure_user_resources(gl, _user(existing_user_id=7))

    assert result.ok is False
    assert result.user_id == 7
    gl.users.create.assert_not_called()


def test_ensure_user_resources_already_exists_is_idempotent_noop():
    """An existing account is reported as ok with no PAT issued -- the
    password is never applied to someone else's account -- and flagged
    distinctly via already_exists so callers can warn rather than treat it
    as an unremarkable success."""
    gl = MagicMock()
    gl.users.create.side_effect = GitlabCreateError(response_code=409)

    result = ensure_user_resources(gl, _user())

    assert result.ok is True
    assert result.token == ""
    assert result.already_exists is True
    assert "not created by this run" in result.message
    gl.users.get.assert_not_called()


def test_ensure_user_resources_create_failure_is_reported():
    """A GitLab API failure creating the user is surfaced, not swallowed."""
    gl = MagicMock()
    gl.users.create.side_effect = GitlabError("connection refused")

    result = ensure_user_resources(gl, _user())

    assert result.ok is False
    assert "connection refused" in result.message
    assert result.token == ""


def test_ensure_user_resources_invalid_input_rejected_before_api_call():
    """Invalid fields are rejected by gitlab_common's validation before any
    GitLab API call is made."""
    gl = MagicMock()

    result = ensure_user_resources(gl, _user(username="bad username"))

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

    result = ensure_user_resources(gl, _user())

    assert result.ok is False
    assert "PAT issuance failed" in result.message
