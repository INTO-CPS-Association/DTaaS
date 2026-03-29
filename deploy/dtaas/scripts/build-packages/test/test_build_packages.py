"""Tests for deploy.dtaas.scripts.build-packages module."""

from __future__ import annotations

import importlib.util
import os
from pathlib import Path
import sys


def load_module():
    """Load build_packages.py module from new src path."""
    repo_root = Path(__file__).resolve().parents[5]
    script = (
        repo_root
        / "deploy"
        / "dtaas"
        / "scripts"
        / "build-packages"
        / "src"
        / "build_packages.py"
    )
    spec = importlib.util.spec_from_file_location("src.build_packages", script)
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def load_settings_module():
    """Load settings module for direct image config tests."""
    repo_root = Path(__file__).resolve().parents[5]
    module_path = (
        repo_root
        / "deploy"
        / "dtaas"
        / "scripts"
        / "build-packages"
        / "src"
        / "settings.py"
    )
    spec = importlib.util.spec_from_file_location("src.settings", module_path)
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def seed_source_tree(tmp_path: Path) -> None:
    """Create a minimal source tree for package generation tests."""
    src = tmp_path / "deploy" / "dtaas" / "src" / "common"
    for folder in (
        "files/common",
        "files/user1",
        "files/user2",
        "files/template",
        "config/client",
        "config/forward-auth",
        "config/traefik",
        "assets",
    ):
        (src / folder).mkdir(parents=True, exist_ok=True)
    (src / "files" / "common" / ".gitkeep").write_text("", encoding="utf-8")
    (src / "files" / "user1" / ".gitkeep").write_text("", encoding="utf-8")
    (src / "files" / "user2" / ".gitkeep").write_text("", encoding="utf-8")
    (src / "files" / "template" / ".gitkeep").write_text("", encoding="utf-8")
    (src / "config" / "client" / "env.local.js").write_text("local", encoding="utf-8")
    (src / "config" / "client" / "env.server.js").write_text("server", encoding="utf-8")
    (src / "config" / "forward-auth" / "conf.server").write_text(
        "rule", encoding="utf-8"
    )
    (src / "config" / "forward-auth" / "resolv.conf").write_text(
        "dns", encoding="utf-8"
    )
    (src / "config" / "traefik" / "tls.local.yml").write_text(
        "tls:\n  certificates:\n    - certFile: /etc/traefik-certs/fullchain.pem\n",
        encoding="utf-8",
    )
    (src / "config" / "traefik" / "tls.server.yml").write_text(
        "tls:\n  certificates:\n    - certFile: /etc/traefik-certs/fullchain.pem\n",
        encoding="utf-8",
    )
    (src / "config" / "libms.yaml").write_text("port: '4001'", encoding="utf-8")
    for image in (
        "localhost.png",
        "localhost-https.png",
        "server.png",
        "traefik-forward-auth.png",
    ):
        (src / "assets" / image).write_bytes(b"png")
    (src / "LICENSE.md").write_text("license", encoding="utf-8")
    (src / ".env.local.example").write_text("USERNAME1=user1", encoding="utf-8")
    (src / ".env.server.example").write_text(
        "\n".join(
            [
                "SERVER_DNS=localhost",
                "OAUTH_URL=https://gitlab.foo.com",
                "OAUTH_CLIENT_ID=xx",
                "OAUTH_CLIENT_SECRET=xx",
                "OAUTH_SECRET=random-secret-string",
                "USERNAME1=user1",
                "USERNAME2=user2",
            ]
        ),
        encoding="utf-8",
    )


def seed_config_tree(tmp_path: Path) -> None:
    """Create dtaas.toml at new build-packages location."""
    conf_dir = tmp_path / "deploy" / "dtaas" / "scripts" / "build-packages"
    conf_dir.mkdir(parents=True, exist_ok=True)
    (conf_dir / "dtaas.toml").write_text(
        "\n".join(
            [
                "[images]",
                'traefik = "traefik:v3.6.4"',
                'forward_auth = "thomseddon/traefik-forward-auth:2.2.0"',
                'client = "intocps/dtaas-web:1.0.2"',
                'libms = "intocps/libms:0.5.9"',
                'workspace = "intocps/workspace:main-967bc10"',
            ]
        ),
        encoding="utf-8",
    )


def test_parse_args_defaults_to_build(monkeypatch):
    module = load_module()
    monkeypatch.setattr(sys, "argv", ["build-packages.py"])
    args = module.parse_args()
    assert args.build is True
    assert args.clean is False


def test_parse_args_clean_only(monkeypatch):
    module = load_module()
    monkeypatch.setattr(sys, "argv", ["build-packages.py", "--clean"])
    args = module.parse_args()
    assert args.clean is True
    assert args.build is False


def test_load_images_from_toml(tmp_path):
    settings = load_settings_module()
    seed_config_tree(tmp_path)
    images = settings.load_images(
        tmp_path / "deploy" / "dtaas" / "scripts" / "build-packages" / "dtaas.toml"
    )
    assert images.traefik == "traefik:v3.6.4"
    assert images.client == "intocps/dtaas-web:1.0.2"


