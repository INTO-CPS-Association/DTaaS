"""Authenticated python-gitlab client factory."""

import warnings

import gitlab
import urllib3


def get_gitlab_client(
    url: str, private_token: str, *, ssl_verify: bool = True
) -> gitlab.Gitlab:
    """Create an authenticated python-gitlab client.

    Args:
        url: Base URL of the GitLab instance, including any path prefix
            (e.g. "https://intocps.org:8090/gitlab").
        private_token: GitLab Personal Access Token.
        ssl_verify: Whether to verify TLS certificates. When False, urllib3's
            InsecureRequestWarning is suppressed since the caller has explicitly
            opted out of verification.

    Returns:
        Configured gitlab.Gitlab instance.
    """
    if not ssl_verify:
        warnings.filterwarnings(
            "ignore",
            category=urllib3.exceptions.InsecureRequestWarning,
        )
    return gitlab.Gitlab(url, private_token=private_token, ssl_verify=ssl_verify)
