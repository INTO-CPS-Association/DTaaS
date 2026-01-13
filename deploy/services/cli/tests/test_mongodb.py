# pylint: disable=redefined-outer-name
"""Tests for MongoDB user management"""

from pathlib import Path
from unittest.mock import patch, Mock
import pytest
from dtaas_services.pkg.mongodb import (
    create_combined_cert,
    permissions_mongodb,
)


@pytest.fixture
def mock_config():
    """Mock Config class"""
    with patch("dtaas_services.pkg.mongodb.Config") as mock:
        mock_instance = Mock()
        mock_instance.get_value.side_effect = lambda key: {
            "HOSTNAME": "test.example.com",
            "MONGO_UID": "999",
            "MONGO_GID": "999",
        }.get(key, "default")
        mock.return_value = mock_instance
        mock.get_base_dir.return_value = Path("/test/base")
        yield mock


def test_create_combined_cert_success(tmp_path):
    """Test successful combined certificate creation"""
    privkey_path = tmp_path / "privkey.pem"
    fullchain_path = tmp_path / "fullchain.pem"
    combined_path = tmp_path / "combined.pem"

    # Create test files
    privkey_path.write_bytes(b"PRIVATE KEY DATA\n")
    fullchain_path.write_bytes(b"CERTIFICATE DATA\n")

    create_combined_cert(privkey_path, fullchain_path, combined_path)

    # Verify combined file was created with both contents
    combined_content = combined_path.read_bytes()
    assert b"PRIVATE KEY DATA\n" in combined_content
    assert b"CERTIFICATE DATA\n" in combined_content
    assert combined_content == b"PRIVATE KEY DATA\nCERTIFICATE DATA\n"


def test_create_combined_cert_missing_privkey(tmp_path):
    """Test combined certificate creation with missing privkey"""
    privkey_path = tmp_path / "privkey.pem"
    fullchain_path = tmp_path / "fullchain.pem"
    combined_path = tmp_path / "combined.pem"

    # Only create fullchain, not privkey
    fullchain_path.write_bytes(b"CERTIFICATE DATA\n")

    with pytest.raises(FileNotFoundError) as exc_info:
        create_combined_cert(privkey_path, fullchain_path, combined_path)
    assert "Missing privkey.pem" in str(exc_info.value)


def test_create_combined_cert_missing_fullchain(tmp_path):
    """Test combined certificate creation with missing fullchain"""
    privkey_path = tmp_path / "privkey.pem"
    fullchain_path = tmp_path / "fullchain.pem"
    combined_path = tmp_path / "combined.pem"

    # Only create privkey, not fullchain
    privkey_path.write_bytes(b"PRIVATE KEY DATA\n")

    with pytest.raises(FileNotFoundError) as exc_info:
        create_combined_cert(privkey_path, fullchain_path, combined_path)
    assert "Missing fullchain.pem" in str(exc_info.value)


def test_permissions_mongodb_success_linux(mock_config):
    """Test successful MongoDB permissions setup on Linux"""
    with patch("platform.system", return_value="Linux"), patch(
        "pathlib.Path.mkdir"
    ) as mock_mkdir, patch(
        "dtaas_services.pkg.mongodb.create_combined_cert"
    ) as mock_create, patch("pathlib.Path.chmod") as mock_chmod, patch(
        "shutil.chown"
    ) as mock_chown, patch("dtaas_services.pkg.mongodb.is_ci", return_value=False):
        success, message = permissions_mongodb()
        assert success is True
        assert "combined.pem created with mode 600" in message
        assert "ownership set to 999:999" in message
        mock_mkdir.assert_called_once()
        mock_create.assert_called_once()
        mock_chmod.assert_called_once()
        mock_chown.assert_called_once()


def test_permissions_mongodb_success_darwin(mock_config):
    """Test successful MongoDB permissions setup on Darwin"""
    with patch("platform.system", return_value="Darwin"), patch(
        "pathlib.Path.mkdir"
    ) as mock_mkdir, patch(
        "dtaas_services.pkg.mongodb.create_combined_cert"
    ) as mock_create, patch("pathlib.Path.chmod") as mock_chmod, patch(
        "shutil.chown"
    ) as mock_chown, patch("dtaas_services.pkg.mongodb.is_ci", return_value=False):
        success, message = permissions_mongodb()
        assert success is True
        assert "combined.pem created with mode 600" in message
        mock_mkdir.assert_called_once()
        mock_create.assert_called_once()
        mock_chmod.assert_called_once()
        mock_chown.assert_called_once()


def test_permissions_mongodb_success_windows(mock_config):
    """Test successful MongoDB permissions setup on Windows"""
    with patch("platform.system", return_value="Windows"), patch(
        "pathlib.Path.mkdir"
    ) as mock_mkdir, patch(
        "dtaas_services.pkg.mongodb.create_combined_cert"
    ) as mock_create, patch("pathlib.Path.chmod") as mock_chmod, patch(
        "shutil.chown"
    ) as mock_chown, patch("dtaas_services.pkg.mongodb.is_ci", return_value=False):
        success, message = permissions_mongodb()
        assert success is True
        assert "combined.pem created" in message
        assert "permission changes skipped in CI" in message
        mock_mkdir.assert_called_once()
        mock_create.assert_called_once()
        # chmod and chown should not be called on Windows
        mock_chmod.assert_not_called()
        mock_chown.assert_not_called()


def test_permissions_mongodb_success_ci(mock_config):
    """Test MongoDB permissions setup in CI environment"""
    with patch("platform.system", return_value="Linux"), patch(
        "pathlib.Path.mkdir"
    ) as mock_mkdir, patch(
        "dtaas_services.pkg.mongodb.create_combined_cert"
    ) as mock_create, patch("pathlib.Path.chmod") as mock_chmod, patch(
        "shutil.chown"
    ) as mock_chown, patch("dtaas_services.pkg.mongodb.is_ci", return_value=True):
        success, message = permissions_mongodb()
        assert success is True
        assert "permission changes skipped in CI" in message
        mock_mkdir.assert_called_once()
        mock_create.assert_called_once()
        # chmod and chown should not be called in CI
        mock_chmod.assert_not_called()
        mock_chown.assert_not_called()


def test_permissions_mongodb_os_error(mock_config):
    """Test MongoDB permissions setup with OSError"""
    with patch("platform.system", return_value="Linux"), patch(
        "pathlib.Path.mkdir", side_effect=OSError("Directory creation failed")
    ):
        success, message = permissions_mongodb()
        assert success is False
        assert "Error setting permissions for MongoDB" in message
