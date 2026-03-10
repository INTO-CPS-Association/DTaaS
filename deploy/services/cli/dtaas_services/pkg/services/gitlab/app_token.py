"""Create, list, and delete GitLab OAuth Application tokens."""

import json
import logging
import os
from dataclasses import dataclass
from typing import Any

from ._api import gitlab_request

logger = logging.getLogger(__name__)


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
    """Read SERVER_DNS from environment.

    Returns:
        Server DNS value

    Raises:
        RuntimeError: If SERVER_DNS is not configured
    """
    server_dns = os.getenv("SERVER_DNS")
    if not server_dns:
        raise RuntimeError("SERVER_DNS is not set in config/services.env.")
    return server_dns


def _build_server_app_config(server_dns: str) -> OAuthAppConfig:
    """Build the OAuth config for the DTaaS Server Authorization app.

    Args:
        server_dns: Server hostname (e.g. ``foo.com``)

    Returns:
        OAuthAppConfig for the server authorization app
    """
    return OAuthAppConfig(
        name="DTaaS Server Authorization",
        redirect_uri=f"https://{server_dns}/_oauth",
        confidential=True,
        scopes="read_user",
    )


def _build_client_app_config(server_dns: str) -> OAuthAppConfig:
    """Build the OAuth config for the DTaaS Client Authorization app.

    Args:
        server_dns: Server hostname (e.g. ``foo.com``)

    Returns:
        OAuthAppConfig for the client authorization app
    """
    return OAuthAppConfig(
        name="DTaaS Client Authorization",
        redirect_uri=f"https://{server_dns}/Library",
        confidential=False,
        scopes="api openid profile read_repository read_user",
    )


def _build_payload(config: OAuthAppConfig) -> dict[str, str]:
    """Build the POST payload for creating an application.

    Args:
        config: OAuth application configuration

    Returns:
        Dict suitable for ``data=`` in an HTTP request
    """
    return {
        "name": config.name,
        "redirect_uri": config.redirect_uri,
        "confidential": "true" if config.confidential else "false",
        "scopes": config.scopes,
    }


def _parse_app_response(response_data: dict[str, Any]) -> OAuthAppResult:
    """Parse the GitLab API response into an OAuthAppResult.

    Args:
        response_data: Parsed JSON from the API response

    Returns:
        OAuthAppResult with the created application's details
    """
    return OAuthAppResult(
        application_id=response_data["id"],
        name=response_data.get("application_name", ""),
        client_id=response_data["application_id"],
        client_secret=response_data.get("secret", ""),
    )


def _validate_and_parse_app_response(
    response, config: OAuthAppConfig
) -> tuple[bool, OAuthAppResult | None, str]:
    """Validate response and parse OAuth app result.

    Args:
        response: HTTP response object
        config: Application configuration (for error messages)

    Returns:
        Tuple of (success, OAuthAppResult or None, error message)
    """
    if response.status_code not in (200, 201):
        return (
            False,
            None,
            (
                f"Failed to create '{config.name}': "
                f"HTTP {response.status_code}:{response.text}"
            ),
        )

    try:
        result = _parse_app_response(response.json())
        return True, result, ""
    except (KeyError, json.JSONDecodeError) as exc:
        return False, None, f"Failed to parse response for '{config.name}': {exc}"


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
    payload = _build_payload(config)
    http_params = {"method": "POST", "endpoint": "/applications"}
    success, response, error_msg = gitlab_request(
        http_params, private_token, data=payload
    )

    if not success:
        return False, None, f"Failed to create '{config.name}': {error_msg}"

    return _validate_and_parse_app_response(response, config)


def create_server_application(
    private_token: str,
) -> tuple[bool, OAuthAppResult | None, str]:
    """Create the DTaaS Server Authorization OAuth application.

    Args:
        private_token: GitLab PAT

    Returns:
        Tuple of (success, OAuthAppResult or None, error message)
    """
    server_dns = _get_server_dns()
    config = _build_server_app_config(server_dns)
    logger.info("Creating '%s'...", config.name)
    return create_application(private_token, config)


def create_client_application(
    private_token: str,
) -> tuple[bool, OAuthAppResult | None, str]:
    """Create the DTaaS Client Authorization OAuth application.

    Args:
        private_token: GitLab PAT

    Returns:
        Tuple of (success, OAuthAppResult or None, error message)
    """
    server_dns = _get_server_dns()
    config = _build_client_app_config(server_dns)
    logger.info("Creating '%s'...", config.name)
    return create_application(private_token, config)


def _validate_and_parse_app_list(
    response,
) -> tuple[bool, list[dict[str, Any]], str]:
    """Validate response and parse application list.

    Args:
        response: HTTP response object

    Returns:
        Tuple of (success, list of applications, error message)
    """
    if response.status_code != 200:
        return (
            False,
            [],
            (
                f"Failed to list applications: "
                f"HTTP {response.status_code}:{response.text}"
            ),
        )

    try:
        return True, response.json(), ""
    except json.JSONDecodeError as exc:
        return False, [], f"Failed to parse application list: {exc}"


def list_all_applications(
    private_token: str,
) -> tuple[bool, list[dict[str, Any]], str]:
    """List all registered OAuth applications.

    Args:
        private_token: GitLab PAT

    Returns:
        Tuple of (success, list of application dicts, error message)
    """
    http_params = {"method": "GET", "endpoint": "/applications"}
    success, response, error_msg = gitlab_request(http_params, private_token)

    if not success:
        return False, [], f"Failed to list applications: {error_msg}"

    return _validate_and_parse_app_list(response)


def delete_application(private_token: str, application_id: int) -> tuple[bool, str]:
    """Delete an OAuth application by its ID.

    Args:
        private_token: GitLab PAT
        application_id: ID of the application to delete

    Returns:
        Tuple of (success, message)
    """
    http_params = {"method": "DELETE", "endpoint": f"/applications/{application_id}"}
    success, response, error_msg = gitlab_request(http_params, private_token)

    if not success or response is None:
        return False, f"Failed to delete application {application_id}: {error_msg}"

    if response.status_code == 204:
        return True, "Application successfully deleted."

    return False, (
        f"Failed to delete application {application_id}: "
        f"HTTP {response.status_code}:{response.text}"
    )
