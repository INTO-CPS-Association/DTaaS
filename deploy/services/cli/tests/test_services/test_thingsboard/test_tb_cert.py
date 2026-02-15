# pylint: disable=redefined-outer-name
# pylint: disable=W0212
"""Tests for ThingsBoard certificate utilities."""

import os
from pathlib import Path
from unittest.mock import patch, Mock, MagicMock
import pytest
import httpx
import dtaas_services.pkg.services.thingsboard.tb_cert as tb_cert


# Test constants
TEST_PASSWORD = "testpass123"  # noqa: S105 # NOSONAR
TEST_EMAIL = "test@example.com"


# Test CredentialProcessContext
def test_credential_process_context():
    """Test CredentialProcessContext initialization"""
    session = Mock()
    ctx = tb_cert.CredentialProcessContext("https://example.com", session)
    assert ctx.base_url == "https://example.com"
    assert ctx.session == session
    assert ctx.seen_emails == set()


# Test ServiceCertConfig
def test_service_cert_config():
    """Test ServiceCertConfig initialization"""
    config = tb_cert.ServiceCertConfig("postgres", "postgres.key", "postgres.crt")
    assert config.service_name == "postgres"
    assert config.key_filename == "postgres.key"
    assert config.cert_filename == "postgres.crt"


# Test CertSetupParams
def test_cert_setup_params():
    """Test CertSetupParams initialization"""
    certs_dir = Path("/test/certs")
    params = tb_cert.CertSetupParams(certs_dir, 999, 999)
    assert params.certs_dir == certs_dir
    assert params.uid == 999
    assert params.gid == 999


# Test ServiceSetupContext
def test_service_setup_context():
    """Test ServiceSetupContext initialization"""
    cert_cfg = tb_cert.ServiceCertConfig("test", "test.key", "test.crt")
    params = tb_cert.CertSetupParams(Path("/test"), 999, 999)
    ctx = tb_cert.ServiceSetupContext(cert_cfg, params)
    assert ctx.cert_cfg == cert_cfg
    assert ctx.certs_dir == Path("/test")
    assert ctx.uid == 999
    assert ctx.gid == 999


# Test copy_service_cert_files
def test_copy_service_cert_files_success():
    """Test successful certificate file copying"""
    cert_cfg = tb_cert.ServiceCertConfig("postgres", "postgres.key", "postgres.crt")
    params = tb_cert.CertSetupParams(Path("/test/certs"), 999, 999)
    ctx = tb_cert.ServiceSetupContext(cert_cfg, params)

    with patch("shutil.copy2") as mock_copy:
        paths, success, msg = tb_cert.copy_service_cert_files(ctx)
        assert success is True
        assert msg == ""
        assert mock_copy.call_count == 2
        service_key_path, service_cert_path = paths
        assert service_key_path == Path("/test/certs/postgres.key")
        assert service_cert_path == Path("/test/certs/postgres.crt")


# Test set_service_cert_file_permissions
def test_set_service_cert_file_permissions_success():
    """Test setting certificate file permissions"""
    cert_cfg = tb_cert.ServiceCertConfig("postgres", "postgres.key", "postgres.crt")
    params = tb_cert.CertSetupParams(Path("/test/certs"), 999, 999)
    ctx = tb_cert.ServiceSetupContext(cert_cfg, params)
    key_path = Path("/test/certs/postgres.key")
    cert_path = Path("/test/certs/postgres.crt")

    with patch(
        "dtaas_services.pkg.services.thingsboard.tb_cert.set_service_cert_permissions",
        return_value=(True, "success"),
    ):
        success, msg = tb_cert.set_service_cert_file_permissions(
            ctx, key_path, cert_path
        )
        assert success is True


