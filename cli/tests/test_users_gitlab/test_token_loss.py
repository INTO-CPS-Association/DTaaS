"""Tests for a token GitLab issued but 'user add' could not save
(users_gitlab.py): it is revoked, and the run stops issuing tokens."""

from unittest.mock import MagicMock, patch
import pytest
from src.pkg import users
from src.pkg.gitlab.provisioner import ProvisionResult
# pylint: disable=redefined-outer-name,unused-argument

ALICE = ProvisionResult("alice", True, "created", "glpat-alice", user_id=1)


@pytest.fixture
def run_add(mock_config, mock_registry, mock_utils, mock_user_operations):
    """Run 'user add alice bob' with GitLab mocked and every token save
    failing; yields a function taking the revoke outcome and the account
    results, which returns (err, gitlab mocks)."""
    mock_config.get_gitlab_provision.return_value = (True, None)
    mock_registry["load"].return_value = {
        "alice": {"email": "a@x.io"},
        "bob": {"email": "b@x.io"},
    }

    def run(revoked=(True, ""), accounts=(ALICE,)):
        with patch("src.pkg.users_gitlab.gitlabPkg") as api, patch(
            "src.pkg.users_gitlab_records.utils.write_secret_file",
            side_effect=OSError("disk full"),
        ), patch("src.pkg.users_gitlab_records.set_gitlab_user_ids"):
            api.resolve_client.return_value = (MagicMock(), None)
            api.revoke_issued_tokens.return_value = revoked
            api.ensure_user_resources.side_effect = list(accounts)
            err = users.add_users(
                mock_config,
                start_only=["alice", "bob"],
                passwords={"alice": "pw", "bob": "pw"},
            )
        return err, api

    return run


def test_an_unsaved_token_is_revoked_and_the_run_stops(run_add, capsys):
    """Nobody holds the token, so it goes at once; bob gets no account,
    since his token could not be saved either."""
    err, api = run_add()

    api.revoke_issued_tokens.assert_called_once()
    assert api.revoke_issued_tokens.call_args.args[1] == 1
    assert api.ensure_user_resources.call_count == 1
    out = capsys.readouterr().out
    assert "GitLab token for 'alice' not saved; revoked." in out
    assert "disk full" in out
    assert "GitLab provisioning stopped for: bob" in out
    assert "alice, bob" in str(err)


def test_an_unsaved_token_that_cannot_be_revoked_is_named(run_add, capsys):
    """The admin is told the token is live and must be revoked by hand."""
    err, _api = run_add(revoked=(False, "403 Forbidden"))

    out = capsys.readouterr().out
    assert "GitLab token for 'alice' not saved, still valid." in out
    assert "403 Forbidden" in out
    assert "Revoke it in GitLab." in out
    assert err is not None


def test_a_retried_token_is_revoked_on_the_recorded_account(
    run_add, mock_registry
):
    """On a retry the account id is the registry's, not a new one."""
    mock_registry["load"].return_value["alice"]["gitlab_user_id"] = 7
    retried = ProvisionResult("alice", True, "issued", "glpat-alice", user_id=7)

    _err, api = run_add(accounts=(retried,))

    assert api.revoke_issued_tokens.call_args.args[1] == 7


def test_an_unusable_token_file_creates_no_account(
    run_add, usable_token_file, capsys
):
    """The preflight runs before any account or token exists."""
    usable_token_file.return_value = Exception("token file cannot be used")

    err, api = run_add()

    api.ensure_user_resources.assert_not_called()
    assert "GitLab provisioning skipped for every user" in capsys.readouterr().out
    assert "alice, bob" in str(err)
