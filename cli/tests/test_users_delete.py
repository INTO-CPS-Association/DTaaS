"""Tests for the 'user delete' orchestration in users_delete.py."""

from unittest.mock import patch
import pytest
from src.pkg import users_delete
from src.pkg.registry import (
    load_starting_gitlab,
    register_starting_users,
    set_gitlab_user_ids,
)
# pylint: disable=redefined-outer-name,unused-argument


@pytest.fixture
def mock_registry():
    """Patch the registry store functions delete_users uses."""
    with patch("src.pkg.users_delete.load_registry") as mock_load, patch(
        "src.pkg.users_delete.remove_from_registry"
    ) as mock_remove:
        mock_load.return_value = {"user1": {"email": "user1@x.io"}}
        yield {"load": mock_load, "remove": mock_remove}


@pytest.fixture
def mock_utils(yaml_io):
    """Mock the utils functions delete_users calls directly."""
    with yaml_io("src.pkg.users_delete") as mocks:
        yield mocks


@pytest.fixture
def mock_user_operations():
    """Mock the container and state functions imported into users_delete.py."""
    with patch("src.pkg.users_delete.stop_user_containers") as mst, patch(
        "src.pkg.users_delete.write_state"
    ) as mw:
        mst.return_value = None
        mw.return_value = {}
        yield {"stop": mst, "state": mw}


@pytest.fixture(autouse=True)
def mock_token_file(tmp_path, monkeypatch):
    """Run every test in its own directory, so the credentials file a delete
    rewrites is never the one in the checkout."""
    monkeypatch.chdir(tmp_path)


def test_delete_users_rejects_invalid_username():
    """delete_users rejects a non-shell-safe username before touching docker."""
    err = users_delete.delete_users(["bad name"])

    assert err is not None
    assert "Invalid username" in str(err)


@pytest.mark.parametrize("export_error", [False, True])
def test_delete_users(mock_registry, mock_utils, mock_user_operations, export_error):
    """delete_users removes users from compose and, on success, the registry."""
    compose = {"version": "3", "services": {"user1": {}, "user2": {}}}
    mock_utils["import"].return_value = (compose, None)
    mock_utils["export"].return_value = Exception("Failed") if export_error else None

    err = users_delete.delete_users(["user1"])

    assert (err is not None) if export_error else err is None
    if not export_error:
        mock_registry["remove"].assert_called_once_with(["user1"])


def test_delete_users_handles_none_compose(mock_registry, mock_utils):
    """delete_users returns an error when the compose file loads as None."""
    mock_utils["import"].return_value = (None, None)

    err = users_delete.delete_users(["user1"])

    assert err is not None
    assert "Failed to load compose" in str(err)


def test_delete_users_removes_conf_for_every_requested_name(
    mock_registry, mock_utils, mock_user_operations
):
    """conf.server rules are removed for every requested user, not just
    the ones that are provisioned."""
    mock_utils["import"].return_value = ({"services": {"user1": {}}}, None)

    with patch("src.pkg.users_delete.remove_conf_server_entry") as mock_remove:
        err = users_delete.delete_users(["user1", "ghost"])

    assert err is None
    removed = {call.args[0] for call in mock_remove.call_args_list}
    assert removed == {"user1", "ghost"}


@pytest.mark.parametrize("compose", [{"services": None}, {"version": "3"}])
def test_delete_users_tolerates_malformed_compose(
    mock_registry, mock_utils, mock_user_operations, compose
):
    """A compose file whose 'services' is missing or not a dict is tolerated."""
    mock_utils["import"].return_value = (compose, None)

    err = users_delete.delete_users(["user1"])

    assert err is None
    mock_registry["remove"].assert_called_once_with(["user1"])


def test_delete_users_dry_run_makes_no_changes(
    mock_registry, mock_utils, mock_user_operations, capsys
):
    """A dry-run previews the plan and calls no mutating operation."""
    mock_utils["import"].return_value = ({"services": {"user1": {}}}, None)

    err = users_delete.delete_users(["user1", "ghost"], dry_run=True)

    assert err is None
    mock_user_operations["stop"].assert_not_called()
    mock_registry["remove"].assert_not_called()
    mock_utils["export"].assert_not_called()
    out = capsys.readouterr().out
    assert "Would deprovision and stop: user1" in out
    assert "Would remove from registry: user1, ghost" in out
    assert "GitLab accounts stay; CLI tokens would be revoked" in out


def test_delete_finishes_then_fails_when_a_token_is_not_revoked(
    mock_registry, mock_utils, mock_user_operations
):
    """The workspace and registry entry still go, and the command fails."""
    mock_utils["import"].return_value = ({"services": {"user1": {}}}, None)

    with patch(
        "src.pkg.users_delete.release_gitlab_records", return_value=["user1"]
    ):
        err = users_delete.delete_users(["user1"])

    assert "GitLab tokens not revoked for: user1" in str(err)
    mock_registry["remove"].assert_called_once_with(["user1"])
    mock_user_operations["state"].assert_called_once()


def test_delete_says_nothing_about_gitlab_for_an_unprovisioned_user(
    mock_registry, mock_utils, mock_user_operations, capsys
):
    """A deployment with no GitLab provisioning gets no GitLab noise."""
    mock_registry["load"].return_value = {"user1": {"email": "u@x.io"}}
    mock_utils["import"].return_value = ({"services": {"user1": {}}}, None)

    users_delete.delete_users(["user1"])

    assert "GitLab" not in capsys.readouterr().out


@pytest.mark.usefixtures("mock_utils", "mock_user_operations")
@pytest.mark.parametrize("still_in_toml", [True, False])
def test_a_starting_users_token_is_revoked_like_any_other(capsys, still_in_toml):
    """A starting user's token is revoked and its markers cleared, whether or
    not dtaas.toml still lists it. While it does, its workspace is dtaas.toml's,
    so its forward-auth rule stays and no 'does not exist' line is printed."""
    register_starting_users(["username1"])
    set_gitlab_user_ids({"username1": 9})
    starting = ["username1"] if still_in_toml else []

    with patch("src.pkg.users_gitlab_records.Config"), patch(
        "src.pkg.users_gitlab_records.gitlabPkg"
    ) as api, patch("src.pkg.users_delete.remove_conf_server_entry") as conf:
        api.resolve_client.return_value = ("gl", None)
        api.revoke_issued_tokens.return_value = (True, "")
        err = users_delete.delete_users(["username1"], starting=starting)

    assert err is None
    api.revoke_issued_tokens.assert_called_once_with("gl", 9)
    assert load_starting_gitlab() == {}
    assert (conf.call_count == 0) is still_in_toml
    out = capsys.readouterr().out
    assert "GitLab token revoked for 'username1'" in out
    assert ("is a dtaas.toml starting user" in out) is still_in_toml
    assert ("does not exist" in out) is not still_in_toml
