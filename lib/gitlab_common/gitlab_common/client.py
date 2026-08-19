"""Authenticated python-gitlab client factory."""

import gitlab


def get_gitlab_client(
    url: str, private_token: str, *, ssl_verify: bool | str = True
) -> gitlab.Gitlab:
    """Create an authenticated python-gitlab client.

    This function deliberately touches no process-global state. When
    verification is disabled, urllib3 emits ``InsecureRequestWarning`` as
    normal; suppressing it is the calling application's decision, not this
    module's (see ``pkg.services.gitlab._api.get_gitlab_client``).

    Args:
        url: Base URL of the GitLab instance, including any path prefix
            (e.g. "https://intocps.org:8090/gitlab").
        private_token: GitLab Personal Access Token.
        ssl_verify: ``True``/``False`` to enable/disable TLS verification, or
            the path to a CA bundle to verify against a deployment's own CA --
            preferable to disabling verification outright.

    Returns:
        Configured gitlab.Gitlab instance.
    """
    return gitlab.Gitlab(url, private_token=private_token, ssl_verify=ssl_verify)
