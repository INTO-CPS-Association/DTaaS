"""Tests for users module."""

from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch, MagicMock
import pytest
from src.pkg import users
from src.pkg.users import (
    _next_rule_num,
    _conf_server_block,
    add_conf_server_entry,
)
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


def test_create_user_files_already_exists(temp_dir_with_template):
    """Test create_user_files when directory already exists"""
    Path(temp_dir_with_template, "testuser").mkdir(parents=True)
    assert users.create_user_files(["testuser"], temp_dir_with_template) is None


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


def test_add_users_export_error(mock_config, mock_utils, mock_user_operations):
    """Test add_users handles export errors"""
    mock_utils["export"].return_value = Exception("Export failed")
    assert users.add_users(mock_config) is not None


# deleteUser tests
@pytest.mark.parametrize("export_error", [False, True])
def test_delete_user(mock_config, mock_utils, mock_user_operations, export_error):
    """Test delete_user removes users from compose"""
    compose = {"version": "3", "services": {"user1": {}, "user2": {}}}
    mock_config.get_delete_users_list.return_value = (["user1"], None)
    mock_utils["import"].return_value = (compose, None)
    mock_utils["export"].return_value = Exception("Failed") if export_error else None

    err = users.delete_user(mock_config)
    assert (err is not None) if export_error else err is None


def test_delete_user_skips_nonexistent(
    mock_config, mock_utils, mock_user_operations, capsys
):
    """Test delete_user skips users not present in compose services"""
    compose = {"version": "3", "services": {"user1": {}}}
    mock_config.get_delete_users_list.return_value = (["user1", "ghost"], None)
    mock_utils["import"].return_value = (compose, None)
    mock_utils["export"].return_value = None

    err = users.delete_user(mock_config)

    assert err is None
    captured = capsys.readouterr()
    assert "'ghost' does not exist, skipping deletion" in captured.out
    mock_user_operations["stop"].assert_called_once_with(["user1"])


# conf.server tests

CONF_SERVER_CONTENT = (
    "rule.libms.action=auth\n"
    "rule.libms.rule=PathPrefix(`/lib`)\n"
    "\n"
    "rule.onlyu1.action=auth\n"
    "rule.onlyu1.rule=PathPrefix(`/user1`)\n"
    "rule.onlyu1.whitelist=user1@example.com\n"
    "\n"
    "rule.onlyu2.action=auth\n"
    "rule.onlyu2.rule=PathPrefix(`/user2`)\n"
    "rule.onlyu2.whitelist=user2@example.com\n"
)


def test_next_rule_num_increments_max():
    """_next_rule_num returns one past the highest existing index"""
    assert _next_rule_num(CONF_SERVER_CONTENT) == 3


def test_next_rule_num_empty_file():
    """_next_rule_num returns 1 when no onlyu rules exist yet"""
    assert _next_rule_num("rule.libms.action=auth\n") == 1


def test_conf_server_block_format():
    """_conf_server_block produces the expected 3-line block"""
    block = _conf_server_block("alice", "alice@example.com", 3)
    assert "rule.onlyu3.action=auth" in block
    assert "rule.onlyu3.rule=PathPrefix(`/alice`)" in block
    assert "rule.onlyu3.whitelist=alice@example.com" in block


def test_add_conf_server_entry_appends_block(tmp_path, monkeypatch):
    """add_conf_server_entry appends rules to an existing conf.server"""
    conf = tmp_path / "config" / "conf.server"
    conf.parent.mkdir()
    conf.write_text(CONF_SERVER_CONTENT, encoding="utf-8")
    monkeypatch.setattr(users, "CONF_SERVER_PATH", conf)

    add_conf_server_entry("alice", "alice@example.com")

    result = conf.read_text(encoding="utf-8")
    assert "rule.onlyu3.action=auth" in result
    assert "rule.onlyu3.rule=PathPrefix(`/alice`)" in result
    assert "rule.onlyu3.whitelist=alice@example.com" in result


def test_add_conf_server_entry_skips_when_no_email(tmp_path, monkeypatch):
    """add_conf_server_entry does nothing when email is empty"""
    conf = tmp_path / "config" / "conf.server"
    conf.parent.mkdir()
    conf.write_text(CONF_SERVER_CONTENT, encoding="utf-8")
    monkeypatch.setattr(users, "CONF_SERVER_PATH", conf)

    add_conf_server_entry("alice", "")

    assert conf.read_text(encoding="utf-8") == CONF_SERVER_CONTENT


def test_add_conf_server_entry_skips_when_file_missing(tmp_path, monkeypatch):
    """add_conf_server_entry does nothing when conf.server does not exist"""
    monkeypatch.setattr(users, "CONF_SERVER_PATH", tmp_path / "missing" / "conf.server")
    add_conf_server_entry("alice", "alice@example.com")  # must not raise
