"""Low-level GitLab REST API client."""

import os
from typing import Any
import httpx


def get_ssl_verify() -> bool:
    """Get SSL_VERIFY setting from environment.

    Returns:
        True if SSL verification is enabled, False otherwise
    """
    raw = os.getenv("SSL_VERIFY", "true").strip().lower()
    return raw not in ("false", "0", "no", "off")


def build_base_url() -> str:
    """Build the GitLab API base URL for direct container access.

    GitLab's nginx serves HTTP on port 80 inside the container,
    mapped to GITLAB_PORT on the host.  The ``external_url`` includes
    ``/gitlab`` as a path prefix, so the API lives at
    ``<scheme>://localhost:GITLAB_PORT/gitlab/api/v4``.

    Returns:
        Base URL string, e.g. "http://localhost:8090/gitlab/api/v4"

    Raises:
        RuntimeError: If GITLAB_PORT or HOSTNAME is not set
    """
    gitlab_port = os.getenv("GITLAB_PORT")
    server = os.getenv("HOSTNAME")
    scheme = os.getenv("GITLAB_SCHEME", "http").strip().lower()
    if not gitlab_port:
        raise RuntimeError("GITLAB_PORT is not set in config/services.env. ")
    if not server:
        raise RuntimeError("HOSTNAME is not set in config/services.env. ")
    return f"{scheme}://{server}:{gitlab_port}/gitlab/api/v4"


def _build_headers(private_token: str) -> dict[str, str]:
    """Build request headers with authentication.

    Args:
        private_token: GitLab Personal Access Token

    Returns:
        Headers dict with PRIVATE-TOKEN set
    """
    return {"PRIVATE-TOKEN": private_token}


def gitlab_request(
    http_params: dict[str, Any],
    private_token: str,
    **kwargs: Any,
) -> tuple[bool, httpx.Response | None, str]:
    """Make an authenticated request to the GitLab API.

    Args:
        method: HTTP method (GET, POST, DELETE, etc.)
        endpoint: API endpoint path, e.g. "/applications"
        private_token: GitLab Personal Access Token
        **kwargs: Additional keyword arguments passed to httpx.request
                  (e.g. data, json, params, timeout)

    Returns:
        Tuple of (success, response object or None, error message)
    """
    method: str = http_params.get("method") or ""
    endpoint = http_params.get("endpoint")
    base_url = build_base_url()
    url = f"{base_url}{endpoint}"
    headers = _build_headers(private_token)
    verify = get_ssl_verify()

    kwargs.setdefault("timeout", 30)

    try:
        response = httpx.request(
            method,
            url,
            headers=headers,
            verify=verify,
            **kwargs,
        )
        return True, response, ""
    except (httpx.ConnectError, httpx.TimeoutException, httpx.HTTPError) as exc:
        return False, None, f"HTTP request failed: {exc}"
