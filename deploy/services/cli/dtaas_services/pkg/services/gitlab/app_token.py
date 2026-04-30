"""Create, list, and delete GitLab OAuth Application tokens."""

import json
import logging
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import gitlab
import gitlab.exceptions
import requests.exceptions

from ._api import get_gitlab_client

logger = logging.getLogger(__name__)


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


def _get_server_dns() -> str:
    """Read HOSTNAME from environment.

    Returns:
        Server DNS value

    Raises:
        RuntimeError: If HOSTNAME is not configured
    """
    server_dns = os.getenv("HOSTNAME")
    if not server_dns:
        raise RuntimeError("HOSTNAME is not set in config/services.env.")
    return server_dns


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

    Reads the config and expands the ``${HOSTNAME}`` placeholder in each
    ``redirect_uri`` using the value of the ``HOSTNAME`` environment variable.

    Returns:
        List of OAuthAppConfig objects

    Raises:
        RuntimeError: If HOSTNAME is not set
        FileNotFoundError: If config file not found
        json.JSONDecodeError: If config is invalid JSON
        KeyError: If required fields missing in config
    """
    server_dns = _get_server_dns()
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
            redirect_uri=redirect_uri.replace("${HOSTNAME}", server_dns),
            confidential=app_data.get("confidential", False),
            scopes=app_data.get("scopes", ""),
            trusted=app_data.get("trusted", False),
        )
        apps.append(config)

    return apps


def _build_server_and_client_app_configs(
) -> tuple[OAuthAppConfig, OAuthAppConfig]:
    """Build OAuth configs for both Server and Client Authorization apps.

    Reads gitlab_oauth.json once and returns both configs.

    Returns:
        Tuple of (server_config, client_config)

    Raises:
        ValueError: If either app is not found in the config
    """
    apps = _build_apps_config()
    server_config = next((a for a in apps if "server" in a.name.lower()), None)
    client_config = next((a for a in apps if "client" in a.name.lower()), None)

    if server_config is None:
        raise ValueError("Server Authorization app not found in OAuth config")
    if client_config is None:
        raise ValueError("Client Authorization app not found in OAuth config")

    return server_config, client_config


def _to_result(app) -> OAuthAppResult:
    """Convert a python-gitlab Application object to OAuthAppResult."""
    return OAuthAppResult(
        application_id=app.id,
        name=getattr(app, "application_name", ""),
        client_id=app.application_id,
        client_secret=getattr(app, "secret", ""),
    )


def create_application(
    private_token: str, config: OAuthAppConfig
) -> tuple[bool, OAuthAppResult | None, str]:
    """Create an OAuth application on the GitLab instance.

    Args:
        private_token: GitLab Personal Access Token with ``api`` scope
        config: Application configuration

    Returns:
        Tuple of (success, OAuthAppResult or None, error message)
    """
    try:
        gl = get_gitlab_client(private_token)
        app = gl.applications.create(
            {
                "name": config.name,
                "redirect_uri": config.redirect_uri,
                "confidential": config.confidential,
                "scopes": config.scopes,
                "trusted": config.trusted,
            }
        )
        return True, _to_result(app), ""
    except gitlab.exceptions.GitlabError as exc:
        return False, None, f"Failed to create '{config.name}': {exc}"
    except requests.exceptions.RequestException as exc:
        return False, None, f"Network error creating '{config.name}': {exc}"


def create_server_application(
    private_token: str,
) -> tuple[bool, OAuthAppResult | None, str]:
    """Create the DTaaS Server Authorization OAuth application."""
    server_config, _ = _build_server_and_client_app_configs()
    logger.info("Creating '%s'...", server_config.name)
    return create_application(private_token, server_config)


def create_client_application(
    private_token: str,
) -> tuple[bool, OAuthAppResult | None, str]:
    """Create the DTaaS Client Authorization OAuth application."""
    _, client_config = _build_server_and_client_app_configs()
    logger.info("Creating '%s'...", client_config.name)
    return create_application(private_token, client_config)


def list_all_applications(
    private_token: str,
) -> tuple[bool, list[dict[str, Any]], str]:
    """List all registered OAuth applications.

    Returns:
        Tuple of (success, list of application dicts, error message)
    """
    try:
        gl = get_gitlab_client(private_token)
        apps = gl.applications.list()
        return True, [app.attributes for app in apps], ""
    except gitlab.exceptions.GitlabError as exc:
        return False, [], f"Failed to list applications: {exc}"
    except requests.exceptions.RequestException as exc:
        return False, [], f"Network error listing applications: {exc}"


def delete_application(private_token: str, application_id: int) -> tuple[bool, str]:
    """Delete an OAuth application by its ID.

    Returns:
        Tuple of (success, message)
    """
    try:
        gl = get_gitlab_client(private_token)
        gl.applications.delete(application_id)
        return True, "Application successfully deleted."
    except gitlab.exceptions.GitlabError as exc:
        return False, f"Failed to delete application {application_id}: {exc}"
    except requests.exceptions.RequestException as exc:
        return False, f"Network error deleting application {application_id}: {exc}"
