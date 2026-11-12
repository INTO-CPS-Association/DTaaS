"""Tests for create_user (gitlab_common/users.py)."""

from unittest.mock import MagicMock, Mock

from gitlab.exceptions import GitlabCreateError, GitlabError
from gitlab_common import CreateOutcome, create_user
from tests.test_users.conftest import (
    DROPPED,
    TEST_EMAIL,
    TEST_PASSWORD,
    TEST_USERNAME,
)


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
    """Creating a valid user reports CREATED with the new user id and the
    account's creation time, which tells it from a later account that gets
    the same id."""
    gl = MagicMock()
    gl.users.create.return_value = Mock(id=7, created_at="2026-11-10T09:14:31.123Z")
    result = create_user(gl, **_fields())
    assert result.outcome is CreateOutcome.CREATED
    assert result.ok is True
    assert result.user_id == 7
    assert result.created_at == "2026-11-10T09:14:31.123Z"
    assert result.error == ""


def test_a_creation_time_that_is_not_text_reads_as_none():
    """An answer without a usable creation time gives "", never a guess."""
    gl = MagicMock()
    gl.users.create.return_value = Mock(id=7, created_at=None)
    assert create_user(gl, **_fields()).created_at == ""


def test_create_user_already_exists():
    """A 409 reports ALREADY_EXISTS with no id, so no PAT is issued for it."""
    gl = MagicMock()
    gl.users.create.side_effect = GitlabCreateError(response_code=409)
    result = create_user(gl, **_fields())
    assert result.outcome is CreateOutcome.ALREADY_EXISTS
    assert result.ok is True
    assert result.user_id is None


def test_create_user_already_exists_keeps_gitlabs_reason():
    """GitLab answers 409 for a taken username and for an email already on
    another account: the caller needs to know which, so its words are kept."""
    gl = MagicMock()
    gl.users.create.side_effect = GitlabCreateError(
        "Email has already been taken", response_code=409
    )
    result = create_user(gl, **_fields())
    assert result.outcome is CreateOutcome.ALREADY_EXISTS
    assert "Email has already been taken" in result.error


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


def test_create_user_reports_a_dropped_connection():
    """A connection that never reached GitLab is a requests error, which
    python-gitlab does not wrap. It is this user's failure, reported in the
    result, so a caller creating many users is not aborted by it."""
    gl = MagicMock()
    gl.users.create.side_effect = DROPPED
    result = create_user(
        gl, username=TEST_USERNAME, email=TEST_EMAIL, password=TEST_PASSWORD
    )
    assert result.outcome is CreateOutcome.FAILED
    assert "connection reset" in result.error
