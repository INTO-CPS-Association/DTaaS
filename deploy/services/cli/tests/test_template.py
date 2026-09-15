"""Tests for template and project structure functions"""

# pylint: disable=redefined-outer-name
import pytest
from dtaas_services.pkg.template import (
    generate_project_structure,
)

KEPT_ENV = "HOSTNAME=kept.example"


@pytest.fixture
def package_root(tmp_path):
    """Package root with a minimal templates folder"""
    root = tmp_path / "package"
    templates_root = root / "templates"
    (templates_root / "config").mkdir(parents=True)
    (templates_root / "config" / "services.env.template").write_text("ENV=value")
    (templates_root / "config" / "credentials.csv.template").write_text("user,pass")
    (templates_root / "config" / "gitlab_oauth.json.template").write_text("[]")
    (templates_root / "data").mkdir()
    (templates_root / "compose.services.yml").write_text("version: '3'")
    return root


@pytest.fixture
def edited_project(tmp_path, package_root):
    """Generated project whose package and user files were edited afterwards"""
    target_dir = tmp_path / "project"
    generate_project_structure(target_dir, package_root)
    (target_dir / "compose.services.yml").write_text("edited")
    (target_dir / "config" / "services.env.template").write_text("edited")
    (target_dir / "config" / "services.env").write_text(KEPT_ENV)
    return target_dir


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


def test_generate_project_structure_force_overwrites_package_files(
    edited_project, package_root
):
    """With force, package files are overwritten and user config is kept"""
    success, message = generate_project_structure(
        edited_project, package_root, force=True
    )
    assert success is True
    assert "Overwrote compose.services.yml" in message
    assert "Overwrote config/" in message
    assert "Skipping data (already exists)" in message
    assert (edited_project / "compose.services.yml").read_text() == "version: '3'"
    config_dir = edited_project / "config"
    assert (config_dir / "services.env.template").read_text() == "ENV=value"
    assert (config_dir / "services.env").read_text() == KEPT_ENV


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
