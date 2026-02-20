"""Tests for certificate management module"""

from unittest.mock import patch, Mock
from dtaas_services.pkg.cert import (
    copy_certs,
    _create_dummy_certs,
    _copy_cert_files,
    _remove_remaining_certs,
    _matches_cert_pattern,
    create_combined_cert,
    set_service_cert_permissions,
    CertPermissionContext,
    _get_skip_permission_message,
)


def test_create_dummy_certs_success(tmp_path):
    """Test successful creation of dummy certificates"""
    certs_dir = tmp_path / "certs"
    success, message = _create_dummy_certs(certs_dir)

    assert success is True
    assert "Created dummy certificates" in message
    assert (certs_dir / "privkey.pem").exists()
    assert (certs_dir / "fullchain.pem").exists()


def test_copy_cert_files_success(tmp_path):
    """Test successful certificate file copy"""
    source_dir = tmp_path / "source"
    source_dir.mkdir()
    (source_dir / "privkey1.pem").write_text("privkey content")
    (source_dir / "fullchain1.pem").write_text("fullchain content")
    dest_dir = tmp_path / "dest"
    success, message = _copy_cert_files(source_dir, dest_dir)
    assert success is True
    assert "copied and normalized" in message
    assert (dest_dir / "privkey.pem").exists()
    assert (dest_dir / "fullchain.pem").exists()


@patch("dtaas_services.pkg.cert.shutil.copy2")
def test_copy_cert_files_os_error(mock_copy, tmp_path):
    """Test when OS error occurs during copy"""
    source_dir = tmp_path / "source"
    source_dir.mkdir()
    (source_dir / "cert.pem").write_text("content")
    dest_dir = tmp_path / "dest"
    mock_copy.side_effect = OSError("Permission denied")
    success, message = _copy_cert_files(source_dir, dest_dir)
    assert success is False
    assert "Error copying certificates" in message


@patch("dtaas_services.pkg.cert.is_ci", return_value=False)
@patch("dtaas_services.pkg.cert.Config")
def test_copy_certs_source_not_found(mock_config_class, _, tmp_path):
    """Test when source directory does not exist"""
    mock_config = Mock()

    def get_value(key):
        if key == "HOSTNAME":
            return "localhost"
        if key == "CERTS_SRC":
            return "/nonexistent/path"
        return None

    mock_config.get_value.side_effect = get_value
    mock_config_class.return_value = mock_config
    mock_config_class.get_base_dir.return_value = tmp_path
    success, message = copy_certs()
    assert not success
    assert "Source directory" in message
    assert "not found" in message


def test_matches_cert_pattern_exact_name():
    """Test _matches_cert_pattern with exact name"""
    assert _matches_cert_pattern("privkey.pem", "privkey")
    assert not _matches_cert_pattern("privkey-service.pem", "privkey")


def test_remove_remaining_certs(tmp_path):
    """Test _remove_remaining_certs removes old numbered certs"""
    certs_dir = tmp_path / "certs"
    certs_dir.mkdir()
    # Create multiple numbered certs and target
    (certs_dir / "privkey1.pem").write_text("old1")
    (certs_dir / "privkey2.pem").write_text("old2")
    target = certs_dir / "privkey.pem"
    target.write_text("target")

    _remove_remaining_certs(certs_dir, "privkey", target)

    # Should remove numbered files but keep target
    assert target.exists()
    assert not (certs_dir / "privkey1.pem").exists()
    assert not (certs_dir / "privkey2.pem").exists()


def test_create_combined_cert_success(tmp_path):
    """Test successful combined certificate creation"""
    privkey = tmp_path / "privkey.pem"
    privkey.write_text("PRIVKEY")
    fullchain = tmp_path / "fullchain.pem"
    fullchain.write_text("FULLCHAIN")
    combined = tmp_path / "combined.pem"

    success, _ = create_combined_cert(privkey, fullchain, combined)

    assert success
    assert combined.exists()
    assert combined.read_text() == "PRIVKEYFULLCHAIN"


