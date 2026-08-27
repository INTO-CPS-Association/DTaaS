"""GitLab client resolution from the CLI's [gitlab] config section."""

import os

import click

from ...gitlab_common import get_gitlab_client

PAT_ENV_VAR = "DTAAS_GITLAB_PAT"


def resolve_pat(config_obj):
    """Resolve the provisioning PAT: [gitlab].pat, else the DTAAS_GITLAB_PAT
    environment variable.

    Returns:
        Tuple of (pat, err)
    """
    pat, err = config_obj.get_gitlab_pat()
    if err is not None:
        return None, err
    if pat:
        return pat, None
    env_pat = os.environ.get(PAT_ENV_VAR, "").strip()
    if env_pat:
        return env_pat, None
    return None, Exception(
        "GitLab provisioning is enabled but no PAT is configured. "
        f"Set [gitlab].pat in dtaas.toml or the {PAT_ENV_VAR} environment variable."
    )


def resolve_client(config_obj):
    """Build an authenticated gitlab.Gitlab client from the [gitlab] config.

    Returns:
        Tuple of (client, err)
    """
    api_url, err = config_obj.get_gitlab_api_url()
    if err is not None:
        return None, err
    pat, err = resolve_pat(config_obj)
    if err is not None:
        return None, err
    assert pat is not None  # resolve_pat guarantees this whenever err is None
    ssl_verify, err = config_obj.get_gitlab_ssl_verify()
    if err is not None:
        return None, err
    if ssl_verify is False:
        click.echo(
            "Warning: [gitlab].ssl_verify is disabled -- GitLab API traffic "
            "(including the admin PAT and provisioned users' passwords) is "
            "not certificate-verified.",
            err=True,
        )
    return get_gitlab_client(api_url, pat, ssl_verify=ssl_verify), None