def test_set_service_cert_file_permissions_key_failure():
    """Test permission setting failure on key"""
    cert_cfg = tb_cert.ServiceCertConfig("postgres", "postgres.key", "postgres.crt")
    params = tb_cert.CertSetupParams(Path("/test/certs"), 999, 999)
    ctx = tb_cert.ServiceSetupContext(cert_cfg, params)
    key_path = Path("/test/certs/postgres.key")
    cert_path = Path("/test/certs/postgres.crt")

    with patch(
        "dtaas_services.pkg.services.thingsboard.tb_cert.set_service_cert_permissions",
        return_value=(False, "Permission error"),
    ):
        success, msg = tb_cert.set_service_cert_file_permissions(
            ctx, key_path, cert_path
        )
        assert success is False
        assert "Permission error" in msg


# Test setup_service_certs
def test_setup_service_certs_success():
    """Test successful service certificate setup"""
    cert_cfg = tb_cert.ServiceCertConfig("postgres", "postgres.key", "postgres.crt")
    params = tb_cert.CertSetupParams(Path("/test/certs"), 999, 999)
    ctx = tb_cert.ServiceSetupContext(cert_cfg, params)

    with patch(
        "dtaas_services.pkg.services.thingsboard.tb_cert.copy_service_cert_files",
        return_value=(
            (Path("/test/certs/postgres.key"), Path("/test/certs/postgres.crt")),
            True,
            "",
        ),
    ), patch(
        "dtaas_services.pkg.services.thingsboard.tb_cert.set_service_cert_file_permissions",
        return_value=(True, "success"),
    ):
        success, msg = tb_cert.setup_service_certs(ctx)
        assert success is True


def test_setup_service_certs_os_error():
    """Test service certificate setup with OS error"""
    cert_cfg = tb_cert.ServiceCertConfig("postgres", "postgres.key", "postgres.crt")
    params = tb_cert.CertSetupParams(Path("/test/certs"), 999, 999)
    ctx = tb_cert.ServiceSetupContext(cert_cfg, params)

    with patch(
        "dtaas_services.pkg.services.thingsboard.tb_cert.copy_service_cert_files",
        side_effect=OSError("File error"),
    ):
        success, msg = tb_cert.setup_service_certs(ctx)
        assert success is False
        assert "postgres" in msg


# Test validate_credential_row
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


# Test build_base_url
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
def test_build_base_url(env_vars, expected_url):
    """Test building base URL with different configurations"""
    with patch.dict(os.environ, env_vars, clear=False):
        assert tb_cert.build_base_url() == expected_url


# Test CertificateSetupConfig
def test_certificate_setup_config():
    """Test CertificateSetupConfig dataclass"""
    certs_dir = Path("/test/certs")
    config = tb_cert.CertificateSetupConfig(
        "postgres", "postgres.crt", "postgres.key", certs_dir, 999, 999
    )
    assert config.service_name == "postgres"
    assert config.cert_filename == "postgres.crt"
    assert config.key_filename == "postgres.key"
    assert config.certs_dir == certs_dir
    assert config.uid == 999
    assert config.gid == 999


# Test setup_service_certificates
def test_setup_service_certificates_success():
    """Test successful service certificate setup via config"""
    certs_dir = Path("/test/certs")
    config = tb_cert.CertificateSetupConfig(
        "postgres", "postgres.crt", "postgres.key", certs_dir, 999, 999
    )

    with patch(
        "dtaas_services.pkg.services.thingsboard.tb_cert.setup_service_certs",
        return_value=(True, "success"),
    ):
        success, msg = tb_cert.setup_service_certificates(config)
        assert success is True


def test_setup_service_certificates_os_error():
    """Test service certificate setup with OS error via config"""
    certs_dir = Path("/test/certs")
    config = tb_cert.CertificateSetupConfig(
        "postgres", "postgres.crt", "postgres.key", certs_dir, 999, 999
    )

    with patch(
        "dtaas_services.pkg.services.thingsboard.tb_cert.setup_service_certs",
        side_effect=OSError("File error"),
    ):
        success, msg = tb_cert.setup_service_certificates(config)
        assert success is False
        assert "postgres" in msg