"""Tests for configure.py."""

import stat

import pytest

from fakes import FakeGitLab

import configure
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
    assert "OAUTH_CLIENT_ID=app1" in env
    assert "OAUTH_CLIENT_SECRET=s1" in env
    assert "OAUTH_SECRET=" in env
    assert "REACT_APP_CLIENT_ID: 'app1'" in (config / "client.js").read_text(encoding="utf-8")
    redirects = [data["redirect_uri"] for _, _, data in gitlab.requests]
    assert redirects == ["https://intocps.test/_oauth",
                         "https://intocps.test/Library"]


class Users(FakeGitLab):
    """FakeGitLab that knows some users and records created ones."""

    def __init__(self, existing_users):
        super().__init__()
        self.existing_users = existing_users
        self.created = []

    def find_user(self, username):
        """Return a user if the name is known."""
        return {"id": 1} if username in self.existing_users else None

    def create_user(self, username, email, _password):
        """Record the created user."""
        self.created.append((username, email))


def test_create_users_stores_new_passwords(tmp_path):
    """New users get a stored password; known users with one are kept."""
    settings = Settings("intocps.test", 5050, tmp_path)
    configure.write_secret(settings, "user1-password", "kept")
    gitlab = Users({"user1"})
    configure.create_users(settings, gitlab)
    assert gitlab.created == [("user2", "user2@emailservice.com")]
    assert configure.read_secret(settings, "user1-password") == "kept"
    assert configure.read_secret(settings, "user2-password")


def test_create_users_stops_without_stored_password(tmp_path):
    """A known user without a stored password stops the step."""
    settings = Settings("intocps.test", 5050, tmp_path)
    gitlab = Users({"user1"})
    with pytest.raises(RuntimeError, match="clean"):
        configure.create_users(settings, gitlab)


def test_needs_oauth_apps_checks_file_and_gitlab(tmp_path):
    """Placeholders in .env or a missing application need registration."""
    settings = Settings("intocps.test", 5050, tmp_path)
    env = settings.package_dir / "config" / ".env"
    env.parent.mkdir(parents=True)
    env.write_text("OAUTH_CLIENT_ID=your_client_id_here\n", encoding="utf-8")
    assert configure.needs_oauth_apps(settings, FakeGitLab())
    env.write_text("OAUTH_CLIENT_ID=app1\n", encoding="utf-8")
    for apps, expected in (([], True),
                           ([{"application_name": "Other"}], True),
                           ([{"application_name": configure.SERVER_APP}], False)):
        gitlab = FakeGitLab({("GET", "applications"): apps})
        assert configure.needs_oauth_apps(settings, gitlab) is expected


def test_read_secret_explains_missing_file(tmp_path):
    """A missing secret points to the configure command."""
    settings = Settings("intocps.test", 5050, tmp_path)
    with pytest.raises(RuntimeError, match="configure"):
        configure.read_secret(settings, "root-token")


def test_write_secret_tightens_existing_file(tmp_path):
    """An existing secret file loses wider permissions."""
    settings = Settings("intocps.test", 5050, tmp_path)
    settings.secrets_dir.mkdir(mode=0o700)
    path = settings.secrets_dir / "root-token"
    path.write_text("old", encoding="utf-8")
    path.chmod(0o644)
    configure.write_secret(settings, "root-token", "new")
    assert stat.S_IMODE(path.stat().st_mode) == 0o600
