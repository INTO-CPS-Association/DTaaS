"""Tests for users module."""

from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch, MagicMock
import pytest
from src.pkg import users
from src.pkg import users_utils
from tests.conftest import CONF_SERVER_CONTENT
# pylint: disable=redefined-outer-name,unused-argument


@pytest.fixture
def mock_config():
    """Mock config object"""
    mock = MagicMock()
    mock.get_add_users_list.return_value = (["user1"], None)
    mock.get_delete_users_list.return_value = (["user1"], None)
    mock.get_server_dns.return_value = ("foo.example.com", None)
    mock.get_path.return_value = ("/test/path", None)
    mock.get_resource_limits.return_value = (
        {"cpus": 4, "mem_limit": "4G", "pids_limit": 4960, "shm_size": "512m"},
        None,
    )
    mock.get_tls.return_value = (False, None)
    mock.get_users.return_value = ({"add": ["user1"], "user1": {}}, None)
    return mock


@pytest.fixture
def mock_utils():
    """Mock all utils functions"""
    with patch("src.pkg.users.utils.import_yaml") as mi, patch(
        "src.pkg.users.utils.export_yaml"
    ) as me, patch("src.pkg.users.utils.replace_all") as mr:
        mi.return_value = ({"version": "3", "services": {}}, None)
        me.return_value = None
        mr.return_value = ({"image": "test"}, None)
        yield {"import": mi, "export": me, "replace": mr}


@pytest.fixture
def mock_user_operations():
    """Mock user operation functions"""
    with patch("src.pkg.users.create_user_files") as mc, patch(
        "src.pkg.users.add_users_to_compose"
    ) as ma, patch("src.pkg.users.start_user_containers") as ms, patch(
        "src.pkg.users.stop_user_containers"
    ) as mst:
        mc.return_value = ma.return_value = ms.return_value = mst.return_value = None
        yield {"create": mc, "add": ma, "start": ms, "stop": mst}


@pytest.fixture
def temp_dir_with_template():
    """Temporary directory with template folder"""
    with TemporaryDirectory() as tmpdir:
        (Path(tmpdir) / "template").mkdir(parents=True, exist_ok=True)
        (Path(tmpdir) / "template" / "test.txt").write_text("test")
        yield tmpdir


@pytest.mark.parametrize("usernames", [["testuser"], ["user1", "user2", "user3"], []])
def test_create_user_files(temp_dir_with_template, usernames):
    """Test create_user_files creates user directories"""
    assert users.create_user_files(usernames, temp_dir_with_template) is None
    assert all(Path(temp_dir_with_template, u).exists() for u in usernames)


def test_create_user_files_chowns_nested_items(temp_dir_with_template):
    """When chown succeeds, ownership is applied to the dir and every nested item."""
    with patch("src.pkg.users.shutil.chown") as mock_chown:
        assert users.create_user_files(["alice"], temp_dir_with_template) is None

    chowned = [call.args[0] for call in mock_chown.call_args_list]
    assert Path(temp_dir_with_template, "alice") in chowned
    assert Path(temp_dir_with_template, "alice", "test.txt") in chowned


def test_add_users_to_compose(mock_utils):
    """Test addUsersToCompose with resources"""
    resources = {"cpus": 4, "mem_limit": "4G", "pids_limit": 4960, "shm_size": "512m"}
    config = {
        "server": "intocps.org",
        "path": "/test",
        "resources": resources,
        "tls": False,
    }

    users.add_users_to_compose(["user1", "user2", "user3"], {"services": {}}, config)
    assert mock_utils["replace"].call_count == 3


def test_add_users_to_compose_config_error():
    """Test addUsersToCompose with config error"""
    resources = {"cpus": 4, "mem_limit": "4G", "pids_limit": 4960, "shm_size": "512m"}
    config = {"server": "localhost", "path": "/test", "resources": resources}
    with patch(
        "src.pkg.users.get_compose_config", return_value=(None, Exception("Error"))
    ):
        assert (
            users.add_users_to_compose(["user1"], {"services": {}}, config) is not None
        )


@pytest.mark.parametrize(
    "server,tls,file",
    [
        ("intocps.org", False, "users.server.yml"),
        ("intocps.org", True, "users.server.secure.yml"),
    ],
)
def test_get_compose_config(mock_utils, server, tls, file):
    """Test getComposeConfig with resources parameter and TLS flag"""
    resources = {"cpus": 4, "mem_limit": "4G", "pids_limit": 4960, "shm_size": "512m"}
    config = {"server": server, "path": "/test", "resources": resources, "tls": tls}
    _, _ = users.get_compose_config("testuser", config)
    assert mock_utils["import"].called
    mock_utils["import"].assert_called_with(file)


