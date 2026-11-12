"""Tests for the host checks of utils.py: root on Linux and macOS, and CI."""

from dtaas_services.pkg.utils import check_root_unix, is_ci


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


def test_is_ci_with_ci_env(mocker):
    """Test detection of CI environment variable"""
    mock_getenv = mocker.patch("dtaas_services.pkg.utils.os.getenv")
    mock_getenv.side_effect = lambda key: "true" if key == "CI" else None
    assert is_ci() is True
