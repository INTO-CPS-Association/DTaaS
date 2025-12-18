"""Tests for utility functions"""
from pathlib import Path
from unittest.mock import patch, Mock
from python_on_whales.exceptions import DockerException
from dtaas_services.pkg.utils import check_root_unix, execute_docker_command, get_credentials_path


def test_check_root_unix_windows():
    """Test check_root_unix on Windows (should return without error)"""
    with patch("dtaas_services.pkg.utils.platform.system", return_value="Windows"):
        check_root_unix()


def test_check_root_unix_linux_as_root():
    """Test check_root_unix on Linux when running as root"""
    with patch("dtaas_services.pkg.utils.platform.system", return_value="Linux"), \
            patch("dtaas_services.pkg.utils.os") as mock_os:
        mock_os.geteuid.return_value = 0
        check_root_unix()


def test_check_root_unix_linux_not_root():
    """Test check_root_unix on Linux when not running as root"""
    with patch("dtaas_services.pkg.utils.platform.system", return_value="Linux"), \
            patch("dtaas_services.pkg.utils.os") as mock_os, \
            patch("dtaas_services.pkg.utils.sys.exit") as mock_exit:
        mock_os.geteuid.return_value = 1000
        check_root_unix()
        mock_exit.assert_called_once_with(1)


def test_check_root_unix_darwin_as_root():
    """Test check_root_unix on macOS when running as root"""
    with patch("dtaas_services.pkg.utils.platform.system", return_value="Darwin"), \
            patch("dtaas_services.pkg.utils.os") as mock_os:
        mock_os.geteuid.return_value = 0
        check_root_unix()


def test_check_root_unix_darwin_not_root():
    """Test check_root_unix on macOS when not running as root"""
    with patch("dtaas_services.pkg.utils.platform.system", return_value="Darwin"), \
            patch("dtaas_services.pkg.utils.os") as mock_os, \
            patch("dtaas_services.pkg.utils.sys.exit") as mock_exit:
        mock_os.geteuid.return_value = 501
        check_root_unix()
        mock_exit.assert_called_once_with(1)


def test_check_root_unix_no_geteuid():
    """Test check_root_unix when geteuid is not available"""
    with patch("dtaas_services.pkg.utils.platform.system", return_value="Linux"), \
            patch("dtaas_services.pkg.utils.os") as mock_os, \
            patch("dtaas_services.pkg.utils.sys.exit") as mock_exit:
        mock_os.geteuid.side_effect = AttributeError
        check_root_unix()
        mock_exit.assert_called_once_with(1)


@patch("dtaas_services.pkg.utils.DockerClient")
def test_execute_docker_command_success(mock_docker_client):
    """Test successful Docker command execution"""
    mock_client = Mock()
    mock_docker_client.return_value = mock_client
    mock_client.execute.return_value = "command output"
    success, output = execute_docker_command("test_container", ["echo", "hello"])
    assert success is True
    assert output == "command output"
    mock_client.execute.assert_called_once_with("test_container", ["echo", "hello"])


@patch("dtaas_services.pkg.utils.DockerClient")
def test_execute_docker_command_failure(mock_docker_client):
    """Test Docker command execution failure"""
    mock_client = Mock()
    mock_docker_client.return_value = mock_client
    mock_client.execute.side_effect = DockerException(["docker", "exec"], 1, b"", b"Docker error")
    success, output = execute_docker_command("test_container", ["bad", "command"])
    assert success is False
    assert "Docker error:" in output
    assert "Docker error" in output


@patch("dtaas_services.pkg.utils.Config.get_base_dir")
def test_get_credentials_path(mock_get_base_dir):
    """Test getting credentials path"""
    mock_get_base_dir.return_value = Path("/path/to/base")
    path = get_credentials_path()
    assert path == Path("/path/to/base") / "config" / "credentials.csv"
