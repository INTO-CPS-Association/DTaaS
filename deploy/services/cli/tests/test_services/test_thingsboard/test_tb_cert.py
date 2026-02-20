"""Tests for ThingsBoard certificate utilities."""

import os
from pathlib import Path
from unittest.mock import Mock
import pytest
from dtaas_services.pkg.services.thingsboard import tb_cert
# pylint: disable=W0212, W0621

# Test constants
TEST_PASSWORD = "testpass123"  # noqa: S105 # NOSONAR
TEST_EMAIL = "test@example.com"


def test_credential_process_context():
    """Test CredentialProcessContext initialization"""
    session = Mock()
    ctx = tb_cert.CredentialProcessContext("https://example.com", session)
    assert ctx.base_url == "https://example.com"
    assert ctx.session == session
    assert ctx.seen_emails == set()


def test_copy_service_cert_files_success(mocker):
    """Test successful certificate file copying"""
    cert_cfg = tb_cert.ServiceCertConfig("postgres", "postgres.key", "postgres.crt")
    params = tb_cert.CertSetupParams(Path("/test/certs"), 999, 999)
    ctx = tb_cert.ServiceSetupContext(cert_cfg, params)
    mock_copy = mocker.patch("shutil.copy2")
    paths, success, msg = tb_cert.copy_service_cert_files(ctx)
    assert success is True
    assert msg == ""
    assert mock_copy.call_count == 2
    service_key_path, service_cert_path = paths
    assert service_key_path == Path("/test/certs/postgres.key")
    assert service_cert_path == Path("/test/certs/postgres.crt")


def test_set_service_cert_file_permissions_success(mocker):
    """Test setting certificate file permissions"""
    cert_cfg = tb_cert.ServiceCertConfig("postgres", "postgres.key", "postgres.crt")
    params = tb_cert.CertSetupParams(Path("/test/certs"), 999, 999)
    ctx = tb_cert.ServiceSetupContext(cert_cfg, params)
    key_path = Path("/test/certs/postgres.key")
    cert_path = Path("/test/certs/postgres.crt")
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.tb_cert.set_service_cert_permissions",
        return_value=(True, "success"),
    )
    success, _ = tb_cert.set_service_cert_file_permissions(ctx, key_path, cert_path)
    assert success is True


def test_set_service_cert_file_permissions_key_failure(mocker):
    """Test permission setting failure on key"""
    cert_cfg = tb_cert.ServiceCertConfig("postgres", "postgres.key", "postgres.crt")
    params = tb_cert.CertSetupParams(Path("/test/certs"), 999, 999)
    ctx = tb_cert.ServiceSetupContext(cert_cfg, params)
    key_path = Path("/test/certs/postgres.key")
    cert_path = Path("/test/certs/postgres.crt")
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.tb_cert.set_service_cert_permissions",
        return_value=(False, "Permission error"),
    )
    success, msg = tb_cert.set_service_cert_file_permissions(ctx, key_path, cert_path)
    assert success is False
    assert "Permission error" in msg


def test_setup_service_certs_success(mocker):
    """Test successful service certificate setup"""
    cert_cfg = tb_cert.ServiceCertConfig("postgres", "postgres.key", "postgres.crt")
    params = tb_cert.CertSetupParams(Path("/test/certs"), 999, 999)
    ctx = tb_cert.ServiceSetupContext(cert_cfg, params)
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.tb_cert.copy_service_cert_files",
        return_value=(
            (Path("/test/certs/postgres.key"), Path("/test/certs/postgres.crt")),
            True,
            "",
        ),
    )
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.tb_cert.set_service_cert_file_permissions",
        return_value=(True, "success"),
    )
    success, _ = tb_cert.setup_service_certs(ctx)
    assert success is True


def test_setup_service_certs_os_error(mocker):
    """Test service certificate setup with OS error"""
    cert_cfg = tb_cert.ServiceCertConfig("postgres", "postgres.key", "postgres.crt")
    params = tb_cert.CertSetupParams(Path("/test/certs"), 999, 999)
    ctx = tb_cert.ServiceSetupContext(cert_cfg, params)
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.tb_cert.copy_service_cert_files",
        side_effect=OSError("File error"),
    )
    success, msg = tb_cert.setup_service_certs(ctx)
    assert success is False
    assert "postgres" in msg


def test_validate_credential_row_success():
    """Test valid credential row"""
    credential = {"email": "user@example.com"}
    seen_emails = set()
    success, result = tb_cert.validate_credential_row(credential, "user1", seen_emails)
    assert success is True
    assert result == "user@example.com"


def test_validate_credential_row_missing_email():
    """Test credential row with missing email"""
    credential = {"email": ""}
    seen_emails = set()
    success, msg = tb_cert.validate_credential_row(credential, "user1", seen_emails)
    assert success is False
    assert "required" in msg


def test_validate_credential_row_duplicate_email():
    """Test credential row with duplicate email"""
    credential = {"email": "user@example.com"}
    seen_emails = {"user@example.com"}
    success, msg = tb_cert.validate_credential_row(credential, "user1", seen_emails)
    assert success is False
    assert "Duplicate" in msg


@pytest.mark.parametrize(
    "env_vars,expected_url",
    [
        (
            {
                "HOSTNAME": "localhost",
                "THINGSBOARD_PORT": "8080",
                "THINGSBOARD_SCHEME": "https",
            },
            "https://localhost:8080",
        ),
        (
            {
                "HOSTNAME": "example.com",
                "THINGSBOARD_PORT": "9090",
                "THINGSBOARD_SCHEME": "https",
            },
            "https://example.com:9090",
        ),
        (
            {
                "HOSTNAME": "test.local",
                "THINGSBOARD_PORT": "8080",
                "THINGSBOARD_SCHEME": "https",
            },
            "https://test.local:8080",
        ),
    ],
)
def test_build_base_url(env_vars, expected_url, mocker):
    """Test building base URL with different configurations"""
    mocker.patch.dict(os.environ, env_vars, clear=False)
    assert tb_cert.build_base_url() == expected_url


def test_setup_service_certificates_os_error(mocker):
    """Test service certificate setup with OS error via config"""
    certs_dir = Path("/test/certs")
    config = tb_cert.CertificateSetupConfig(
        "postgres", "postgres.crt", "postgres.key", certs_dir, 999, 999
    )
    mocker.patch(
        "dtaas_services.pkg.services.thingsboard.tb_cert.setup_service_certs",
        side_effect=OSError("File error"),
    )
    success, msg = tb_cert.setup_service_certificates(config)
    assert success is False
    assert "postgres" in msg
