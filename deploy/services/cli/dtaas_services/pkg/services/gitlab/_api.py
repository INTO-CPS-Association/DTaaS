"""GitLab API client factory using python-gitlab."""

import os
import warnings

import gitlab
import urllib3

from ....gitlab_common import get_gitlab_client as _build_client


def get_ssl_verify() -> bool:
    """Get SSL_VERIFY setting from environment.

    Returns:
        True if SSL verification is enabled, False otherwise
    """
    raw = os.getenv("SSL_VERIFY", "true").strip().lower()
    return raw not in ("false", "0", "no", "off")


def _validate_gitlab_port(gitlab_port: str) -> None:
    """Validate GITLAB_PORT is a numeric string in the valid TCP port range.

    Raises:
        RuntimeError: If value is non-numeric or outside 1-65535.
    """
    if not gitlab_port.strip().isdigit():
        raise RuntimeError(f"GITLAB_PORT must be a numeric value, got: {gitlab_port!r}")
    port = int(gitlab_port)
    if not 1 <= port <= 65535:
        raise RuntimeError(f"GITLAB_PORT must be between 1 and 65535, got: {port}")


def _validate_hostname(server: str) -> None:
    """Validate HOSTNAME contains no whitespace characters.

    Raises:
        RuntimeError: If value contains whitespace.
    """
    if any(c.isspace() for c in server):
        raise RuntimeError(f"HOSTNAME must not contain whitespace, got: {server!r}")


def build_base_url() -> str:
    """Build the GitLab instance URL for direct container access.

    GitLab's nginx serves HTTPS on port 443 inside the container,
    mapped to GITLAB_PORT on the host.  The ``external_url`` includes
    ``/gitlab`` as a path prefix.

    Returns:
        Base URL string, e.g. "https://intocps.org:8090/gitlab"

    Raises:
        RuntimeError: If GITLAB_PORT or HOSTNAME is not set
    """
    gitlab_port = os.getenv("GITLAB_PORT")
    server = os.getenv("HOSTNAME")
    if not gitlab_port:
        raise RuntimeError("GITLAB_PORT is not set in config/services.env. ")
    if not server:
        raise RuntimeError("HOSTNAME is not set in config/services.env. ")
    _validate_gitlab_port(gitlab_port)
    _validate_hostname(server)
    return f"https://{server}:{gitlab_port}/gitlab"


def get_gitlab_client(private_token: str) -> gitlab.Gitlab:
    """Create an authenticated python-gitlab client for this deployment.

    Resolves the instance URL and SSL setting from the environment, then
    delegates client construction to gitlab_common.get_gitlab_client.

    When SSL verification is disabled (SSL_VERIFY=false), urllib3 warnings
    are suppressed since the user has explicitly opted out of verification.
    The suppression lives here, in the application entry point, rather than
    in gitlab_common, so importing the shared module never silences warnings
    for an unrelated consumer.

    Args:
        private_token: GitLab Personal Access Token

    Returns:
        Configured gitlab.Gitlab instance
    """
    verify = get_ssl_verify()
    if not verify:
        warnings.filterwarnings(
            "ignore",
            category=urllib3.exceptions.InsecureRequestWarning,
        )
    return _build_client(build_base_url(), private_token, ssl_verify=verify)
