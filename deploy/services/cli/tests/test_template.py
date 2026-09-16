"""Tests for template and project structure functions"""

# pylint: disable=redefined-outer-name
import stat
import sys
from pathlib import Path
import pytest
import dtaas_services
from dtaas_services.pkg.template import (
    PROTECTED_CONFIG_NAMES,
    generate_project_structure,
)

KEPT_ENV = "HOSTNAME=kept.example"
LOCAL_EDIT = "local hardening"

# Protected names the package actually ships under templates/config/.
SHIPPED_PROTECTED_PATHS = [
    "config/mongod.conf.secure",
    "config/rabbitmq/rabbitmq.conf",
    "config/rabbitmq/rabbitmq.enabled_plugins",
]


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


@pytest.fixture
def real_package_root():
    """Root of the installed package, holding the templates that ship in the wheel"""
    return Path(dtaas_services.__file__).parent


@pytest.fixture
def real_project(tmp_path, real_package_root):
    """Project generated from the real templates, then edited locally"""
    target_dir = tmp_path / "real-project"
    generate_project_structure(target_dir, real_package_root)
    for relative in SHIPPED_PROTECTED_PATHS:
        (target_dir / relative).write_text(LOCAL_EDIT)
    (target_dir / "compose.services.yml").write_text(LOCAL_EDIT)
    return target_dir


def test_shipped_config_files_are_protected(real_package_root):
    """Every protected file the wheel ships is named in PROTECTED_CONFIG_NAMES"""
    templates_config = real_package_root / "templates" / "config"
    for relative in SHIPPED_PROTECTED_PATHS:
        shipped = real_package_root / "templates" / relative
        assert shipped.exists(), f"{relative} is no longer shipped; update the test"
        assert shipped.name in PROTECTED_CONFIG_NAMES
    # Guard the rule itself: no shipped config file may be silently overwritable
    overwritable = [
        path.name
        for path in templates_config.rglob("*")
        if path.is_file()
        and not path.name.endswith(".template")
        and path.name != ".gitkeep"
        and path.name not in PROTECTED_CONFIG_NAMES
    ]
    assert not overwritable, f"unprotected config files shipped: {overwritable}"


def test_force_keeps_real_service_config(real_project, real_package_root):
    """Against the real templates, force refreshes compose but keeps service config"""
    success, message = generate_project_structure(
        real_project, real_package_root, force=True
    )
    assert success is True
    for relative in SHIPPED_PROTECTED_PATHS:
        assert (real_project / relative).read_text() == LOCAL_EDIT
        assert f"  Kept {relative} (protected)" in message
    assert (real_project / "compose.services.yml").read_text() != LOCAL_EDIT
    assert "re-run 'dtaas-services host setup'" in message


def test_force_keeps_protected_file_shipped_by_the_package(tmp_path, package_root):
    """A protected name shipped under templates/config is still never overwritten"""
    (package_root / "templates" / "config" / "services.env").write_text("PACKAGED=1")
    target_dir = tmp_path / "project"
    generate_project_structure(target_dir, package_root)
    (target_dir / "config" / "services.env").write_text(KEPT_ENV)
    _, message = generate_project_structure(target_dir, package_root, force=True)
    assert (target_dir / "config" / "services.env").read_text() == KEPT_ENV
    assert "  Kept config/services.env (protected)" in message


@pytest.mark.skipif(sys.platform == "win32", reason="POSIX permission test")
def test_force_keeps_destination_permissions(edited_project, package_root):
    """An overwritten file keeps the mode it had, not the one from the package"""
    compose_file = edited_project / "compose.services.yml"
    compose_file.chmod(0o640)
    generate_project_structure(edited_project, package_root, force=True)
    assert stat.S_IMODE(compose_file.stat().st_mode) == 0o640


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
