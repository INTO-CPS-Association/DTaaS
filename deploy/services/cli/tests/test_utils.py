"""Tests for utility functions"""

from pathlib import Path
from unittest.mock import Mock, mock_open
import pytest
from dtaas_services.pkg.utils import (
    check_root_unix,
    explain_permission_error,
    permission_hint,
    write_secret_file,
    get_container_health_status,
    has_running_container,
    is_container_running,
    get_credentials_path,
    is_ci,
    process_credentials_file,
    create_users_from_credentials,
)
from tests.conftest import denied
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


def test_get_credentials_path(mocker):
    """Test getting credentials path"""
    mock_get_base_dir = mocker.patch("dtaas_services.pkg.utils.Config.get_base_dir")
    mock_get_base_dir.return_value = Path("/path/to/base")
    path = get_credentials_path()
    assert path == Path("/path/to/base") / "config" / "credentials.csv"


def test_is_container_running_true():
    """Test running container detection."""
    container = Mock()
    container.state.status = "running"
    assert is_container_running(container) is True


def test_is_container_running_false_without_state():
    """Test stopped container detection when state is missing."""
    container = Mock(spec=[])
    assert is_container_running(container) is False


def test_has_running_container_true():
    """Test list detection when one container is running."""
    stopped = Mock()
    stopped.state.status = "exited"
    running = Mock()
    running.state.status = "running"
    assert has_running_container([stopped, running]) is True


def test_get_container_health_status_unknown_state():
    """Test health fallback when status is unavailable."""
    container = Mock()
    container.state.health = True
    assert get_container_health_status(container) == "unknown state"


def test_is_ci_with_ci_env(mocker):
    """Test detection of CI environment variable"""
    mock_getenv = mocker.patch("dtaas_services.pkg.utils.os.getenv")
    mock_getenv.side_effect = lambda key: "true" if key == "CI" else None
    assert is_ci() is True


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


def test_permission_hint_names_the_file_and_the_fix():
    """The hint says whose file it probably is and the command that fixes it"""
    hint = permission_hint("/srv/config/gitlab_tokens.json")
    assert hint.startswith("Permission denied: /srv/config/gitlab_tokens.json.")
    assert "'dtaas-services service install' runs as root" in hint
    assert hint.endswith('Run: sudo chown "$USER": /srv/config/gitlab_tokens.json')


def test_explain_permission_error_adds_the_fix(tmp_path):
    """A denied access is raised again with the hint, the original as cause"""
    path = tmp_path / "gitlab_tokens.json"
    with pytest.raises(PermissionError) as caught:
        with explain_permission_error(path):
            raise denied(path)
    assert str(caught.value) == permission_hint(path)
    assert isinstance(caught.value.__cause__, PermissionError)


def test_explain_permission_error_keeps_other_errors(tmp_path):
    """Any other error passes through unchanged"""
    with pytest.raises(FileNotFoundError, match="^gone$"):
        with explain_permission_error(tmp_path):
            raise FileNotFoundError("gone")


def test_write_secret_file_replaces_the_file(tmp_path):
    """The content lands in the file and no temporary file is left"""
    path = tmp_path / "config" / "gitlab_user_tokens.json"
    write_secret_file(path, "{}")
    write_secret_file(path, '{"a": 1}')
    assert path.read_text(encoding="utf-8") == '{"a": 1}'
    assert [p.name for p in path.parent.iterdir()] == [path.name]


def test_write_secret_file_denied_names_the_fix(tmp_path, mocker):
    """A denied write reports the fix and leaves no temporary file"""
    path = tmp_path / "config" / "gitlab_user_tokens.json"
    mocker.patch.object(Path, "write_text", side_effect=denied(path))
    with pytest.raises(PermissionError, match="sudo chown"):
        write_secret_file(path, "{}")
    assert not list(path.parent.iterdir())
