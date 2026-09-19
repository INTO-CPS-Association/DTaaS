"""Tests for template and project structure functions"""

from dtaas_services.pkg.template import generate_project_structure


def test_generate_project_structure_success(tmp_path, package_root):
    """Test successful project structure generation"""
    target_dir = tmp_path / "project"
    success, message = generate_project_structure(target_dir, package_root)
    assert success is True
    assert "Project structure generated successfully" in message
    assert target_dir.exists()
    assert (target_dir / "config").exists()
    assert (target_dir / "data").exists()
    assert (target_dir / "compose.services.yml").exists()
    assert (target_dir / "config" / "services.env").exists()
    assert (target_dir / "config" / "credentials.csv").exists()
    assert (target_dir / "config" / "gitlab_oauth.json").exists()
    # Check data subdirectories
    for subdir in ["grafana", "gitlab", "influxdb", "mongodb", "rabbitmq"]:
        assert (target_dir / "data" / subdir).exists()


def test_generate_project_structure_keeps_existing_files(edited_project, package_root):
    """Without force, existing items are skipped"""
    _, message = generate_project_structure(edited_project, package_root)
    assert "Skipping compose.services.yml (already exists)" in message
    assert (edited_project / "compose.services.yml").read_text() == "edited"


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
