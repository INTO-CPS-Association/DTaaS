"""Create, list, and delete GitLab OAuth Application tokens."""

import logging
import os
from dataclasses import dataclass
from typing import Any

import gitlab
import gitlab.exceptions
import requests.exceptions

from ._api import get_gitlab_client

logger = logging.getLogger(__name__)

SERVER_OAUTH_SCOPES = "read_user"
CLIENT_OAUTH_SCOPES = "api openid profile read_repository read_user"


@dataclass
class OAuthAppConfig:
    """Configuration for an OAuth application to create."""

    name: str
    redirect_uri: str
    confidential: bool
    scopes: str


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


def _build_server_app_config(server_dns: str) -> OAuthAppConfig:
    """Build the OAuth config for the DTaaS Server Authorization app."""
    return OAuthAppConfig(
        name="DTaaS Server Authorization",
        redirect_uri=f"https://{server_dns}/_oauth",
        confidential=True,
        scopes=SERVER_OAUTH_SCOPES,
    )


def _build_client_app_config(server_dns: str) -> OAuthAppConfig:
    """Build the OAuth config for the DTaaS Client Authorization app."""
    return OAuthAppConfig(
        name="DTaaS Client Authorization",
        redirect_uri=f"https://{server_dns}/Library",
        confidential=False,
        scopes=CLIENT_OAUTH_SCOPES,
    )


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
    server_dns = _get_server_dns()
    config = _build_server_app_config(server_dns)
    logger.info("Creating '%s'...", config.name)
    return create_application(private_token, config)


def create_client_application(
    private_token: str,
) -> tuple[bool, OAuthAppResult | None, str]:
    """Create the DTaaS Client Authorization OAuth application."""
    server_dns = _get_server_dns()
    config = _build_client_app_config(server_dns)
    logger.info("Creating '%s'...", config.name)
    return create_application(private_token, config)


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
