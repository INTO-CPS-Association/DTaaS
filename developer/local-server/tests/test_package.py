"""Tests for package.py."""

from pathlib import Path

import pytest

import package
from settings import TOOL_DIR, Settings


def make_settings(tmp_path):
    """Return settings with a working directory under tmp_path."""
    return Settings("intocps.test", 5051, tmp_path / "work")


def fake_package(tmp_path):
    """Create a minimal package with the example config files."""
    source = tmp_path / "source"
    (source / "config").mkdir(parents=True)
    (source / "files" / "template").mkdir(parents=True)
    (source / "config" / ".env.example").write_text(
        "SERVER_DNS=localhost\nOAUTH_URL=https://localhost/gitlab\n", encoding="utf-8")
    (source / "config" / "conf.server.example").write_text("rule=1\n", encoding="utf-8")
    (source / "docker-compose.yml").write_text("services: {}\n", encoding="utf-8")
    (source / "config" / "client.js.example").write_text(
        "REACT_APP_URL: 'https://intocps.org',\n", encoding="utf-8")
    return source


def test_compose_override_aliases_hostname_and_renames_gitlab():
    """The override aliases SERVER_DNS to Traefik and renames GitLab."""
    override = (TOOL_DIR / "compose.local.yml").read_text(encoding="utf-8")
    assert "- ${SERVER_DNS}" in override
    assert "hostname: gitlab" in override
    assert package.FORWARD_AUTH_IMAGE in override


def test_prepare_package_files(tmp_path, monkeypatch):
    """The package copy points at the test hostname and has its directories."""
    monkeypatch.setattr(package, "PACKAGE_SOURCE", fake_package(tmp_path))
    settings = make_settings(tmp_path)
    package.copy_package(settings)
    package.configure_package(settings)
    package.create_directories(settings)
    config = settings.package_dir / "config"
    env = (config / ".env").read_text(encoding="utf-8")
    assert "SERVER_DNS=intocps.test" in env
    assert "OAUTH_URL=https://intocps.test/gitlab" in env
    assert "REGISTRY_PORT=5051" in env
    assert "https://intocps.test'" in (config / "client.js").read_text(encoding="utf-8")
    assert (settings.package_dir / "logs" / "logger").is_dir()
    assert (settings.package_dir / "files" / "user2").is_dir()


def test_copy_package_keeps_existing_config(tmp_path, monkeypatch):
    """A second run keeps edited config files."""
    monkeypatch.setattr(package, "PACKAGE_SOURCE", fake_package(tmp_path))
    settings = make_settings(tmp_path)
    package.copy_package(settings)
    env = settings.package_dir / "config" / ".env"
    env.write_text("SERVER_DNS=kept\n", encoding="utf-8")
    package.copy_package(settings)
    assert env.read_text(encoding="utf-8") == "SERVER_DNS=kept\n"


def test_create_certificates_skips_existing(tmp_path, monkeypatch):
    """mkcert runs only when no certificate exists."""
    settings = make_settings(tmp_path)
    certs = settings.package_dir / "certs"
    certs.mkdir(parents=True)
    calls = []
    monkeypatch.setattr(package, "run", calls.append)
    package.create_certificates(settings)
    assert calls[0][0] == "mkcert" and "intocps.test" in calls[0]
    Path(certs / "fullchain.pem").write_text("cert", encoding="utf-8")
    package.create_certificates(settings)
    assert len(calls) == 1


def test_copy_package_refreshes_compose_file(tmp_path, monkeypatch):
    """The compose file follows deploy/ even in an existing copy."""
    source = fake_package(tmp_path)
    monkeypatch.setattr(package, "PACKAGE_SOURCE", source)
    settings = make_settings(tmp_path)
    package.copy_package(settings)
    (source / "docker-compose.yml").write_text("changed\n", encoding="utf-8")
    package.copy_package(settings)
    compose = settings.package_dir / "docker-compose.yml"
    assert compose.read_text(encoding="utf-8") == "changed\n"


def test_check_hostname_refuses_another_hostname(tmp_path):
    """A working directory keeps the hostname of its first run."""
    package.check_hostname(make_settings(tmp_path))
    assert (tmp_path / "work" / "hostname").read_text(encoding="utf-8") == "intocps.test\n"
    package.check_hostname(make_settings(tmp_path))
    other = Settings("dtaas.test", 5050, tmp_path / "work")
    with pytest.raises(RuntimeError, match="prepared for intocps.test"):
        package.check_hostname(other)
