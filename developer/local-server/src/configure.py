"""Create the GitLab users and OAuth 2.0 applications the package needs."""

import re
import secrets

from files import update_env_file, write_private
from gitlab_api import GitLab, create_root_token
from settings import USERS
from shell import step
from stack import compose

CLIENT_SCOPES = "openid profile read_user read_repository api"
SERVER_APP = "DTaaS Server Authorization"
CLIENT_ID_PATTERN = re.compile(r"(REACT_APP_CLIENT_ID:\s*')[^']*(')")


def write_secret(settings, name, value):
    """Store a generated secret in a file that only the owner can read."""
    settings.secrets_dir.mkdir(mode=0o700, parents=True, exist_ok=True)
    write_private(settings.secrets_dir / name, value + "\n")


def read_secret(settings, name):
    """Read a secret stored by write_secret."""
    path = settings.secrets_dir / name
    if not path.exists():
        raise RuntimeError(f"{path} is missing; run the 'configure' command first")
    return path.read_text(encoding="utf-8").strip()


def create_users(settings, gitlab):
    """Create the workspace users and store their passwords.

    The emails are the ones that conf.server allows. A user that GitLab
    has but whose password is not stored, for example after the working
    directory was deleted, stops the step instead of being left unusable.
    """
    for user in USERS:
        password_file = settings.secrets_dir / f"{user}-password"
        if gitlab.find_user(user):
            if not password_file.exists():
                raise RuntimeError(
                    f"GitLab has {user}, but {password_file} is missing; "
                    "run 'clean' to start again")
            continue
        password = secrets.token_urlsafe(12) + "Aa1!"
        gitlab.create_user(user, f"{user}@emailservice.com", password)
        write_secret(settings, f"{user}-password", password)


def create_oauth_app(gitlab, name, redirect_uri, scopes, confidential):
    """Register an OAuth 2.0 application and return its id and secret."""
    app = gitlab.request("POST", "applications", {
        "name": name, "redirect_uri": redirect_uri,
        "scopes": scopes, "confidential": confidential,
    })
    return app["application_id"], app["secret"]


def needs_oauth_apps(settings, gitlab):
    """Tell whether the OAuth 2.0 applications must be registered.

    Both sides count: after 'clean', config/.env holds ids of applications
    that GitLab no longer has; after the working directory is deleted,
    GitLab has applications whose ids config/.env lacks.
    """
    env = (settings.package_dir / "config" / ".env").read_text(encoding="utf-8")
    if "your_client_id_here" in env:
        return True
    apps = gitlab.request("GET", "applications?per_page=100") or []
    return not any(app["application_name"] == SERVER_APP for app in apps)


def configure_oauth(settings, gitlab):
    """Register both applications and write their ids into the config."""
    base = f"https://{settings.hostname}"
    server_id, server_secret = create_oauth_app(
        gitlab, SERVER_APP, f"{base}/_oauth", "read_user", True)
    client_id, _ = create_oauth_app(
        gitlab, "DTaaS Client Authorization", f"{base}/Library",
        CLIENT_SCOPES, False)
    config = settings.package_dir / "config"
    update_env_file(config / ".env", {
        "OAUTH_CLIENT_ID": server_id,
        "OAUTH_CLIENT_SECRET": server_secret,
        "OAUTH_SECRET": secrets.token_hex(24),
    })
    client = (config / "client.js").read_text(encoding="utf-8")
    (config / "client.js").write_text(
        CLIENT_ID_PATTERN.sub(rf"\g<1>{client_id}\g<2>", client), encoding="utf-8")


def configure_gitlab(settings):
    """Create users and OAuth apps, then restart the services that use them."""
    step("Creating a root access token")
    token = create_root_token()
    write_secret(settings, "root-token", token)
    gitlab = GitLab(settings.gitlab_url, token, settings.ca_file)
    step("Creating users")
    create_users(settings, gitlab)
    if needs_oauth_apps(settings, gitlab):
        step("Registering the OAuth 2.0 applications")
        configure_oauth(settings, gitlab)
        compose(settings, "up", "-d", "--force-recreate",
                "client", "traefik-forward-auth")
    print(f"Passwords and tokens are in {settings.secrets_dir}")
