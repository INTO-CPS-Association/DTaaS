"""Tests for users module."""

from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch, MagicMock
import pytest
from src.pkg import users
from src.pkg import users_utils
from src.pkg.project import generate_project
from tests.conftest import CONF_SERVER_CONTENT
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
    ) as mst, patch("src.pkg.users.write_state") as mw:
        mc.return_value = ma.return_value = ms.return_value = mst.return_value = None
        mw.return_value = {}
        yield {"create": mc, "add": ma, "start": ms, "stop": mst, "state": mw}


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
        "set_limits": False,
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
    """Test getComposeConfig selects the template by server type and TLS flag"""
    resources = {"cpus": 4, "mem_limit": "4G", "pids_limit": 4960, "shm_size": "512m"}
    config = {
        "server": server,
        "path": "/test",
        "resources": resources,
        "tls": tls,
        "set_limits": False,
    }
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


@pytest.fixture
def project_templates(tmp_path, monkeypatch):
    """Generate the real CLI templates into a temp dir and run the CLI from there."""
    generate_project(str(tmp_path))
    monkeypatch.chdir(tmp_path)
    return tmp_path


def _limits_config(set_limits):
    """A non-localhost user config with the given set_limits flag."""
    return {
        "server": "example.com",
        "path": "/opt/dtaas",
        "resources": {
            "cpus": 4,
            "mem_limit": "4G",
            "pids_limit": 4960,
            "shm_size": "512m",
        },
        "tls": False,
        "set_limits": set_limits,
    }


def test_get_compose_config_includes_limits_when_enabled(project_templates):
    """With set_limits true the generated service carries all four limit keys."""
    result, err = users.get_compose_config("alice", _limits_config(True))

    assert err is None
    assert result is not None
    assert result["cpus"] == "4"
    assert result["mem_limit"] == "4G"
    assert result["pids_limit"] == "4960"
    assert result["shm_size"] == "512m"


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
