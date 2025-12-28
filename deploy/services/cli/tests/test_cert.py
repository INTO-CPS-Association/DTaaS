"""Tests for certificate management module"""
import time
from unittest.mock import patch, Mock
from dtaas_services.pkg.cert import (
    normalize_cert_candidates,
    copy_certs,
    _create_dummy_certs,
    _copy_cert_files,
)


class TestNormalizeCertCandidates:
    """Tests for normalize_cert_candidates function"""
    def test_normalize_cert_candidates_no_candidates(self, tmp_path):
        """Test when no certificate candidates exist"""
        certs_dir = tmp_path / "certs"
        certs_dir.mkdir()
        # Should not raise any error when no candidates
        normalize_cert_candidates(certs_dir, "privkey")

        # No files should be created
        assert not list(certs_dir.glob("privkey*.pem"))

    def test_normalize_cert_candidates_single_file(self, tmp_path):
        """Test with a single certificate file"""
        certs_dir = tmp_path / "certs"
        certs_dir.mkdir()
        cert_file = certs_dir / "privkey1.pem"
        cert_file.write_text("cert content")
        normalize_cert_candidates(certs_dir, "privkey")
        # Should be renamed to privkey.pem
        assert (certs_dir / "privkey.pem").exists()
        assert not cert_file.exists()

    def test_normalize_cert_candidates_multiple_files(self, tmp_path):
        """Test with multiple certificate files"""
        certs_dir = tmp_path / "certs"
        certs_dir.mkdir()
        # Create multiple cert files with different timestamps
        old_cert = certs_dir / "privkey1.pem"
        old_cert.write_text("old cert")
        time.sleep(0.01)  # Ensure different mtime
        new_cert = certs_dir / "privkey2.pem"
        new_cert.write_text("new cert")
        normalize_cert_candidates(certs_dir, "privkey")
        # Only privkey.pem should exist with content from newest file
        assert (certs_dir / "privkey.pem").exists()
        assert not old_cert.exists()
        assert not new_cert.exists()
        # Line break to fix line-too-long
        assert (
            certs_dir / "privkey.pem"
        ).read_text() == "new cert"

    def test_normalize_cert_candidates_target_already_exists(self, tmp_path):
        """Test when target file already exists as latest"""
        certs_dir = tmp_path / "certs"
        certs_dir.mkdir()
        target = certs_dir / "privkey.pem"
        target.write_text("target cert")
        normalize_cert_candidates(certs_dir, "privkey")
        # Target should remain unchanged
        assert target.exists()
        assert target.read_text() == "target cert"



class TestCreateDummyCerts:
    """Tests for _create_dummy_certs helper function"""
    def test_create_dummy_certs_success(self, tmp_path):
        """Test successful creation of dummy certificates"""
        certs_dir = tmp_path / "certs"
        success, message = _create_dummy_certs(certs_dir)

        assert success is True
        assert "Created dummy certificates" in message
        assert (certs_dir / "privkey.pem").exists()
        assert (certs_dir / "fullchain.pem").exists()

    def test_create_dummy_certs_already_exist(self, tmp_path):
        """Test when dummy certs already exist"""
        certs_dir = tmp_path / "certs"
        certs_dir.mkdir(parents=True)
        (certs_dir / "privkey.pem").write_text("existing privkey")
        (certs_dir / "fullchain.pem").write_text("existing fullchain")
        success, _ = _create_dummy_certs(certs_dir)
        assert success is True
        # Existing files should not be overwritten
        assert (certs_dir / "privkey.pem").read_text() == "existing privkey"
        assert (certs_dir / "fullchain.pem").read_text() == "existing fullchain"


class TestCopyCertFiles:
    """Tests for _copy_cert_files helper function"""
    def test_copy_cert_files_success(self, tmp_path):
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
    def test_copy_cert_files_os_error(self, mock_copy, tmp_path):
        """Test when OS error occurs during copy"""
        source_dir = tmp_path / "source"
        source_dir.mkdir()
        (source_dir / "cert.pem").write_text("content")
        dest_dir = tmp_path / "dest"
        mock_copy.side_effect = OSError("Permission denied")
        success, message = _copy_cert_files(source_dir, dest_dir)
        assert success is False
        assert "Error copying certificates" in message


