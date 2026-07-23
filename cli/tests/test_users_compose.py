"""Tests for the compose/container plumbing in users_compose.py."""

from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch, MagicMock
import pytest
from src.pkg import users_compose
from src.pkg.project import generate_user_templates
# pylint: disable=redefined-outer-name


@pytest.fixture
def mock_utils():
    """Mock all utils functions"""
    with patch("src.pkg.users_compose.utils.import_yaml") as mi, patch(
        "src.pkg.users_compose.utils.export_yaml"
    ) as me, patch("src.pkg.users_compose.utils.replace_all") as mr:
        mi.return_value = ({"version": "3", "services": {}}, None)
        me.return_value = None
        mr.return_value = ({"image": "test"}, None)
        yield {"import": mi, "export": me, "replace": mr}


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
    assert users_compose.create_user_files(usernames, temp_dir_with_template) is None
    assert all(Path(temp_dir_with_template, u).exists() for u in usernames)


def test_create_user_files_chowns_nested_items(temp_dir_with_template):
    """When chown succeeds, ownership is applied to the dir and every nested item."""
    with patch("src.pkg.users_compose.shutil.chown") as mock_chown:
        assert (
            users_compose.create_user_files(["alice"], temp_dir_with_template) is None
        )

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

    users_compose.add_users_to_compose(
        ["user1", "user2", "user3"], {"services": {}}, config
    )
    assert mock_utils["replace"].call_count == 3


def test_add_users_to_compose_config_error():
    """Test addUsersToCompose with config error"""
    resources = {"cpus": 4, "mem_limit": "4G", "pids_limit": 4960, "shm_size": "512m"}
    config = {"server": "localhost", "path": "/test", "resources": resources}
    with patch(
        "src.pkg.users_compose.get_compose_config",
        return_value=(None, Exception("Error")),
    ):
        result = users_compose.add_users_to_compose(["user1"], {"services": {}}, config)
        assert result is not None


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
    _, _ = users_compose.get_compose_config("testuser", config)
    assert mock_utils["import"].called
    mock_utils["import"].assert_called_with(file)


def test_get_compose_config_error():
    """Test getComposeConfig with error"""
    resources = {"cpus": 4, "mem_limit": "4", "pids_limit": 4960, "shm_size": "512m"}
    config = {"server": "localhost", "path": "/test", "resources": resources}
    with patch(
        "src.pkg.users_compose.utils.import_yaml",
        return_value=(None, Exception("Error")),
    ):
        result, err = users_compose.get_compose_config("testuser", config)
        assert (result, isinstance(err, Exception)) == (None, True)


@pytest.fixture
def project_templates(tmp_path, monkeypatch):
    """Generate the real CLI templates into a temp dir and run the CLI from there."""
    generate_user_templates(str(tmp_path))
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
    result, err = users_compose.get_compose_config("alice", _limits_config(True))

    assert err is None
    assert result is not None
    assert result["cpus"] == "4"
    assert result["mem_limit"] == "4G"
    assert result["pids_limit"] == "4960"
    assert result["shm_size"] == "512m"


def test_get_compose_config_missing_template(tmp_path, monkeypatch):
    """A missing user-workspace template yields a clear, actionable error."""
    monkeypatch.chdir(tmp_path)  # no users.server.yml in this directory

    result, err = users_compose.get_compose_config("alice", _limits_config(False))

    assert result is None
    assert err is not None and "deployment generate" in str(err)


@pytest.mark.parametrize(
    "func", [users_compose.start_user_containers, users_compose.stop_user_containers]
)
@patch("src.pkg.users_compose.subprocess.run", return_value=MagicMock(returncode=0))
def test_container_operations(mock_run, func):
    """Test start and stop container operations"""
    func(["user1", "user2"])
    assert mock_run.called


@pytest.mark.parametrize("returncode,has_error", [(0, False), (1, True)])
@patch("src.pkg.users_compose.subprocess.run")
def test_run_command_for_containers(mock_run, returncode, has_error):
    """Test run_command_for_containers with different return codes"""
    mock_run.return_value = MagicMock(
        returncode=returncode, stderr="Error" if has_error else ""
    )
    result = users_compose.run_command_for_containers(
        ["docker", "compose", "up"], ["user1"]
    )
    assert (result is not None) == has_error


@patch("src.pkg.users_compose.subprocess.run", return_value=MagicMock(returncode=0))
def test_stop_user_containers_targets_named_services(mock_run):
    """stop_user_containers uses 'rm --stop --force <services>', not 'down'.

    'docker compose down' takes no SERVICE arguments and tears down the whole
    project; 'rm --stop --force' stops and removes only the named services.
    """
    users_compose.stop_user_containers(["alice", "bob"])

    argv = mock_run.call_args.args[0]
    assert "down" not in argv
    assert "rm" in argv and "--stop" in argv and "--force" in argv
    assert argv[-2:] == ["alice", "bob"]


def test_finalize_compose_starts_everyone_by_default(mock_utils):
    """With no skip_start, finalize_compose starts every service."""
    compose = {"services": {"alice": {}, "bob": {}}}
    with patch(
        "src.pkg.users_compose.start_user_containers", return_value=None
    ) as mock_start, patch("src.pkg.users_compose.write_state"):
        users_compose.finalize_compose(compose)

    assert set(mock_start.call_args.args[0]) == {"alice", "bob"}


def test_finalize_compose_skips_paused_or_stopped_users(mock_utils):
    """A username in skip_start is not passed to start_user_containers.

    This is what makes 'user pause'/'stop' durable: without it, the next
    'user add' (which re-provisions everyone on every run) would silently
    restart a user that was intentionally suspended.
    """
    compose = {"services": {"alice": {}, "bob": {}}}
    with patch(
        "src.pkg.users_compose.start_user_containers", return_value=None
    ) as mock_start, patch("src.pkg.users_compose.write_state"):
        users_compose.finalize_compose(compose, skip_start={"bob"})

    assert mock_start.call_args.args[0] == ["alice"]
