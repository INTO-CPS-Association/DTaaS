"""Tests for create_user_pat and revoke_user_pats (gitlab_common/users.py)."""

from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, Mock

import pytest
from gitlab.exceptions import GitlabError
from gitlab_common import PatOptions, create_user_pat, revoke_user_pats
from tests.test_users.conftest import DROPPED, TEST_TOKEN, TEST_USERNAME


def _gl_with_pat(token):
    """Mock client whose PAT creation returns *token*, plus the user mock."""
    gl = MagicMock()
    mock_user = Mock()
    mock_pat = Mock()
    mock_pat.token = token
    mock_user.personal_access_tokens.create.return_value = mock_pat
    gl.users.get.return_value = mock_user
    return gl, mock_user


def test_create_user_pat_success():
    """Creating a PAT for a user returns the token."""
    gl, _ = _gl_with_pat(TEST_TOKEN)
    ok, token = create_user_pat(gl, 42, TEST_USERNAME)
    assert ok is True
    assert token == TEST_TOKEN


def test_create_user_pat_defaults_to_least_privilege():
    """Default scopes are repository-only: 'api' is never implicit."""
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


def test_create_user_pat_reports_a_dropped_connection():
    """The same holds for the token half, against the same instance."""
    gl = MagicMock()
    gl.users.get.side_effect = DROPPED
    ok, error = create_user_pat(gl, 42, TEST_USERNAME)
    assert ok is False
    assert "connection reset" in error


def _gl_with_tokens(*names):
    """Mock client whose active tokens carry *names*, with ids 1, 2, ..."""
    tokens = []
    for index, name in enumerate(names, 1):
        token = Mock(id=index)
        token.name = name  # Mock(name=...) would name the mock itself
        tokens.append(token)
    gl = MagicMock()
    gl.personal_access_tokens.list.return_value = tokens
    return gl


def test_revoke_user_pats_revokes_only_the_named_active_tokens():
    """The CLI's tokens go: a token the user named otherwise stays."""
    gl = _gl_with_tokens("dtaas", "laptop", "dtaas")

    ok, error = revoke_user_pats(gl, 42)

    assert (ok, error) == (True, "")
    gl.personal_access_tokens.list.assert_called_once_with(
        user_id=42, state="active", get_all=True
    )
    revoked = [c.args[0] for c in gl.personal_access_tokens.delete.call_args_list]
    assert revoked == [1, 3]


def test_revoke_user_pats_with_nothing_to_revoke_succeeds():
    """No token left under that name means nothing is left to revoke."""
    gl = _gl_with_tokens("laptop")

    assert revoke_user_pats(gl, 42) == (True, "")
    gl.personal_access_tokens.delete.assert_not_called()


@pytest.mark.parametrize("failure", [GitlabError("403 Forbidden"), DROPPED])
def test_revoke_user_pats_reports_a_failure(failure):
    """A refused or dropped request is reported, never raised."""
    gl = _gl_with_tokens("dtaas")
    gl.personal_access_tokens.delete.side_effect = failure

    ok, error = revoke_user_pats(gl, 42)

    assert ok is False
    assert "GitLab user 42" in error
    assert str(failure) in error
