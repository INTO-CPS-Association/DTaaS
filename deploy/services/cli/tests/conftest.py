"""Fixtures shared by the project generation and force overwrite tests."""

# pylint: disable=redefined-outer-name
import pytest
from dtaas_services.pkg.template import generate_project_structure

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
    # A nested, unprotected config file, so copytree recurses one level down
    (templates_root / "config" / "nested").mkdir()
    (templates_root / "config" / "nested" / "extra.conf").write_text("packaged")
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
