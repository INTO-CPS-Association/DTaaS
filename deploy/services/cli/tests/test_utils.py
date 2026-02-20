"""Tests for utility functions"""

from pathlib import Path
from unittest.mock import Mock, mock_open
from python_on_whales.exceptions import DockerException
from dtaas_services.pkg.utils import (
    check_root_unix,
    execute_docker_command,
    get_credentials_path,
    is_ci,
    _process_stderr_lines,
    _extract_stderr_line,
    _format_docker_error,
    process_credentials_file,
    create_users_from_credentials,
)
# pylint: disable=W0613

# Test fixture constants (not real credentials)
TEST_USER_1 = "testuser1"  # noqa: S105
TEST_USER_2 = "testuser2"  # noqa: S105
TEST_PASS_1 = "testpass1"  # noqa: S105
TEST_PASS_2 = "testpass2"  # noqa: S105


def test_check_root_unix_linux_as_root(mocker):
    """Test check_root_unix on Linux when running as root"""
    mocker.patch("dtaas_services.pkg.utils.platform.system", return_value="Linux")
    mock_os = mocker.patch("dtaas_services.pkg.utils.os")
    mock_os.geteuid.return_value = 0
    check_root_unix()


def test_check_root_unix_no_geteuid(mocker):
    """Test check_root_unix when geteuid is not available"""
    mocker.patch("dtaas_services.pkg.utils.platform.system", return_value="Linux")
    mock_os = mocker.patch("dtaas_services.pkg.utils.os")
    mock_exit = mocker.patch("dtaas_services.pkg.utils.sys.exit")
    mock_os.getenv.return_value = None
    mock_os.geteuid.side_effect = AttributeError
    check_root_unix()
    mock_exit.assert_called_once_with(1)


def test_execute_docker_command_success(mocker):
    """Test successful Docker command execution"""
    mock_docker_client = mocker.patch("dtaas_services.pkg.utils.DockerClient")
    mock_client = Mock()
    mock_docker_client.return_value = mock_client
    mock_client.execute.return_value = "command output"
    success, output = execute_docker_command("test_container", ["echo", "hello"])
    assert success is True
    assert output == "command output"
    mock_client.execute.assert_called_once_with("test_container", ["echo", "hello"])


def test_execute_docker_command_failure(mocker):
    """Test Docker command execution failure"""
    mock_docker_client = mocker.patch("dtaas_services.pkg.utils.DockerClient")
    mock_client = Mock()
    mock_docker_client.return_value = mock_client
    mock_client.execute.side_effect = DockerException(
        ["docker", "exec"], 1, b"", b"Docker error"
    )
    success, output = execute_docker_command("test_container", ["bad", "command"])
    assert success is False
    assert "Docker error:" in output
    assert "Docker error" in output


def test_get_credentials_path(mocker):
    """Test getting credentials path"""
    mock_get_base_dir = mocker.patch("dtaas_services.pkg.utils.Config.get_base_dir")
    mock_get_base_dir.return_value = Path("/path/to/base")
    path = get_credentials_path()
    assert path == Path("/path/to/base") / "config" / "credentials.csv"


def test_is_ci_with_ci_env(mocker):
    """Test detection of CI environment variable"""
    mock_getenv = mocker.patch("dtaas_services.pkg.utils.os.getenv")
    mock_getenv.side_effect = lambda key: "true" if key == "CI" else None
    assert is_ci() is True


def test_process_stderr_lines_empty():
    """Test processing empty stderr"""
    stderr = ""
    result = _process_stderr_lines(stderr)
    assert result == "Unknown error"


def test_extract_stderr_line_no_stderr_content():
    """Test extraction when no stderr content"""
    error_str = "First line of error\nSecond line"
    result = _extract_stderr_line(error_str)
    assert result == "First line of error"


def test_format_docker_error_no_such_container():
    """Test formatting 'No such container' error"""
    error = "No such container: my-container"
    result = _format_docker_error("my-container", error)
    assert "not running" in result
    assert "dtaas-services start" in result


def test_process_credentials_file_success(mocker):
    """Test successful credentials file processing"""
    mock_get_path = mocker.patch("dtaas_services.pkg.utils.get_credentials_path")
    mock_path = Path("/path/to/credentials.csv")
    mock_get_path.return_value = mock_path

    def mock_process(_creds_file):
        return True, ""

    mocker.patch("dtaas_services.pkg.utils.Path.exists", return_value=True)
    mocker.patch(
        "dtaas_services.pkg.utils.Path.open",
        mock_open(read_data="username,password\n"),
    )
    success, msg = process_credentials_file(
        mock_process, "test_service", "Success message"
    )
    assert success is True
    assert msg == "Success message"


def test_process_credentials_file_not_found(mocker):
    """Test when credentials file does not exist"""
    mock_get_path = mocker.patch("dtaas_services.pkg.utils.get_credentials_path")
    mock_path = Path("/path/to/credentials.csv")
    mock_get_path.return_value = mock_path

    def mock_process():
        return True, ""

    mocker.patch("dtaas_services.pkg.utils.Path.exists", return_value=False)
    success, msg = process_credentials_file(
        mock_process, "test_service", "Success message"
    )
    assert success is False
    assert "Credentials file not found" in msg


def test_process_credentials_file_os_error(mocker):
    """Test when file operation raises OSError"""
    mock_get_path = mocker.patch("dtaas_services.pkg.utils.get_credentials_path")
    mock_path = Path("/path/to/credentials.csv")
    mock_get_path.return_value = mock_path

    def mock_process():
        return True, ""

    mocker.patch("dtaas_services.pkg.utils.Path.exists", return_value=True)
    mocker.patch(
        "dtaas_services.pkg.utils.Path.open", side_effect=OSError("Read error")
    )
    success, msg = process_credentials_file(
        mock_process, "test_service", "Success message"
    )
    assert success is False
    assert "Error adding test_service users" in msg


def test_create_users_from_credentials_success(mocker):
    """Test successful user creation from credentials"""
    csv_content = "username,password\nuser1,pass1\nuser2,pass2"
    mock_file = mock_open(read_data=csv_content)

    call_count = 0

    def mock_user_creation(username, password):  # noqa: ARG001
        nonlocal call_count
        call_count += 1
        return True, ""

    mock_dictreader = mocker.patch("dtaas_services.pkg.utils.csv.DictReader")
    mock_dictreader.return_value = [
        {"username": TEST_USER_1, "password": TEST_PASS_1},
        {"username": TEST_USER_2, "password": TEST_PASS_2},
    ]
    success, error_msg = create_users_from_credentials(mock_file(), mock_user_creation)
    assert success is True
    assert error_msg == ""
    assert call_count == 2


def test_create_users_from_credentials_failure(mocker):
    """Test user creation failure"""
    csv_content = "username,password\nuser1,pass1"
    mock_file = mock_open(read_data=csv_content)

    def mock_user_creation(username, password):  # noqa: ARG001
        if username == TEST_USER_1:
            return False, "User creation failed"
        return True, ""

    mock_dictreader = mocker.patch("dtaas_services.pkg.utils.csv.DictReader")
    mock_dictreader.return_value = [
        {"username": TEST_USER_1, "password": TEST_PASS_1},
    ]
    success, error_msg = create_users_from_credentials(mock_file(), mock_user_creation)
    assert success is False
    assert error_msg == "User creation failed"
