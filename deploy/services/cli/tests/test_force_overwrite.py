"""Tests for the project generate --force overwrite policy"""

# pylint: disable=redefined-outer-name
import stat
import sys
from pathlib import Path
import pytest
import dtaas_services
from dtaas_services.pkg.template import generate_project_structure
from dtaas_services.pkg.force_overwrite import PROTECTED_CONFIG_NAMES

LOCAL_EDIT = "local hardening"

# Protected names the package actually ships under templates/config/.
SHIPPED_PROTECTED_PATHS = [
    "config/mongod.conf.secure",
    "config/rabbitmq/rabbitmq.conf",
    "config/rabbitmq/rabbitmq.enabled_plugins",
]


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


def test_force_overwrites_package_files(edited_project, package_root):
    """With force, package files are overwritten and user config is kept"""
    config_dir = edited_project / "config"
    kept_before = (config_dir / "services.env").read_text()
    success, message = generate_project_structure(
        edited_project, package_root, force=True
    )
    assert success is True
    assert "Overwrote compose.services.yml" in message
    assert "Overwrote config/" in message
    assert "Skipping data (already exists)" in message
    assert (edited_project / "compose.services.yml").read_text() == "version: '3'"
    assert (config_dir / "services.env.template").read_text() == "ENV=value"
    assert (config_dir / "services.env").read_text() == kept_before


def test_shipped_config_files_are_protected(real_package_root):
    """Every protected file the wheel ships is named in PROTECTED_CONFIG_NAMES

    Only templates/config/ is scanned on purpose: the compose files at the
    templates root are meant to be refreshed by --force.
    """
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
    assert "copy it aside, delete it" in message


def test_force_keeps_protected_file_shipped_by_the_package(tmp_path, package_root):
    """A protected name shipped under templates/config is still never overwritten"""
    (package_root / "templates" / "config" / "services.env").write_text("PACKAGED=1")
    target_dir = tmp_path / "project"
    generate_project_structure(target_dir, package_root)
    (target_dir / "config" / "services.env").write_text(LOCAL_EDIT)
    _, message = generate_project_structure(target_dir, package_root, force=True)
    assert (target_dir / "config" / "services.env").read_text() == LOCAL_EDIT
    assert "  Kept config/services.env (protected)" in message


@pytest.mark.skipif(sys.platform == "win32", reason="POSIX permission test")
@pytest.mark.parametrize(
    "relative, mode",
    [
        ("compose.services.yml", 0o640),
        ("config", 0o700),
        ("config/nested", 0o700),
    ],
)
def test_force_keeps_destination_permissions(
    edited_project, package_root, relative, mode
):
    """An overwritten file or directory keeps its own mode, not the package one"""
    target = edited_project / relative
    target.chmod(mode)
    generate_project_structure(edited_project, package_root, force=True)
    assert stat.S_IMODE(target.stat().st_mode) == mode


@pytest.mark.skipif(sys.platform == "win32", reason="POSIX permission test")
def test_failed_force_still_restores_directory_permissions(
    edited_project, package_root, mocker
):
    """A copy that fails partway must not leave config/ at the packaged mode"""
    config_dir = edited_project / "config"
    config_dir.chmod(0o700)
    mocker.patch(
        "dtaas_services.pkg.force_overwrite._copy_preserving_mode",
        side_effect=OSError("disk full"),
    )
    success, message = generate_project_structure(
        edited_project, package_root, force=True
    )
    assert success is False
    assert "Failed to generate project" in message
    assert stat.S_IMODE(config_dir.stat().st_mode) == 0o700