def test_create_combined_cert_missing_privkey(tmp_path):
    """Test when privkey.pem is missing"""
    privkey = tmp_path / "privkey.pem"
    fullchain = tmp_path / "fullchain.pem"
    fullchain.write_text("FULLCHAIN")
    combined = tmp_path / "combined.pem"

    success, message = create_combined_cert(privkey, fullchain, combined)

    assert not success
    assert "Missing privkey" in message


def test_create_combined_cert_missing_fullchain(tmp_path):
    """Test when fullchain.pem is missing"""
    privkey = tmp_path / "privkey.pem"
    privkey.write_text("PRIVKEY")
    fullchain = tmp_path / "fullchain.pem"
    combined = tmp_path / "combined.pem"

    success, message = create_combined_cert(privkey, fullchain, combined)

    assert not success
    assert "Missing fullchain" in message


@patch("dtaas_services.pkg.cert.platform.system", return_value="Linux")
@patch("dtaas_services.pkg.cert.is_ci", return_value=False)
@patch("dtaas_services.pkg.cert.shutil.chown")
def test_set_service_cert_permissions_posix(
    mock_chown, _mock_is_ci, _mock_platform, tmp_path
):
    """Test permission setting on POSIX system"""
    cert_path = tmp_path / "test.pem"
    cert_path.write_text("cert")

    ctx = CertPermissionContext("grafana", cert_path, 1000, 1001, 0o600)
    success, message = set_service_cert_permissions(ctx)

    assert success
    assert "1000:1001" in message
    mock_chown.assert_called_once()


@patch("dtaas_services.pkg.cert.platform.system", return_value="Linux")
@patch("dtaas_services.pkg.cert.is_ci", return_value=False)
@patch("dtaas_services.pkg.cert.shutil.chown")
def test_set_service_cert_permissions_posix_no_gid(
    _mock_chown, _mock_is_ci, _mock_platform, tmp_path
):
    """Test permission setting on POSIX without gid"""
    cert_path = tmp_path / "test.pem"
    cert_path.write_text("cert")

    ctx = CertPermissionContext("grafana", cert_path, 1000, None, 0o600)
    success, message = set_service_cert_permissions(ctx)

    assert success
    assert "user 1000" in message


@patch("dtaas_services.pkg.cert.platform.system", return_value="Linux")
@patch("dtaas_services.pkg.cert.is_ci", return_value=True)
def test_set_service_cert_permissions_ci(_mock_is_ci, _mock_platform, tmp_path):
    """Test permission skipped in CI"""
    cert_path = tmp_path / "test.pem"
    cert_path.write_text("cert")

    ctx = CertPermissionContext("grafana", cert_path, 1000, 1001, 0o600)
    success, message = set_service_cert_permissions(ctx)

    assert success
    assert "CI" in message


@patch("dtaas_services.pkg.cert.platform.system", return_value="Linux")
@patch("dtaas_services.pkg.cert.is_ci", return_value=False)
@patch("dtaas_services.pkg.cert.shutil.chown", side_effect=OSError("Permission denied"))
def test_set_service_cert_permissions_error(
    _mock_chown, _mock_is_ci, _mock_platform, tmp_path
):
    """Test error handling in permission setting"""
    cert_path = tmp_path / "test.pem"
    cert_path.write_text("cert")

    ctx = CertPermissionContext("grafana", cert_path, 1000, 1001, 0o600)
    success, message = set_service_cert_permissions(ctx)

    assert not success
    assert "Error setting permissions" in message


@patch("dtaas_services.pkg.cert.is_ci", return_value=False)
@patch("dtaas_services.pkg.cert.platform.system", return_value="Windows")
def test_skip_message_windows(_mock_platform, _mock_is_ci):
    """Test skip message on Windows"""
    msg = _get_skip_permission_message("test.pem")
    assert "Windows" in msg or "POSIX" in msg


@patch("dtaas_services.pkg.cert.is_ci", return_value=False)
@patch("dtaas_services.pkg.cert.platform.system", return_value="Linux")
def test_skip_message_posix(_mock_platform, _mock_is_ci):
    """Test skip message on POSIX (permission changes skipped)"""
    msg = _get_skip_permission_message("test.pem")
    assert "test.pem" in msg
