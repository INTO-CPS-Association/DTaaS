"""Tests for the 'user add'/'user delete' orchestration in users.py."""

from unittest.mock import patch, MagicMock
import pytest
from src.pkg import users
# pylint: disable=redefined-outer-name,unused-argument,protected-access


@pytest.fixture
def mock_config():
    """Mock config object providing deployment settings from dtaas.toml."""
    mock = MagicMock()
    mock.get_server_dns.return_value = ("foo.example.com", None)
    mock.get_path.return_value = ("/test/path", None)
    mock.get_resource_limits.return_value = (
        {"cpus": 4, "mem_limit": "4G", "pids_limit": 4960, "shm_size": "512m"},
        None,
    )
    mock.get_tls.return_value = (False, None)
    mock.get_set_limits.return_value = (True, None)
    return mock


@pytest.fixture
def mock_registry():
    """Patch the registry store functions add_users/delete_users use."""
    with patch("src.pkg.users.load_registry") as mock_load, patch(
        "src.pkg.users.remove_from_registry"
    ) as mock_remove:
        mock_load.return_value = {"user1": {"email": "user1@x.io"}}
        yield {"load": mock_load, "remove": mock_remove}


@pytest.fixture
def mock_utils():
    """Mock the utils functions add_users/delete_users call directly."""
    with patch("src.pkg.users.utils.import_yaml") as mi, patch(
        "src.pkg.users.utils.export_yaml"
    ) as me:
        mi.return_value = ({"version": "3", "services": {}}, None)
        me.return_value = None
        yield {"import": mi, "export": me}


@pytest.fixture
def mock_user_operations():
    """Mock the users_compose functions imported into users.py"""
    with patch("src.pkg.users.create_user_files") as mc, patch(
        "src.pkg.users.add_users_to_compose"
    ) as ma, patch("src.pkg.users.finalize_compose") as mf, patch(
        "src.pkg.users.stop_user_containers"
    ) as mst, patch("src.pkg.users.write_state") as mw:
        mc.return_value = ma.return_value = mf.return_value = None
        mst.return_value = None
        mw.return_value = {}
        yield {"create": mc, "add": ma, "finalize": mf, "stop": mst, "state": mw}


# addUsers tests
@pytest.mark.parametrize(
    "compose,field", [({"services": {}}, "version"), ({"version": "3"}, "services")]
)
def test_add_users_missing_fields(
    mock_config, mock_registry, mock_utils, mock_user_operations, compose, field
):
    """Test add_users adds missing fields to compose"""
    mock_utils["import"].return_value = (compose, None)
    assert users.add_users(mock_config) is None and field in compose


def test_add_users_returns_registry_error(mock_config, mock_registry, mock_utils):
    """add_users returns the exception when the registry cannot be read."""
    mock_registry["load"].side_effect = ValueError("bad registry")

    err = users.add_users(mock_config)

    assert err is not None and "bad registry" in str(err)


def test_get_registry_users_returns_list_and_details(mock_registry):
    """_get_registry_users pairs the registry usernames with the details store."""
    mock_registry["load"].return_value = {"alice": {"email": "a@x.io"}}

    user_list, users_section = users._get_registry_users()

    assert user_list == ["alice"]
    assert users_section["alice"]["email"] == "a@x.io"


def test_add_users_rejects_newline_in_email(
    mock_config, mock_registry, mock_utils, mock_user_operations
):
    """A newline in a user's email aborts add_users without writing the rule."""
    mock_registry["load"].return_value = {"user1": {"email": "bad\n@x.com"}}

    err = users.add_users(mock_config)

    assert err is not None and "newlines" in str(err)


def test_add_users_rejects_invalid_username(mock_config, mock_registry, mock_utils):
    """A registry username carrying shell metacharacters aborts add_users."""
    mock_registry["load"].return_value = {"bad;rm -rf": {"email": "x@y.io"}}

    err = users.add_users(mock_config)

    assert err is not None and "Invalid username" in str(err)


def test_delete_users_rejects_invalid_username():
    """delete_users rejects a non-shell-safe username before touching docker."""
    err = users.delete_users(["bad name"])

    assert err is not None and "Invalid username" in str(err)


def test_skip_start_users_flags_non_running_only():
    """_skip_start_users flags only registry users whose desired_status isn't
    'running'; a missing desired_status defaults to 'running' (not skipped)."""
    users_section = {
        "alice": {"desired_status": "running"},
        "bob": {"desired_status": "paused"},
        "carol": {},
    }
    assert users._skip_start_users(users_section) == {"bob"}


