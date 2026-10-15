"""Create the GitLab users and OAuth 2.0 applications the package needs."""

import re
import secrets

from gitlab import GitLab, create_root_token
from package import set_env_value
from settings import USERS
from shell import step
from stack import compose

CLIENT_SCOPES = "openid profile read_user read_repository api"
CLIENT_ID_PATTERN = re.compile(r"(REACT_APP_CLIENT_ID:\s*')[^']*(')")


def write_secret(settings, name, value):
    """Store a generated secret in a file that only the owner can read."""
    settings.secrets_dir.mkdir(mode=0o700, parents=True, exist_ok=True)
    path = settings.secrets_dir / name
    path.touch(mode=0o600)
    path.write_text(value + "\n", encoding="utf-8")


def read_secret(settings, name):
    """Read a secret stored by write_secret."""
    return (settings.secrets_dir / name).read_text(encoding="utf-8").strip()


def create_users(gitlab):
    """Create the workspace users with the emails that conf.server allows."""
    for user in USERS:
        password = secrets.token_urlsafe(12) + "Aa1!"
        if gitlab.ensure_user(user, f"{user}@emailservice.com", password):
            yield user, password


def create_oauth_app(gitlab, name, redirect_uri, scopes, confidential):
    """Register an OAuth 2.0 application and return its id and secret."""
    app = gitlab.request("POST", "applications", {
        "name": name, "redirect_uri": redirect_uri,
        "scopes": scopes, "confidential": confidential,
    })
    return app["application_id"], app["secret"]


def configure_oauth(settings, gitlab):
    """Register both applications and write their ids into the config."""
    base = f"https://{settings.hostname}"
    server_id, server_secret = create_oauth_app(
        gitlab, "DTaaS Server Authorization", f"{base}/_oauth", "read_user", True)
    client_id, _ = create_oauth_app(
        gitlab, "DTaaS Client Authorization", f"{base}/Library",
        CLIENT_SCOPES, False)
    config = settings.package_dir / "config"
    env = (config / ".env").read_text(encoding="utf-8")
    for key, value in (("OAUTH_CLIENT_ID", server_id),
                       ("OAUTH_CLIENT_SECRET", server_secret),
                       ("OAUTH_SECRET", secrets.token_hex(24))):
        env = set_env_value(env, key, value)
    (config / ".env").write_text(env, encoding="utf-8")
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
    for user, password in create_users(gitlab):
        write_secret(settings, f"{user}-password", password)
    env_file = settings.package_dir / "config" / ".env"
    if "your_client_id_here" in env_file.read_text(encoding="utf-8"):
        step("Registering the OAuth 2.0 applications")
        configure_oauth(settings, gitlab)
        compose(settings, "up", "-d", "--force-recreate",
                "client", "traefik-forward-auth")
    print(f"Passwords and tokens are in {settings.secrets_dir}")
