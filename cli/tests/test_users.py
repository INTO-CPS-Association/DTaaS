"""Tests for the 'user add' orchestration in users.py."""

from unittest.mock import patch
import pytest
from src.pkg import users
# pylint: disable=redefined-outer-name,unused-argument,protected-access


@pytest.fixture
def mock_utils(yaml_io):
    """Mock the utils functions add_users calls directly."""
    with yaml_io("src.pkg.users") as mocks:
        yield mocks


@pytest.mark.parametrize(
    "compose,field", [({"services": {}}, "version"), ({"version": "3"}, "services")]
)
def test_add_users_missing_fields(
    mock_config, mock_registry, mock_utils, mock_user_operations, compose, field
):
    """Test add_users adds missing fields to compose"""
    mock_utils["import"].return_value = (compose, None)
    assert users.add_users(mock_config) is None
    assert field in compose


def test_add_users_returns_registry_error(mock_config, mock_registry, mock_utils):
    """add_users returns the exception when the registry cannot be read."""
    mock_registry["load"].side_effect = ValueError("bad registry")

    err = users.add_users(mock_config)

    assert err is not None
    assert "bad registry" in str(err)


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

    assert err is not None
    assert "newlines" in str(err)


def test_add_users_rejects_invalid_username(mock_config, mock_registry, mock_utils):
    """A registry username carrying shell metacharacters aborts add_users."""
    mock_registry["load"].return_value = {"bad;rm -rf": {"email": "x@y.io"}}

    err = users.add_users(mock_config)

    assert err is not None
    assert "Invalid username" in str(err)


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


def test_check_add_supported_reports_an_unsupported_deployment(mock_config):
    """The deployment is checked before anything is staged: 'user add' on a
    localhost installation used to register users it could never provision."""
    mock_config.get_server_dns.return_value = ("localhost", None)

    err = users.check_add_supported(mock_config)

    assert err is not None
    assert "localhost" in str(err)


def test_check_add_supported_passes_a_server_deployment(mock_config):
    """A server deployment with its per-user template in place is supported."""
    with patch("src.pkg.users.load_user_template", return_value=({"x": 1}, None)):
        assert users.check_add_supported(mock_config) is None


def test_a_starting_user_alone_writes_no_compose_or_state(
    mock_config, mock_registry, mock_utils, mock_user_operations
):
    """Naming a starting user when the registry is empty does no container
    work: its workspace comes from docker-compose.yml, and an empty
    compose.users.yml would be written for nothing."""
    mock_registry["load"].return_value = {}
    mock_config.get_user_emails.return_value = ({"foo": "foo@x.io"}, None)

    err = users.add_users(mock_config, start_only=[], passwords={"foo": "pw"})

    assert err is None
    mock_user_operations["finalize"].assert_not_called()
    mock_utils["export"].assert_not_called()
