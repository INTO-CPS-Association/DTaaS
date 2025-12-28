"""Tests for template and project structure functions"""
from unittest.mock import patch
from dtaas_services.pkg.template import (
    copy_directory_or_file,
    copy_template_to_config,
    generate_project_structure
)


class TestCopyFunctions:
    """Tests for file and directory copy functions"""
    def test_copy_directory_or_file_directory(self, tmp_path):
        """Test copying a directory"""
        src_dir = tmp_path / "source"
        src_dir.mkdir()
        (src_dir / "file.txt").write_text("content")
        dest_dir = tmp_path / "dest"
        result = copy_directory_or_file(src_dir, dest_dir, "test_dir")
        assert dest_dir.exists()
        assert (dest_dir / "file.txt").exists()
        assert "Created test_dir/" in result


    def test_copy_directory_or_file(self, tmp_path):
        """Test copying a file"""
        src_file = tmp_path / "source.txt"
        src_file.write_text("content")
        dest_file = tmp_path / "dest.txt"
        result = copy_directory_or_file(src_file, dest_file, "test_file")
        assert dest_file.exists()
        assert dest_file.read_text() == "content"
        assert "Created test_file" in result


    def test_copy_directory_or_file_not_exists(self, tmp_path):
        """Test when source doesn't exist"""
        src_path = tmp_path / "nonexistent"
        dest_path = tmp_path / "dest"
        result = copy_directory_or_file(src_path, dest_path, "test")
        assert "Warning" in result
        assert "not found" in result


    def test_copy_directory_or_file_already_exists(self, tmp_path):
        """Test when destination already exists"""
        src_dir = tmp_path / "source"
        src_dir.mkdir()
        dest_dir = tmp_path / "dest"
        dest_dir.mkdir()
        result = copy_directory_or_file(src_dir, dest_dir, "test_dir")
        assert "Skipping" in result


    def test_copy_template_to_config(self, tmp_path):
        """Test copying template to config"""
        config_dir = tmp_path / "config"
        config_dir.mkdir()
        template_file = config_dir / "services.env.template"
        template_file.write_text("TEMPLATE=value")
        result = copy_template_to_config(config_dir, "services.env.template", "services.env")
        actual_file = config_dir / "services.env"
        assert actual_file.exists()
        assert actual_file.read_text() == "TEMPLATE=value"
        assert "Created config/services.env" in result


    def test_copy_template_to_config_already_exists(self, tmp_path):
        """Test when actual config already exists"""
        config_dir = tmp_path / "config"
        config_dir.mkdir()
        template_file = config_dir / "services.env.template"
        template_file.write_text("TEMPLATE=value")
        actual_file = config_dir / "services.env"
        actual_file.write_text("EXISTING=value")
        result = copy_template_to_config(config_dir, "services.env.template", "services.env")
        # Should not overwrite existing file
        assert actual_file.read_text() == "EXISTING=value"
        assert result == ""


class TestGenerateProjectStructure:
    """Tests for project structure generation"""

    def test_generate_project_structure_success(self, tmp_path):
        """Test successful project structure generation"""
        target_dir = tmp_path / "project"
        package_root = tmp_path / "package"
        package_root.mkdir()
        # Create source structure
        (package_root / "config").mkdir()
        (package_root / "config" / "services.env.template").write_text("ENV=value")
        (package_root / "config" / "credentials.csv.template").write_text("user,pass")
        (package_root / "data").mkdir()
        (package_root / "compose.services.secure.yml").write_text("version: '3'")
        success, message = generate_project_structure(target_dir, package_root)
        assert success is True
        assert "Project structure generated successfully" in message
        assert target_dir.exists()
        assert (target_dir / "config").exists()
        assert (target_dir / "data").exists()
        assert (target_dir / "compose.services.secure.yml").exists()
        assert (target_dir / "config" / "services.env").exists()
        assert (target_dir / "config" / "credentials.csv").exists()
        # Check data subdirectories
        for subdir in ['grafana', 'influxdb', 'mongodb', 'rabbitmq']:
            assert (target_dir / "data" / subdir).exists()


    def test_generate_project_structure_missing_sources(self, tmp_path):
        """Test when source files don't exist"""
        target_dir = tmp_path / "project"
        package_root = tmp_path / "package"
        package_root.mkdir()
        success, message = generate_project_structure(target_dir, package_root)
        assert success is True
        assert "Warning" in message
        assert target_dir.exists()


    def test_generate_project_structure_failure(self, tmp_path):
        """Test project generation failure"""
        target_dir = tmp_path / "project"
        # Use invalid package root to trigger exception
        package_root = tmp_path / "nonexistent"
        with patch(
            "dtaas_services.pkg.template.Path.mkdir",
            side_effect=PermissionError("No permission")
        ):
            success, message = generate_project_structure(
                target_dir, package_root
            )
            assert success is False
            assert "Failed to generate project" in message
