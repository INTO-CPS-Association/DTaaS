"""GitLab API client factory using python-gitlab."""

import os
import warnings

import gitlab
import urllib3


def get_ssl_verify() -> bool:
    """Get SSL_VERIFY setting from environment.

    Returns:
        True if SSL verification is enabled, False otherwise
    """
    raw = os.getenv("SSL_VERIFY", "true").strip().lower()
    return raw not in ("false", "0", "no", "off")


def build_base_url() -> str:
    """Build the GitLab instance URL for direct container access.

    GitLab's nginx serves HTTPS on port 443 inside the container,
    mapped to GITLAB_PORT on the host.  The ``external_url`` includes
    ``/gitlab`` as a path prefix.

    Returns:
        Base URL string, e.g. "https://foo.com:8090/gitlab"

    Raises:
        RuntimeError: If GITLAB_PORT or HOSTNAME is not set
    """
    gitlab_port = os.getenv("GITLAB_PORT")
    server = os.getenv("HOSTNAME")
    if not gitlab_port:
        raise RuntimeError("GITLAB_PORT is not set in config/services.env. ")
    if not server:
        raise RuntimeError("HOSTNAME is not set in config/services.env. ")
    return f"https://{server}:{gitlab_port}/gitlab"


def get_gitlab_client(private_token: str) -> gitlab.Gitlab:
    """Create an authenticated python-gitlab client.

    When SSL verification is disabled (SSL_VERIFY=false), urllib3 warnings
    are suppressed since the user has explicitly opted out of verification.

    Args:
        private_token: GitLab Personal Access Token

    Returns:
        Configured gitlab.Gitlab instance
    """
    url = build_base_url()
    verify = get_ssl_verify()
    if not verify:
        warnings.filterwarnings(
            "ignore",
            category=urllib3.exceptions.InsecureRequestWarning,
        )
    return gitlab.Gitlab(url, private_token=private_token, ssl_verify=verify)