def test_load_images_missing_section_raises(tmp_path):
    settings = load_settings_module()
    config = tmp_path / "deploy" / "dtaas" / "scripts" / "build-packages" / "dtaas.toml"
    config.parent.mkdir(parents=True, exist_ok=True)
    config.write_text("", encoding="utf-8")
    try:
        settings.load_images(config)
    except ValueError as exc:
        assert "Missing [images]" in str(exc)
    else:
        raise AssertionError("Expected ValueError for missing [images] section")


def test_build_creates_expected_structure(tmp_path):
    module = load_module()
    seed_source_tree(tmp_path)
    seed_config_tree(tmp_path)
    module.build_packages(
        source_root=tmp_path / "deploy" / "dtaas" / "src" / "common",
        output_root=tmp_path / "deploy" / "dtaas" / "docker",
        images=module.load_images(
            tmp_path / "deploy" / "dtaas" / "scripts" / "build-packages" / "dtaas.toml"
        ),
    )

    localhost = tmp_path / "deploy" / "dtaas" / "docker" / "localhost"
    secure_localhost = tmp_path / "deploy" / "dtaas" / "docker" / "secure-localhost"
    server = tmp_path / "deploy" / "dtaas" / "docker" / "server"
    secure_server = tmp_path / "deploy" / "dtaas" / "docker" / "secure-server"

    assert (localhost / "docker-compose.yml").exists()
    assert (secure_localhost / "docker-compose.yml").exists()
    assert (server / "docker-compose.yml").exists()
    assert (secure_server / "docker-compose.yml").exists()

    assert (localhost / "files" / "common").exists()
    assert (localhost / "files" / "user1").exists()
    assert not (localhost / "files" / "user2").exists()
    assert not (localhost / "files" / "template").exists()

    assert (localhost / "localhost.png").exists()
    assert not (localhost / "localhost-https.png").exists()
    assert not (localhost / "server.png").exists()

    assert (secure_localhost / "localhost-https.png").exists()
    assert not (secure_localhost / "localhost.png").exists()
    assert not (secure_localhost / "server.png").exists()

    assert (server / "server.png").exists()
    assert not (server / "localhost.png").exists()
    assert not (server / "traefik-forward-auth.png").exists()

    assert (secure_server / "server.png").exists()
    assert not (secure_server / "localhost.png").exists()
    assert not (secure_server / "traefik-forward-auth.png").exists()

    assert (secure_server / "certs" / "fullchain.pem").exists()
    assert (secure_server / "certs" / "privkey.pem").exists()
    assert not (secure_server / "certs" / "foo.com").exists()

    localhost_compose = (localhost / "docker-compose.yml").read_text(encoding="utf-8")
    secure_localhost_compose = (secure_localhost / "docker-compose.yml").read_text(
        encoding="utf-8"
    )
    server_compose = (server / "docker-compose.yml").read_text(encoding="utf-8")
    secure_server_compose = (secure_server / "docker-compose.yml").read_text(
        encoding="utf-8"
    )

    assert "traefik:v3.6.4" in localhost_compose
    assert "intocps/dtaas-web:1.0.2" in localhost_compose
    assert "traefik-forward-auth" not in localhost_compose
    assert "traefik-forward-auth" not in secure_localhost_compose
    assert "traefik-forward-auth" in server_compose
    assert "traefik-forward-auth" in secure_server_compose


def test_clean_removes_generated_directories(tmp_path):
    module = load_module()
    output = tmp_path / "deploy" / "dtaas" / "docker"
    for folder in ("localhost", "secure-localhost", "server", "secure-server"):
        (output / folder).mkdir(parents=True, exist_ok=True)
    module.clean_packages(output)
    assert not (output / "localhost").exists()
    assert not (output / "secure-localhost").exists()
    assert not (output / "server").exists()
    assert not (output / "secure-server").exists()


def test_main_build_works_from_new_path(monkeypatch, tmp_path):
    module = load_module()
    seed_source_tree(tmp_path)
    seed_config_tree(tmp_path)
    monkeypatch.setattr(
        sys, "argv", ["build-packages.py", "--build", "--root", str(tmp_path)]
    )
    module.main()
    assert (tmp_path / "deploy" / "dtaas" / "docker" / "localhost").exists()
    monkeypatch.setattr(
        sys, "argv", ["build-packages.py", "--clean", "--root", str(tmp_path)]
    )
    module.main()
    assert not (tmp_path / "deploy" / "dtaas" / "docker" / "localhost").exists()


def test_cli_wrapper_invokes_main(monkeypatch, tmp_path):
    repo_root = Path(__file__).resolve().parents[5]
    wrapper = (
        repo_root
        / "deploy"
        / "dtaas"
        / "scripts"
        / "build-packages"
        / "build-packages.py"
    )
    seed_source_tree(tmp_path)
    seed_config_tree(tmp_path)
    monkeypatch.setattr(
        sys,
        "argv",
        [str(wrapper), "--build", "--root", str(tmp_path)],
    )
    old_cwd = Path.cwd()
    os.chdir(wrapper.parent)
    try:
        spec = importlib.util.spec_from_file_location("build_packages_cli", wrapper)
        assert spec is not None
        assert spec.loader is not None
        module = importlib.util.module_from_spec(spec)
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        module.main()
    finally:
        os.chdir(old_cwd)
    assert (tmp_path / "deploy" / "dtaas" / "docker" / "server").exists()