def test_get_compose_config_error():
    """Test getComposeConfig with error"""
    resources = {"cpus": 4, "mem_limit": "4", "pids_limit": 4960, "shm_size": "512m"}
    config = {"server": "localhost", "path": "/test", "resources": resources}
    with patch(
        "src.pkg.users.utils.import_yaml", return_value=(None, Exception("Error"))
    ):
        result, err = users.get_compose_config("testuser", config)
        assert (result, isinstance(err, Exception)) == (None, True)


@pytest.mark.parametrize(
    "func", [users.start_user_containers, users.stop_user_containers]
)
@patch("src.pkg.users.subprocess.run", return_value=MagicMock(returncode=0))
def test_container_operations(mock_run, func):
    """Test start and stop container operations"""
    func(["user1", "user2"])
    assert mock_run.called


@pytest.mark.parametrize("returncode,has_error", [(0, False), (1, True)])
@patch("src.pkg.users.subprocess.run")
def test_run_command_for_containers(mock_run, returncode, has_error):
    """Test run_command_for_containers with different return codes"""
    mock_run.return_value = MagicMock(
        returncode=returncode, stderr="Error" if has_error else ""
    )
    assert (users.run_command_for_containers("up", ["user1"]) is not None) == has_error


# addUsers tests
@pytest.mark.parametrize(
    "compose,field", [({"services": {}}, "version"), ({"version": "3"}, "services")]
)
def test_add_users_missing_fields(
    mock_config, mock_utils, mock_user_operations, compose, field
):
    """Test add_users adds missing fields to compose"""
    mock_utils["import"].return_value = (compose, None)
    assert users.add_users(mock_config) is None and field in compose


def test_add_users_returns_config_error(mock_config, mock_utils):
    """add_users returns the exception when config retrieval fails."""
    mock_config.get_add_users_list.return_value = (None, Exception("missing add list"))

    err = users.add_users(mock_config)

    assert err is not None and "missing add list" in str(err)


def test_add_users_rejects_newline_in_email(
    mock_config, mock_utils, mock_user_operations
):
    """A newline in a user's email aborts add_users without writing the rule."""
    mock_config.get_users.return_value = ({"user1": {"email": "bad\n@x.com"}}, None)

    err = users.add_users(mock_config)

    assert err is not None and "newlines" in str(err)


def test_add_users_writes_conf_server_before_starting_containers(
    mock_config, mock_utils, mock_user_operations, tmp_path, monkeypatch
):
    """Forward-auth rules are written even when 'docker compose up' fails."""
    conf = tmp_path / "config" / "conf.server"
    conf.parent.mkdir()
    conf.write_text(CONF_SERVER_CONTENT, encoding="utf-8")
    monkeypatch.setattr(users_utils, "CONF_SERVER_PATH", conf)

    mock_config.get_add_users_list.return_value = (["user3"], None)
    mock_config.get_users.return_value = (
        {"add": ["user3"], "user3": {"email": "user3@example.com"}},
        None,
    )
    mock_user_operations["start"].return_value = Exception("compose up failed")

    err = users.add_users(mock_config)

    assert err is not None and "compose up failed" in str(err)
    text = conf.read_text(encoding="utf-8")
    assert "rule.onlyu3.rule=PathPrefix(`/user3`)" in text
    assert "rule.onlyu3.whitelist=user3@example.com" in text


@pytest.mark.parametrize("export_error", [False, True])
def test_delete_user(mock_config, mock_utils, mock_user_operations, export_error):
    """Test delete_user removes users from compose"""
    compose = {"version": "3", "services": {"user1": {}, "user2": {}}}
    mock_config.get_delete_users_list.return_value = (["user1"], None)
    mock_utils["import"].return_value = (compose, None)
    mock_utils["export"].return_value = Exception("Failed") if export_error else None

    err = users.delete_user(mock_config)
    assert (err is not None) if export_error else err is None


def test_delete_user_removes_conf_server_rules(
    mock_config, mock_utils, mock_user_operations
):
    """delete_user removes each deleted user's forward-auth rule from conf.server."""
    compose = {"version": "3", "services": {"user1": {}, "user2": {}}}
    mock_config.get_delete_users_list.return_value = (["user1"], None)
    mock_utils["import"].return_value = (compose, None)

    with patch("src.pkg.users.remove_conf_server_entry") as mock_remove:
        err = users.delete_user(mock_config)

    assert err is None
    mock_remove.assert_called_once_with("user1")


def test_delete_user_handles_none_compose(
    mock_config, mock_utils, mock_user_operations
):
    """delete_user returns an error when the compose file loads as None."""
    mock_utils["import"].return_value = (None, None)

    err = users.delete_user(mock_config)

    assert err is not None and "Failed to load compose" in str(err)
