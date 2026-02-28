"""Tests for ThingsBoard permissions functions."""

from pathlib import Path
from unittest.mock import MagicMock
import dtaas_services.pkg.services.thingsboard.permissions as th_perm
# pylint: disable=W0621, W0212


def test_setup_thingsboard_certs_success(mocker):
    """Test ThingsBoard certificates setup success"""
    certs_dir = Path("/test/certs")
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.tb_cert.set_service_cert_permissions",
        return_value=(True, "success"),
    )
    mocker.patch("shutil.copy2")
    success, _ = th_perm._setup_thingsboard_certs(certs_dir, 1000, 1000)
    assert success is True


def test_setup_thingsboard_certs_os_error(mocker):
    """Test ThingsBoard certificates setup with OSError"""
    certs_dir = Path("/test/certs")
    mocker.patch("shutil.copy2", side_effect=OSError("Error"))
    success, _ = th_perm._setup_thingsboard_certs(certs_dir, 1000, 1000)
    assert success is False


def test_set_directory_ownership(mocker):
    """Test setting directory ownership"""
    directory = Path("/test/dir")
    mock_chown = mocker.patch("shutil.chown")
    mocker.patch(
        "os.walk",
        return_value=[("/test/dir", ["sub"], ["file.txt"])],
    )
    th_perm._set_directory_ownership(directory, 1000, 1000)
    assert mock_chown.call_count > 0


def test_setup_thingsboard_directories_success_non_ci(mocker):
    """Test ThingsBoard directories setup success (non-CI)"""
    base_dir = Path("/test/base")
    mock_cfg = MagicMock()
    mock_cfg.base_dir = base_dir
    mock_cfg.os_type = "linux"
    mock_cfg.thingsboard_uid = 1000
    mock_cfg.thingsboard_gid = 1000
    mocker.patch("pathlib.Path.mkdir")
    mocker.patch("pathlib.Path.chmod")
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.permissions._set_directory_ownership"
    )
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.permissions.is_ci", return_value=False
    )
    success, _ = th_perm._setup_thingsboard_directories(mock_cfg)
    assert success is True


def test_setup_thingsboard_directories_success_ci(mocker):
    """Test ThingsBoard directories setup success (CI — skips chown)"""
    base_dir = Path("/test/base")
    mock_cfg = MagicMock()
    mock_cfg.base_dir = base_dir
    mock_cfg.os_type = "linux"
    mock_cfg.thingsboard_uid = 1000
    mock_cfg.thingsboard_gid = 1000
    mocker.patch("pathlib.Path.mkdir")
    mocker.patch("pathlib.Path.chmod")
    mock_chown = mocker.patch(
        "dtaas_services.pkg.services.thingsboard.permissions._set_directory_ownership"
    )
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.permissions.is_ci", return_value=True
    )
    success, _ = th_perm._setup_thingsboard_directories(mock_cfg)
    assert success is True
    mock_chown.assert_not_called()


def test_setup_thingsboard_directories_os_error(mocker):
    """Test ThingsBoard directories setup with OSError"""
    base_dir = Path("/test/base")
    mock_cfg = MagicMock()
    mock_cfg.base_dir = base_dir
    mock_cfg.os_type = "linux"
    mock_cfg.thingsboard_uid = 1000
    mock_cfg.thingsboard_gid = 1000
    mocker.patch("pathlib.Path.mkdir", side_effect=OSError("Error"))
    success, _ = th_perm._setup_thingsboard_directories(mock_cfg)
    assert success is False


def test_verify_certificates_exist_success(tmp_path):
    """Test certificate verification when certs exist"""
    certs_dir = tmp_path
    (certs_dir / "privkey.pem").write_bytes(b"KEY")
    (certs_dir / "fullchain.pem").write_bytes(b"CERT")
    success, _ = th_perm._verify_certificates_exist(certs_dir)
    assert success is True


def test_verify_certificates_exist_missing(mocker):
    """Test certificate verification when certs are missing"""
    mocker.patch("pathlib.Path.exists", return_value=False)
    success, _ = th_perm._verify_certificates_exist(Path("/nonexistent"))
    assert success is False


def test_permissions_thingsboard_success(mocker):
    """Test ThingsBoard permissions setup success"""
    mocker.patch("platform.system", return_value="Linux")
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.permissions.copy_certs",
        return_value=(True, "copied"),
    )
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.permissions._verify_certificates_exist",
        return_value=(True, ""),
    )
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.permissions._execute_setup_operations",
        return_value=(True, ["setup1", "setup2"]),
    )
    success, _ = th_perm.permissions_thingsboard()
    assert success is True


def test_permissions_thingsboard_verify_fails(mocker):
    """Test ThingsBoard permissions when certificate verification fails"""
    mocker.patch("platform.system", return_value="Linux")
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.permissions.copy_certs",
        return_value=(True, "copied"),
    )
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.permissions._verify_certificates_exist",
        return_value=(False, "missing"),
    )
    success, _ = th_perm.permissions_thingsboard()
    assert success is False


def test_permissions_thingsboard_copy_certs_fails(mocker):
    """Test ThingsBoard permissions when copy_certs fails"""
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.permissions.copy_certs",
        return_value=(False, "copy error"),
    )
    success, msg = th_perm.permissions_thingsboard()
    assert success is False
    assert "copy error" in msg


def test_execute_setup_operations_first_fails(mocker):
    """Test _execute_setup_operations returns early when an operation fails"""
    mock_cfg = MagicMock()
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.permissions.setup_postgres_certs",
        return_value=(False, "postgres cert error"),
    )
    success, messages = th_perm._execute_setup_operations(mock_cfg)
    assert success is False
    assert "postgres cert error" in messages[0]


def test_execute_setup_operations_all_succeed(mocker):
    """Test _execute_setup_operations returns True when all operations succeed"""
    mock_cfg = MagicMock()
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.permissions.setup_postgres_certs",
        return_value=(True, "postgres ok"),
    )
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.permissions._setup_thingsboard_certs",
        return_value=(True, "tb certs ok"),
    )
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.permissions._setup_thingsboard_directories",
        return_value=(True, "dirs ok"),
    )
    success, messages = th_perm._execute_setup_operations(mock_cfg)
    assert success is True
    assert len(messages) == 3