def test_add_users_skips_starting_paused_or_stopped_users(
    mock_config, mock_registry, mock_utils, mock_user_operations
):
    """add_users forwards a skip_start set computed from desired_status, so a
    paused/stopped user is not silently restarted by a later 'user add'."""
    mock_registry["load"].return_value = {
        "alice": {"email": "a@x.io", "desired_status": "running"},
        "bob": {"email": "b@x.io", "desired_status": "stopped"},
    }

    err = users.add_users(mock_config)

    assert err is None
    mock_user_operations["finalize"].assert_called_once()
    assert mock_user_operations["finalize"].call_args.args[1] == {"bob"}


def test_resolve_start_only_none_means_all():
    """start_only None (config reconcile --fix) starts every provisioned user."""
    assert users._resolve_start_only(None, {"bob"}) is None


def test_resolve_start_only_subtracts_skip_start():
    """A start_only list drops any user that is also paused/stopped."""
    assert users._resolve_start_only(["alice", "bob"], {"bob"}) == ["alice"]


def test_add_users_starts_only_named_users(
    mock_config, mock_registry, mock_utils, mock_user_operations
):
    """add_users(start_only=[...]) forwards that list to finalize_compose, so
    adding one user does not restart the rest of the registry."""
    mock_registry["load"].return_value = {
        "alice": {"email": "a@x.io"},
        "bob": {"email": "b@x.io"},
        "trudy": {"email": "t@x.io"},
    }

    err = users.add_users(mock_config, start_only=["trudy"])

    assert err is None
    assert mock_user_operations["finalize"].call_args.args[2] == ["trudy"]


def test_add_users_empty_registry_is_noop(
    mock_config, mock_registry, mock_utils, mock_user_operations
):
    """An empty registry provisions nothing and starts no containers."""
    mock_registry["load"].return_value = {}

    err = users.add_users(mock_config)

    assert err is None
    mock_user_operations["finalize"].assert_not_called()


@pytest.mark.parametrize("export_error", [False, True])
def test_delete_users(mock_registry, mock_utils, mock_user_operations, export_error):
    """delete_users removes users from compose and, on success, the registry."""
    compose = {"version": "3", "services": {"user1": {}, "user2": {}}}
    mock_utils["import"].return_value = (compose, None)
    mock_utils["export"].return_value = Exception("Failed") if export_error else None

    err = users.delete_users(["user1"])

    assert (err is not None) if export_error else err is None
    if not export_error:
        mock_registry["remove"].assert_called_once_with(["user1"])


def test_delete_users_handles_none_compose(mock_registry, mock_utils):
    """delete_users returns an error when the compose file loads as None."""
    mock_utils["import"].return_value = (None, None)

    err = users.delete_users(["user1"])

    assert err is not None and "Failed to load compose" in str(err)


def test_delete_users_removes_conf_for_every_requested_name(
    mock_registry, mock_utils, mock_user_operations
):
    """conf.server rules are removed for every requested user, not just existing ones."""
    mock_utils["import"].return_value = ({"services": {"user1": {}}}, None)

    with patch("src.pkg.users.remove_conf_server_entry") as mock_remove:
        err = users.delete_users(["user1", "ghost"])

    assert err is None
    removed = {call.args[0] for call in mock_remove.call_args_list}
    assert removed == {"user1", "ghost"}


def test_delete_users_handles_non_dict_services(
    mock_registry, mock_utils, mock_user_operations
):
    """delete_users tolerates malformed YAML where 'services' is not a dict."""
    mock_utils["import"].return_value = ({"services": None}, None)

    err = users.delete_users(["user1"])

    assert err is None
    mock_registry["remove"].assert_called_once_with(["user1"])


def test_delete_users_handles_compose_without_services(
    mock_registry, mock_utils, mock_user_operations
):
    """delete_users tolerates a compose file that has no 'services' key."""
    mock_utils["import"].return_value = ({"version": "3"}, None)

    err = users.delete_users(["user1"])

    assert err is None
    mock_registry["remove"].assert_called_once_with(["user1"])


def test_delete_users_dry_run_makes_no_changes(
    mock_registry, mock_utils, mock_user_operations, capsys
):
    """A dry-run previews the plan and calls no mutating operation."""
    mock_utils["import"].return_value = ({"services": {"user1": {}}}, None)

    err = users.delete_users(["user1", "ghost"], dry_run=True)

    assert err is None
    mock_user_operations["stop"].assert_not_called()
    mock_registry["remove"].assert_not_called()
    mock_utils["export"].assert_not_called()
    out = capsys.readouterr().out
    assert "Would deprovision and stop: user1" in out
    assert "Would remove from registry: user1, ghost" in out
