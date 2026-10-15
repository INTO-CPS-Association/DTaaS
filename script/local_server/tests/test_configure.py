"""Tests for configure.py."""

import stat
from types import SimpleNamespace

import configure
from fakes import FakeGitLab
from settings import Settings


def test_secrets_are_private(tmp_path):
    """Secrets and their directory are readable by the owner only."""
    settings = Settings("intocps.test", 5050, tmp_path)
    configure.write_secret(settings, "root-token", "glpat-x")
    path = settings.secrets_dir / "root-token"
    assert stat.S_IMODE(path.stat().st_mode) == 0o600
    assert stat.S_IMODE(settings.secrets_dir.stat().st_mode) == 0o700
    assert configure.read_secret(settings, "root-token") == "glpat-x"


def test_configure_oauth_writes_ids(tmp_path):
    """Both OAuth applications are registered and written to the config."""
    settings = Settings("intocps.test", 5050, tmp_path)
    config = settings.package_dir / "config"
    config.mkdir(parents=True)
    (config / ".env").write_text(
        "OAUTH_CLIENT_ID=your_client_id_here\nOAUTH_CLIENT_SECRET=x\n", encoding="utf-8")
    (config / "client.js").write_text(
        "    REACT_APP_CLIENT_ID: 'your_client_id_here',\n", encoding="utf-8")
    gitlab = FakeGitLab({("POST", "applications"):
                         {"application_id": "app1", "secret": "s1"}})
    configure.configure_oauth(settings, gitlab)
    env = (config / ".env").read_text(encoding="utf-8")
    assert "OAUTH_CLIENT_ID=app1" in env and "OAUTH_CLIENT_SECRET=s1" in env
    assert "OAUTH_SECRET=" in env
    assert "REACT_APP_CLIENT_ID: 'app1'" in (config / "client.js").read_text(encoding="utf-8")
    redirects = [data["redirect_uri"] for _, _, data in gitlab.requests]
    assert redirects == ["https://intocps.test/_oauth",
                         "https://intocps.test/Library"]


def test_create_users_returns_only_new_users():
    """Only newly created users are returned with passwords."""
    gitlab = SimpleNamespace(
        ensure_user=lambda username, _email, _password: username == "user2")
    created = list(configure.create_users(gitlab))
    assert [user for user, _ in created] == ["user2"]
