"""Tests for shared GitLab user provisioning (gitlab_common/users.py)."""

from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, Mock

from gitlab.exceptions import GitlabCreateError, GitlabError
from gitlab_common import (
    CreateOutcome,
    PatOptions,
    create_user,
    create_user_pat,
)

TEST_TOKEN = "glpat-test-token-1234567890"  # noqa: S105 # NOSONAR
TEST_USERNAME = "testuser"
TEST_EMAIL = "test@example.com"
TEST_PASSWORD = "UserP@ss123"  # noqa: S105 # NOSONAR


def _fields(**overrides):
    """Valid create_user keyword arguments, with optional overrides."""
    base = {
        "username": TEST_USERNAME,
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD,
    }
    base.update(overrides)
    return base


def _gl_with_pat(token):
    """Mock client whose PAT creation returns *token*, plus the user mock."""
    gl = MagicMock()
    mock_user = Mock()
    mock_pat = Mock()
    mock_pat.token = token
    mock_user.personal_access_tokens.create.return_value = mock_pat
    gl.users.get.return_value = mock_user
    return gl, mock_user


def test_create_user_success():
    """Creating a valid user reports CREATED with the new user id."""
    gl = MagicMock()
    mock_user = Mock()
    mock_user.id = 7
    gl.users.create.return_value = mock_user
    result = create_user(gl, **_fields())
    assert result.outcome is CreateOutcome.CREATED
    assert result.ok is True
    assert result.user_id == 7
    assert result.error == ""


def test_create_user_already_exists():
    """A 409 reports ALREADY_EXISTS with no id, so no PAT is issued for it."""
    gl = MagicMock()
    gl.users.create.side_effect = GitlabCreateError(response_code=409)
    result = create_user(gl, **_fields())
    assert result.outcome is CreateOutcome.ALREADY_EXISTS
    assert result.ok is True
    assert result.user_id is None


def test_create_user_non_409_create_error():
    """A non-409 GitlabCreateError is a failure, not an 'already exists'."""
    gl = MagicMock()
    gl.users.create.side_effect = GitlabCreateError("bad request", response_code=400)
    result = create_user(gl, **_fields())
    assert result.outcome is CreateOutcome.FAILED
    assert result.ok is False
    assert "Failed to create user" in result.error
    assert result.user_id is None


def test_create_user_request_failure():
    """A generic GitLab error is surfaced as a failure."""
    gl = MagicMock()
    gl.users.create.side_effect = GitlabError("connection refused")
    result = create_user(gl, **_fields())
    assert result.outcome is CreateOutcome.FAILED
    assert "connection refused" in result.error


def test_create_user_invalid_username_rejected():
    """Invalid usernames are rejected before any API call."""
    gl = MagicMock()
    result = create_user(gl, **_fields(username="bad user"))
    assert result.outcome is CreateOutcome.FAILED
    assert "Invalid user input" in result.error
    gl.users.create.assert_not_called()


def test_create_user_empty_values_rejected():
    """Empty fields are rejected before any API call."""
    gl = MagicMock()
    result = create_user(gl, username="", email="", password="")
    assert result.outcome is CreateOutcome.FAILED
    assert "Invalid user input" in result.error
    gl.users.create.assert_not_called()


def test_create_user_pat_success():
    """Creating a PAT for a user returns the token."""
    gl, _ = _gl_with_pat(TEST_TOKEN)
    ok, token = create_user_pat(gl, 42, TEST_USERNAME)
    assert ok is True
    assert token == TEST_TOKEN


def test_create_user_pat_defaults_to_least_privilege():
    """Default scopes are repository-only; 'api' is never implicit."""
    gl, mock_user = _gl_with_pat(TEST_TOKEN)
    create_user_pat(gl, 42, TEST_USERNAME)
    payload = mock_user.personal_access_tokens.create.call_args[0][0]
    assert payload["scopes"] == ["read_repository", "write_repository"]
    assert "api" not in payload["scopes"]
    assert payload["name"] == "dtaas"


def test_create_user_pat_honours_custom_options():
    """Caller-supplied name, scopes, and lifetime are used verbatim."""
    gl, mock_user = _gl_with_pat(TEST_TOKEN)
    options = PatOptions(name="custom", scopes=("read_repository",), expires_days=7)
    create_user_pat(gl, 42, TEST_USERNAME, options)
    payload = mock_user.personal_access_tokens.create.call_args[0][0]
    assert payload["name"] == "custom"
    assert payload["scopes"] == ["read_repository"]
    expected = (datetime.now(timezone.utc) + timedelta(days=7)).strftime("%Y-%m-%d")
    assert payload["expires_at"] == expected


def test_create_user_pat_request_failure():
    """A GitLab error while creating a PAT is surfaced as a failure."""
    gl = MagicMock()
    gl.users.get.side_effect = GitlabError("timeout")
    ok, error = create_user_pat(gl, 42, TEST_USERNAME)
    assert ok is False
    assert "timeout" in error


def test_create_user_pat_empty_token():
    """An empty token in the PAT response is treated as a failure."""
    gl, _ = _gl_with_pat("")
    ok, error = create_user_pat(gl, 42, TEST_USERNAME)
    assert ok is False
    assert "Empty token" in error
