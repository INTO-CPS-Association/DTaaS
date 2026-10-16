"""Tests for retrying the token of an account an earlier run created
(users_gitlab.py): it needs no password, since only the token is retried."""

import json
from pathlib import Path
from unittest.mock import MagicMock, patch
import pytest
from src.pkg import users
# pylint: disable=redefined-outer-name

RETRIED = "glpat-retried"  # noqa: S105 # NOSONAR

CASES = {
    "additional": ({"alice": {"email": "a@x.io", "gitlab_user_id": 7}}, {}, {}),
    "starting": (
        {},
        {"alice": "a@x.io"},
        {"alice": {"gitlab_user_id": 7}},
    ),
}


@pytest.fixture
def retry_setup(mock_config, mock_registry):
    """Configure an 'alice' with an account id and no token, either as an
    additional user or as a dtaas.toml starting user; yields a function that
    takes the case name and returns the patched starting markers."""
    mock_config.get_gitlab_provision.return_value = (True, None)

    def setup(case):
        registered, starting, markers = CASES[case]
        mock_registry["load"].return_value = registered
        mock_config.get_user_emails.return_value = (starting, None)
        return markers

    return setup


def _gl_issuing(token):
    """A GitLab client with no earlier token to revoke, issuing *token*."""
    gl = MagicMock()
    gl.personal_access_tokens.list.return_value = []
    gl.users.get.return_value.personal_access_tokens.create.return_value.token = token
    return gl


@pytest.mark.usefixtures("mock_utils", "mock_user_operations")
@pytest.mark.parametrize("case", list(CASES))
def test_a_lost_token_is_reissued_without_a_password(mock_config, retry_setup, case):
    """The documented recovery: naming the user again, with no password,
    revokes any earlier 'dtaas' token on the account and issues a new one."""
    markers = retry_setup(case)
    gl = _gl_issuing(RETRIED)

    with patch(
        "src.pkg.users_gitlab.gitlabPkg.resolve_client", return_value=(gl, None)
    ), patch(
        "src.pkg.users_gitlab_targets.load_starting_gitlab", return_value=markers
    ), patch("src.pkg.users_gitlab_records.set_gitlab_pat_issued") as issued:
        err = users.add_users(mock_config, start_only=[], passwords={"alice": None})

    assert err is None
    gl.personal_access_tokens.list.assert_called_once()
    gl.users.get.assert_called_once_with(7)
    issued.assert_called_once_with(["alice"])
    saved = json.loads(Path("gitlab_user_tokens.json").read_text(encoding="utf-8"))
    assert saved["alice"] == RETRIED


@pytest.mark.usefixtures("mock_utils", "mock_user_operations")
def test_a_retry_with_no_client_is_a_failure(mock_config, retry_setup, capsys):
    """An account waiting for its token has work to do, so a missing admin
    token fails it rather than passing it over in silence."""
    retry_setup("additional")

    with patch(
        "src.pkg.users_gitlab.gitlabPkg.resolve_client",
        return_value=(None, Exception("No GitLab PAT configured")),
    ):
        err = users.add_users(mock_config, start_only=[], passwords={"alice": None})

    assert "alice" in str(err)
    assert "skipped for every user" in capsys.readouterr().out
