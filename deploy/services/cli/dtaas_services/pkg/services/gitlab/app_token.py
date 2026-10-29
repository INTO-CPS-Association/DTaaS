"""Create the DTaaS OAuth applications owned by the GitLab root user."""

import json
import os
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from ...docker_utils import execute_docker_command, DockerRunOptions
from ...sanitize import escape_js_string
from .personal_token import GITLAB_CONTAINER_NAME, ROOT_USER_ID

APP_MARKER = "DTAAS_APP="
APP_KINDS = ("Server", "Client")

# The REST API only creates instance wide applications, so the script creates
# them as root's (User Settings > Applications). Per configured app, inside one
# transaction: delete instance wide apps of the same name, reuse or create
# root's app, apply the configured settings and renew the secret of a reused
# app (GitLab stores secrets hashed). Each app is printed after the commit.
APPS_SCRIPT_HEAD = (
    f"root = User.find({ROOT_USER_ID}); "
    "org = root.organization || Organizations::Organization.default_organization; "
    "configs = JSON.parse('"
)
APPS_SCRIPT_TAIL = (
    "'); "
    "apps = ActiveRecord::Base.transaction do configs.map do |cfg| "
    "Authn::OauthApplication.where(owner_id: nil, name: cfg['name']).destroy_all; "
    "app = root.oauth_applications.find_or_initialize_by(name: cfg['name']); "
    "app.assign_attributes(cfg); app.organization ||= org; "
    "app.renew_secret if app.persisted?; app.save!; "
    "{ id: app.id, name: app.name, uid: app.uid, secret: app.plaintext_secret } "
    "end end; "
    f"apps.each {{ |app| puts '{APP_MARKER}' + app.to_json }}"
)


@dataclass
class OAuthAppConfig:
    """Configuration for an OAuth application to create."""

    name: str
    redirect_uri: str
    confidential: bool
    scopes: str
    trusted: bool = False


@dataclass
class OAuthAppResult:
    """Result of creating an OAuth application."""

    application_id: int
    name: str
    client_id: str
    client_secret: str


def _load_oauth_apps_config() -> list[dict[str, Any]]:
    """Load OAuth applications configuration from JSON file.

    Looks for the config file in the config/ directory.
    The filename can be overridden via the OAUTH_APPS environment variable.

    Returns:
        List of OAuth application configurations

    Raises:
        FileNotFoundError: If config file is not found in config/
        json.JSONDecodeError: If config file is invalid JSON
    """
    config_filename = os.getenv("OAUTH_APPS", "gitlab_oauth.json")
    config_path = Path.cwd() / "config" / config_filename

    if not config_path.exists():
        raise FileNotFoundError(
            f"OAuth config file not found: {config_path}\n"
            "Please ensure the config file exists in the config/ directory."
        )

    with open(config_path, "r", encoding="utf-8") as f:
        return json.load(f)


def _build_apps_config() -> list[OAuthAppConfig]:
    """Build OAuth app configurations from JSON config file.

    Returns:
        List of OAuthAppConfig objects

    Raises:
        FileNotFoundError: If config file not found
        json.JSONDecodeError: If config is invalid JSON
        KeyError: If required fields missing in config
    """
    apps_data = _load_oauth_apps_config()
    apps = []

    for app_data in apps_data:
        redirect_uri = app_data.get("redirect_uri")
        if not redirect_uri:
            raise KeyError(
                f"Missing or empty 'redirect_uri' in OAuth app config entry: {app_data}"
            )

        config = OAuthAppConfig(
            name=app_data.get("name", ""),
            redirect_uri=redirect_uri,
            confidential=app_data.get("confidential", False),
            scopes=app_data.get("scopes", ""),
            trusted=app_data.get("trusted", False),
        )
        apps.append(config)

    return apps


def _select_server_and_client() -> tuple[list[OAuthAppConfig], str]:
    """Pick the server and client apps, in that order, from the OAuth config.

    Returns:
        Tuple of (configs, error message); configs is empty on error
    """
    apps = _build_apps_config()
    selected = []
    for kind in APP_KINDS:
        config = next((a for a in apps if kind.lower() in a.name.lower()), None)
        if config is None:
            return [], f"{kind} Authorization app not found in OAuth config"
        selected.append(config)
    return selected, ""


def _build_apps_script(configs: list[OAuthAppConfig]) -> str:
    """Return the gitlab-rails runner script for the given apps."""
    payload = json.dumps([asdict(config) for config in configs])
    return APPS_SCRIPT_HEAD + escape_js_string(payload) + APPS_SCRIPT_TAIL


def _parse_apps(output: str) -> list[OAuthAppResult]:
    """Extract the apps printed by the apps script from gitlab-rails output."""
    results = []
    for line in output.splitlines():
        stripped = line.strip()
        if stripped.startswith(APP_MARKER):
            data = json.loads(stripped.removeprefix(APP_MARKER))
            results.append(
                OAuthAppResult(
                    application_id=data["id"],
                    name=data["name"],
                    client_id=data["uid"],
                    client_secret=data["secret"],
                )
            )
    return results


def _run_apps_script(
    configs: list[OAuthAppConfig],
) -> tuple[bool, list[OAuthAppResult], str]:
    """Run the apps script in the GitLab container and parse its output.

    The secrets travel on stdout only, never on the docker command line.
    """
    success, output = execute_docker_command(
        GITLAB_CONTAINER_NAME,
        ["gitlab-rails", "runner", _build_apps_script(configs)],
        DockerRunOptions(verbose=False),
    )
    if not success:
        return False, [], (
            f"Failed to create OAuth applications with gitlab-rails runner: {output}"
        )
    results = _parse_apps(output)
    if len(results) != len(configs):
        return False, [], "No OAuth applications in the gitlab-rails runner output"
    return True, results, ""


def create_oauth_applications() -> tuple[bool, list[OAuthAppResult], str]:
    """Create or update root's DTaaS Server and Client Authorization apps.

    Runs one ``gitlab-rails runner`` call (about a minute). A rerun keeps each
    app's client id and renews its secret.

    Returns:
        Tuple of (success, [server result, client result], error message)
    """
    configs, error = _select_server_and_client()
    if error:
        return False, [], error
    return _run_apps_script(configs)
