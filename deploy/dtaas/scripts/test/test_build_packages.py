"""Tests for deploy.dtaas.scripts.build-packages module."""

from __future__ import annotations

import importlib.util
from pathlib import Path
import sys


def load_module():
    """Load build-packages.py as a module."""
    repo_root = Path(__file__).resolve().parents[4]
    script = repo_root / "deploy" / "dtaas" / "scripts" / "build-packages.py"
    spec = importlib.util.spec_from_file_location("build_packages", script)
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def seed_source_tree(tmp_path: Path) -> Path:
    """Create a minimal source tree required by build_packages()."""
    src = tmp_path / "deploy" / "dtaas" / "src" / "common"
    (src / "files" / "common").mkdir(parents=True)
    (src / "files" / "common" / ".gitkeep").write_text("", encoding="utf-8")
    (src / "files" / "user1").mkdir(parents=True)
    (src / "files" / "user1" / ".gitkeep").write_text("", encoding="utf-8")
    (src / "files" / "user2").mkdir(parents=True)
    (src / "files" / "user2" / ".gitkeep").write_text("", encoding="utf-8")

    (src / "config" / "client").mkdir(parents=True, exist_ok=True)
    (src / "config" / "client" / "env.local.js").write_text("local", encoding="utf-8")
    (src / "config" / "client" / "env.server.js").write_text(
        "server",
        encoding="utf-8",
    )

    (src / "config" / "forward-auth").mkdir(parents=True, exist_ok=True)
    (src / "config" / "forward-auth" / "conf.server").write_text("rule", encoding="utf-8")
    (src / "config" / "forward-auth" / "resolv.conf").write_text(
        "nameserver 8.8.8.8",
        encoding="utf-8",
    )

    (src / "config" / "traefik").mkdir(parents=True, exist_ok=True)
    (src / "config" / "traefik" / "tls.local.yml").write_text("tls", encoding="utf-8")
    (src / "config" / "traefik" / "tls.server.yml").write_text("tls", encoding="utf-8")

    (src / "assets").mkdir(parents=True, exist_ok=True)
    for image_name in (
        "localhost.png",
        "localhost-https.png",
        "server.png",
        "traefik-forward-auth.png",
    ):
        (src / "assets" / image_name).write_bytes(b"png")
    return src


def test_build_creates_all_scenarios(tmp_path):
    """Build writes all expected package directories."""
    module = load_module()
    seed_source_tree(tmp_path)

    module.build_packages(root=tmp_path, clean=True)

    output = tmp_path / "deploy" / "dtaas" / "docker"
    assert (output / "localhost").exists()
    assert (output / "secure-localhost").exists()
    assert (output / "server").exists()
    assert (output / "secure-server").exists()


def test_generated_localhost_compose_uses_workspace_image(tmp_path):
    """Localhost package uses pinned workspace image and MAIN_USER."""
    module = load_module()
    seed_source_tree(tmp_path)

    module.build_packages(root=tmp_path, clean=True)

    compose_text = (
        tmp_path
        / "deploy"
        / "dtaas"
        / "docker"
        / "localhost"
        / "docker-compose.yml"
    ).read_text(encoding="utf-8")

    assert "image: intocps/workspace:main-967bc10" in compose_text
    assert "- MAIN_USER=${username1}" in compose_text
    assert "mltooling/ml-workspace-minimal" not in compose_text


def test_secure_server_has_tls_and_forward_auth(tmp_path):
    """Secure server package includes tls mount and forward auth."""
    module = load_module()
    seed_source_tree(tmp_path)

    module.build_packages(root=tmp_path, clean=True)

    compose_text = (
        tmp_path
        / "deploy"
        / "dtaas"
        / "docker"
        / "secure-server"
        / "docker-compose.yml"
    ).read_text(encoding="utf-8")

    assert "./dynamic/tls.yml:/etc/traefik/dynamic/tls.yml" in compose_text
    assert "traefik-forward-auth" in compose_text
    assert "./config/forward-auth/resolv.conf:/etc/resolv.conf" in compose_text
