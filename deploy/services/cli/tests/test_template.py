"""Tests for template and project structure functions"""

from dtaas_services.pkg.template import (
    generate_project_structure,
)


def test_generate_project_structure_success(tmp_path):
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
    for subdir in ["grafana", "influxdb", "mongodb", "rabbitmq"]:
        assert (target_dir / "data" / subdir).exists()


def test_generate_project_structure_failure(tmp_path, mocker):
    """Test project generation failure"""
    target_dir = tmp_path / "project"
    # Use invalid package root to trigger exception
    package_root = tmp_path / "nonexistent"
    mocker.patch(
        "dtaas_services.pkg.template.Path.mkdir",
        side_effect=PermissionError("No permission"),
    )
    success, message = generate_project_structure(target_dir, package_root)
    assert success is False
    assert "Failed to generate project" in message
