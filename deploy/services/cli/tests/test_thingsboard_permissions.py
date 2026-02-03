# pylint: disable=redefined-outer-name
# pylint: disable=W0212
"""Tests for ThingsBoard permissions functions."""

from pathlib import Path
from unittest.mock import patch, Mock, MagicMock
import pytest
import dtaas_services.pkg.thingsboard_permissions as th_perm
from dtaas_services.pkg.cert import set_service_cert_permissions, CertPermissionContext


@pytest.fixture
def mock_config():
    """Mock Config class"""
    with patch("dtaas_services.pkg.thingsboard_permissions.Config") as mock:
        mock_instance = Mock()
        mock_instance.get_value.side_effect = lambda key: {
            "HOSTNAME": "test.example.com",
            "POSTGRES_UID": "999",
            "POSTGRES_GID": "999",
            "THINGSBOARD_UID": "1000",
            "THINGSBOARD_GID": "1000",
        }.get(key, "default")
        mock.return_value = mock_instance
        mock.get_base_dir.return_value = Path("/test/base")
        yield mock


@pytest.mark.parametrize(
    "os_type,should_call_chown",
    [
        ("linux", True),
        ("darwin", True),
        ("windows", False),
    ],
)
def test_set_cert_ownership(os_type, should_call_chown):
    """Test certificate ownership setting on different platforms"""

    cert_path = Path("/test/cert.pem")
    with patch("dtaas_services.pkg.cert.shutil.chown") as mock_chown, patch(
        "dtaas_services.pkg.cert.platform.system", return_value=os_type
    ), patch("dtaas_services.pkg.cert.is_ci", return_value=False), patch(
        "pathlib.Path.chmod"
    ):
        ctx = CertPermissionContext("Test", cert_path, 999, 999)
        set_service_cert_permissions(ctx)
        if os_type in ("linux", "darwin"):
            mock_chown.assert_called_once()
        else:
            mock_chown.assert_not_called()


def test_setup_postgres_certs_scenarios():
    """Test PostgreSQL certificates setup with scenarios"""
    certs_dir = Path("/test/certs")
    # Success
    with patch(
        "dtaas_services.pkg.thingsboard_permissions.set_service_cert_permissions",
        return_value=(True, "success"),
    ), patch("shutil.copy2"):
        success, _ = th_perm._setup_postgres_certs(certs_dir, 999, 999)
        assert success is True
    # OSError
    with patch("shutil.copy2", side_effect=OSError("Error")):
        success, _ = th_perm._setup_postgres_certs(certs_dir, 999, 999)
        assert success is False


def test_setup_thingsboard_certs_scenarios():
    """Test ThingsBoard certificates setup with scenarios"""
    certs_dir = Path("/test/certs")
    # Success
    with patch(
        "dtaas_services.pkg.thingsboard_permissions.set_service_cert_permissions",
        return_value=(True, "success"),
    ), patch("shutil.copy2"):
        success, _ = th_perm._setup_thingsboard_certs(certs_dir, 1000, 1000)
        assert success is True
    # OSError
    with patch("shutil.copy2", side_effect=OSError("Error")):
        success, _ = th_perm._setup_thingsboard_certs(certs_dir, 1000, 1000)
        assert success is False


def test_set_directory_ownership():
    """Test setting directory ownership"""
    directory = Path("/test/dir")
    with patch("shutil.chown") as mock_chown, patch(
        "os.walk", return_value=[("/test/dir", ["sub"], ["file.txt"])]
    ):
        th_perm._set_directory_ownership(directory, 1000, 1000)
        assert mock_chown.call_count > 0


def test_setup_thingsboard_directories_scenarios():
    """Test ThingsBoard directories setup with scenarios"""
    base_dir = Path("/test/base")
    # Create a mock config object
    mock_cfg = MagicMock()
    mock_cfg.base_dir = base_dir
    mock_cfg.os_type = "linux"
    mock_cfg.thingsboard_uid = 1000
    mock_cfg.thingsboard_gid = 1000

    # Success (non-CI)
    with patch("pathlib.Path.mkdir"), patch("pathlib.Path.chmod"), patch(
        "dtaas_services.pkg.thingsboard_permissions._set_directory_ownership"
    ), patch("dtaas_services.pkg.thingsboard_permissions.is_ci", return_value=False):
        success, _ = th_perm._setup_thingsboard_directories(mock_cfg)
        assert success is True

    # Success (CI)
    with patch("pathlib.Path.mkdir"), patch("pathlib.Path.chmod"), patch(
        "dtaas_services.pkg.thingsboard_permissions._set_directory_ownership"
    ) as mock_chown, patch(
        "dtaas_services.pkg.thingsboard_permissions.is_ci", return_value=True
    ):
        success, _ = th_perm._setup_thingsboard_directories(mock_cfg)
        assert success is True
        mock_chown.assert_not_called()

    # OSError
    with patch("pathlib.Path.mkdir", side_effect=OSError("Error")):
        success, _ = th_perm._setup_thingsboard_directories(mock_cfg)
        assert success is False


def test_verify_certificates_exist_scenarios(tmp_path):
    """Test certificate verification with scenarios"""
    # Success
    certs_dir = tmp_path
    (certs_dir / "privkey.pem").write_bytes(b"KEY")
    (certs_dir / "fullchain.pem").write_bytes(b"CERT")
    success, _ = th_perm._verify_certificates_exist(certs_dir)
    assert success is True
    # Missing
    with patch("pathlib.Path.exists", return_value=False):
        success, _ = th_perm._verify_certificates_exist(Path("/nonexistent"))
        assert success is False


def test_permissions_thingsboard_scenarios(mock_config):
    """Test ThingsBoard permissions setup with scenarios"""
    # Success
    with patch("platform.system", return_value="Linux"), patch(
        "dtaas_services.pkg.thingsboard_permissions.copy_certs",
        return_value=(True, "copied"),
    ), patch(
        "dtaas_services.pkg.thingsboard_permissions._verify_certificates_exist",
        return_value=(True, ""),
    ), patch(
        "dtaas_services.pkg.thingsboard_permissions._execute_setup_operations",
        return_value=(True, ["setup1", "setup2"]),
    ):
        success, _ = th_perm.permissions_thingsboard()
        assert success is True
    # Verify fails
    with patch("platform.system", return_value="Linux"), patch(
        "dtaas_services.pkg.thingsboard_permissions.copy_certs",
        return_value=(True, "copied"),
    ), patch(
        "dtaas_services.pkg.thingsboard_permissions._verify_certificates_exist",
        return_value=(False, "missing"),
    ):
        success, _ = th_perm.permissions_thingsboard()
        assert success is False
