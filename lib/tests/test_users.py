"""Tests for GitLab user provisioning (users.py)."""

from unittest.mock import MagicMock, Mock
from gitlab.exceptions import GitlabCreateError, GitlabError
from dtaas_gitlab import create_user, create_user_pat

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


def test_create_user_success():
    """Creating a valid user returns the new user id."""
    gl = MagicMock()
    mock_user = Mock()
    mock_user.id = 7
    gl.users.create.return_value = mock_user
    ok, err, user_id = create_user(gl, **_fields())
    assert ok is True
    assert err == ""
    assert user_id == 7


def test_create_user_already_exists():
    """A 409 from GitLab is reported as success with user_id=None."""
    gl = MagicMock()
    gl.users.create.side_effect = GitlabCreateError(response_code=409)
    ok, err, user_id = create_user(gl, **_fields())
    assert ok is True
    assert err == ""
    assert user_id is None


def test_create_user_request_failure():
    """A generic GitLab error is surfaced as a failure."""
    gl = MagicMock()
    gl.users.create.side_effect = GitlabError("connection refused")
    ok, err, user_id = create_user(gl, **_fields())
    assert ok is False
    assert "connection refused" in err
    assert user_id is None


def test_create_user_invalid_username_rejected():
    """Invalid usernames are rejected before any API call."""
    gl = MagicMock()
    ok, err, user_id = create_user(gl, **_fields(username="bad user"))
    assert ok is False
    assert "Invalid user input" in err
    assert user_id is None
    gl.users.create.assert_not_called()


def test_create_user_empty_values_rejected():
    """Empty fields are rejected before any API call."""
    gl = MagicMock()
    ok, err, user_id = create_user(gl, username="", email="", password="")
    assert ok is False
    assert "Invalid user input" in err
    assert user_id is None
    gl.users.create.assert_not_called()


def test_create_user_pat_success():
    """Creating a PAT for a user returns the token."""
    gl = MagicMock()
    mock_user = Mock()
    mock_pat = Mock()
    mock_pat.token = TEST_TOKEN
    mock_user.personal_access_tokens.create.return_value = mock_pat
    gl.users.get.return_value = mock_user
    ok, token = create_user_pat(gl, 42, TEST_USERNAME)
    assert ok is True
    assert token == TEST_TOKEN


def test_create_user_pat_request_failure():
    """A GitLab error while creating a PAT is surfaced as a failure."""
    gl = MagicMock()
    gl.users.get.side_effect = GitlabError("timeout")
    ok, error = create_user_pat(gl, 42, TEST_USERNAME)
    assert ok is False
    assert "timeout" in error


def test_create_user_pat_empty_token():
    """An empty token in the PAT response is treated as a failure."""
    gl = MagicMock()
    mock_user = Mock()
    mock_pat = Mock()
    mock_pat.token = ""
    mock_user.personal_access_tokens.create.return_value = mock_pat
    gl.users.get.return_value = mock_user
    ok, error = create_user_pat(gl, 42, TEST_USERNAME)
    assert ok is False
    assert "Empty token" in error
