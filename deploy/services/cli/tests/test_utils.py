"""Tests for utility functions"""
from pathlib import Path
from unittest.mock import patch, Mock
from python_on_whales.exceptions import DockerException
from dtaas_services.pkg.utils import (
    check_root_unix,
    execute_docker_command,
    get_credentials_path,
    is_ci
)

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
        mock_os.getenv.return_value = None
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
        mock_os.getenv.return_value = None
        mock_os.geteuid.return_value = 501
        check_root_unix()
        mock_exit.assert_called_once_with(1)


def test_check_root_unix_no_geteuid():
    """Test check_root_unix when geteuid is not available"""
    with patch("dtaas_services.pkg.utils.platform.system", return_value="Linux"), \
            patch("dtaas_services.pkg.utils.os") as mock_os, \
            patch("dtaas_services.pkg.utils.sys.exit") as mock_exit:
        mock_os.getenv.return_value = None
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


class TestIsCi:
    """Tests for is_ci function"""
    @patch("dtaas_services.pkg.utils.os.getenv")
    def test_is_ci_with_ci_env(self, mock_getenv):
        """Test detection of CI environment variable"""
        mock_getenv.side_effect = lambda key: "true" if key == "CI" else None
        assert is_ci() is True

    @patch("dtaas_services.pkg.utils.os.getenv")
    def test_is_ci_with_github_actions_env(self, mock_getenv):
        """Test detection of GITHUB_ACTIONS environment variable"""
        mock_getenv.side_effect = lambda key: "true" if key == "GITHUB_ACTIONS" else None
        assert is_ci() is True

    @patch("dtaas_services.pkg.utils.os.getenv")
    def test_is_ci_with_gitlab_ci_env(self, mock_getenv):
        """Test detection of GITLAB_CI environment variable"""
        mock_getenv.side_effect = lambda key: "true" if key == "GITLAB_CI" else None
        assert is_ci() is True

    @patch("dtaas_services.pkg.utils.os.getenv")
    def test_is_ci_no_ci_env(self, mock_getenv):
        """Test when no CI environment variables are set"""
        mock_getenv.return_value = None
        assert is_ci() is False
