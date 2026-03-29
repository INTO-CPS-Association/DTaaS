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


def test_parse_args_defaults_to_build(monkeypatch):
    """No flags should default to build mode."""
    module = load_module()
    monkeypatch.setattr(sys, "argv", ["build-packages.py"])
    args = module.parse_args()
    assert args.build is True
    assert args.clean is False


def test_parse_args_clean_only(monkeypatch):
    """Clean mode should not force build."""
    module = load_module()
    monkeypatch.setattr(sys, "argv", ["build-packages.py", "--clean"])
    args = module.parse_args()
    assert args.clean is True
    assert args.build is False


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
    (src / "config" / "traefik" / "tls.local.yml").write_text("tls-local", encoding="utf-8")
    (src / "config" / "traefik" / "tls.server.yml").write_text("tls-server", encoding="utf-8")
    (src / "config" / "libms.yaml").write_text("port: '4001'", encoding="utf-8")

    (src / "assets").mkdir(parents=True, exist_ok=True)
    for image_name in (
        "localhost.png",
        "localhost-https.png",
        "server.png",
        "traefik-forward-auth.png",
    ):
        (src / "assets" / image_name).write_bytes(b"png")

    (src / "LICENSE.md").write_text("license", encoding="utf-8")
    (src / ".env.local.example").write_text("LOCAL_ENV=true", encoding="utf-8")
    (src / ".env.server.example").write_text("SERVER_ENV=true", encoding="utf-8")
    return src


def test_build_creates_all_scenarios(tmp_path):
    """Build writes all expected package directories."""
    module = load_module()
    seed_source_tree(tmp_path)

    module.build_packages(root=tmp_path)

    output = tmp_path / "deploy" / "dtaas" / "docker"
    assert (output / "localhost").exists()
    assert (output / "secure-localhost").exists()
    assert (output / "server").exists()
    assert (output / "secure-server").exists()


def test_clean_removes_generated_packages(tmp_path):
    """Clean removes all generated package folders."""
    module = load_module()
    seed_source_tree(tmp_path)
    module.build_packages(root=tmp_path)

    output = tmp_path / "deploy" / "dtaas" / "docker"
    assert (output / "localhost").exists()

    module.clean_packages(output)
    assert not (output / "localhost").exists()
    assert not (output / "secure-localhost").exists()
    assert not (output / "server").exists()
    assert not (output / "secure-server").exists()


def test_generated_localhost_compose_uses_workspace_image(tmp_path):
    """Localhost package uses pinned workspace image and MAIN_USER."""
    module = load_module()
    seed_source_tree(tmp_path)

    module.build_packages(root=tmp_path)

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

    module.build_packages(root=tmp_path)

    compose_text = (
        tmp_path
        / "deploy"
        / "dtaas"
        / "docker"
        / "secure-server"
        / "docker-compose.yml"
    ).read_text(encoding="utf-8")

    assert "./config/traefik/tls.yml:/etc/traefik/config/tls.yml" in compose_text
    assert "--providers.file.directory=/etc/traefik/config" in compose_text
    assert "traefik-forward-auth" in compose_text
    assert "./config/forward-auth/resolv.conf:/etc/resolv.conf" in compose_text


def test_localhost_has_no_forward_auth(tmp_path):
    """Localhost scenarios do not include forward-auth middleware/service."""
    module = load_module()
    seed_source_tree(tmp_path)

    module.build_packages(root=tmp_path)

    localhost_compose = (
        tmp_path / "deploy" / "dtaas" / "docker" / "localhost" / "docker-compose.yml"
    ).read_text(encoding="utf-8")
    secure_localhost_compose = (
        tmp_path / "deploy" / "dtaas" / "docker" / "secure-localhost" / "docker-compose.yml"
    ).read_text(encoding="utf-8")

    assert "traefik-forward-auth:" not in localhost_compose
    assert "traefik-forward-auth" not in localhost_compose
    assert "traefik-forward-auth:" not in secure_localhost_compose
    assert "traefik-forward-auth" not in secure_localhost_compose


def test_build_copies_env_and_license_from_source(tmp_path):
    """Generated packages copy env and license files from source tree."""
    module = load_module()
    seed_source_tree(tmp_path)
    module.build_packages(root=tmp_path)

    localhost = tmp_path / "deploy" / "dtaas" / "docker" / "localhost"
    server = tmp_path / "deploy" / "dtaas" / "docker" / "server"
    secure_localhost = tmp_path / "deploy" / "dtaas" / "docker" / "secure-localhost"
    secure_server = tmp_path / "deploy" / "dtaas" / "docker" / "secure-server"

    assert (localhost / ".env.example").read_text(encoding="utf-8").strip() == "LOCAL_ENV=true"
    assert (server / ".env.example").read_text(encoding="utf-8").strip() == "SERVER_ENV=true"
    assert (localhost / "LICENSE.md").read_text(encoding="utf-8").strip() == "license"
    assert (server / "LICENSE.md").read_text(encoding="utf-8").strip() == "license"
    assert (localhost / "config" / "client" / "env.local.js").exists()
    assert not (localhost / "config" / "client" / "env.server.js").exists()
    assert (server / "config" / "client" / "env.server.js").exists()
    assert not (server / "config" / "client" / "env.local.js").exists()
    assert not (localhost / "config" / "forward-auth" / "conf.server").exists()
    assert (server / "config" / "forward-auth" / "conf.server").exists()
    assert (server / "config" / "libms.yaml").exists()
    assert not (localhost / "config" / "libms.yaml").exists()
    assert (secure_localhost / "config" / "traefik" / "tls.yml").exists()
    assert (secure_server / "config" / "traefik" / "tls.yml").exists()