class TestCopyCerts:
    """Tests for copy_certs function"""
    @patch("dtaas_services.pkg.cert.is_ci", return_value=False)
    @patch("dtaas_services.pkg.cert.Config")
    def test_copy_certs_source_not_found(self, mock_config_class, _, tmp_path):
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


    @patch("dtaas_services.pkg.cert.is_ci", return_value=True)
    @patch("dtaas_services.pkg.cert.Config")
    def test_copy_certs_source_not_found_ci(self, mock_config_class, _, tmp_path):
        """Test when source directory does not exist in CI (should create dummy certs)"""
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
        # In CI, should succeed with dummy certificates
        assert success
        assert "Created dummy certificates" in message
        # Check that dummy certs were created
        certs_dir = tmp_path / "certs" / "localhost"
        assert certs_dir.exists()
        assert (certs_dir / "privkey.pem").exists()
        assert (certs_dir / "fullchain.pem").exists()


    @patch("dtaas_services.pkg.cert.Config")
    def test_copy_certs_success(self, mock_config_class, tmp_path):
        """Test successful certificate copy"""
        # Setup source and destination directories
        source_dir = tmp_path / "source"
        source_dir.mkdir()
        base_dir = tmp_path / "base"
        base_dir.mkdir()
        # Create source certificate files
        (source_dir / "privkey1.pem").write_text("privkey content")
        (source_dir / "fullchain1.pem").write_text("fullchain content")
        mock_config = Mock()
        def get_value(key):
            if key == "HOSTNAME":
                return "localhost"
            if key == "CERTS_SRC":
                return str(source_dir)
            return None
        mock_config.get_value.side_effect = get_value
        mock_config_class.return_value = mock_config
        mock_config_class.get_base_dir.return_value = base_dir
        success, message = copy_certs()
        assert success
        assert "copied and normalized" in message
        # Check that certs were copied to correct location
        dest_dir = base_dir / "certs" / "localhost"
        assert dest_dir.exists()
        assert (dest_dir / "privkey.pem").exists()
        assert (dest_dir / "fullchain.pem").exists()


    @patch("dtaas_services.pkg.cert.Config")
    def test_copy_certs_skip_same_file(self, mock_config_class, tmp_path):
        """Test that copy skips when source and dest are the same"""
        # Setup directory
        certs_dir = tmp_path / "certs" / "localhost"
        certs_dir.mkdir(parents=True)
        # Create cert file
        cert_file = certs_dir / "privkey.pem"
        cert_file.write_text("cert content")
        mock_config = Mock()
        def get_value(key):
            if key == "HOSTNAME":
                return "localhost"
            if key == "CERTS_SRC":
                return str(certs_dir)
            return None
        mock_config.get_value.side_effect = get_value
        mock_config_class.return_value = mock_config
        mock_config_class.get_base_dir.return_value = tmp_path
        success, _ = copy_certs()
        # Should still succeed even if source and dest are the same
        assert success

    @patch("dtaas_services.pkg.cert.Config")
    @patch("dtaas_services.pkg.cert.shutil.copy2")
    def test_copy_certs_os_error(self, mock_copy, mock_config_class, tmp_path):
        """Test when OS error occurs during copy"""
        source_dir = tmp_path / "source"
        source_dir.mkdir()
        (source_dir / "cert.pem").write_text("content")
        base_dir = tmp_path / "base"
        base_dir.mkdir()
        mock_config = Mock()
        def get_value(key):
            if key == "HOSTNAME":
                return "localhost"
            if key == "CERTS_SRC":
                return str(source_dir)
            return None
        mock_config.get_value.side_effect = get_value
        mock_config_class.return_value = mock_config
        mock_config_class.get_base_dir.return_value = base_dir
        # Make copy2 raise OSError
        mock_copy.side_effect = OSError("Permission denied")
        success, message = copy_certs()
        assert not success
        assert "Error copying certificates" in message
