"""GitLab client resolution from the CLI's [gitlab] config section."""

import os

import click

from ...gitlab_common import get_gitlab_client, with_hint

PAT_ENV_VAR = "DTAAS_GITLAB_PAT"

NO_PAT_ERROR = with_hint(
    "No GitLab PAT configured for provisioning.",
    f"Export {PAT_ENV_VAR}, or set [gitlab].pat in dtaas.toml.",
)

SSL_WARNING = with_hint(
    "Warning: [gitlab].ssl_verify is disabled.",
    "GitLab API traffic, the admin PAT and provisioned users' passwords "
    "included, is not certificate-verified.",
)


def resolve_pat(config_obj):
    """Resolve the provisioning PAT: the DTAAS_GITLAB_PAT environment
    variable, else [gitlab].pat from dtaas.toml.

    The environment takes precedence so a rotated token, or a run aimed at
    another instance, needs no edit to a dtaas.toml the whole installation
    shares. [gitlab].pat is still read first, to surface a malformed
    [gitlab] section rather than mask it behind a working env var.

    Returns:
        Tuple of (pat, err)
    """
    pat, err = config_obj.get_gitlab_pat()
    if err is not None:
        return None, err
    pat = os.environ.get(PAT_ENV_VAR, "").strip() or pat
    if not pat:
        return None, Exception(NO_PAT_ERROR)
    return pat, None


def resolve_client(config_obj):
    """Build an authenticated gitlab.Gitlab client from the [gitlab] config.

    Returns:
        Tuple of (client, err)
    """
    values = []
    for getter in (
        config_obj.get_gitlab_api_url,
        lambda: resolve_pat(config_obj),
        config_obj.get_gitlab_ssl_verify,
    ):
        value, err = getter()
        if err is not None:
            return None, err
        values.append(value)
    api_url, pat, ssl_verify = values
    if ssl_verify is False:
        click.echo(SSL_WARNING, err=True)
    return get_gitlab_client(api_url, pat, ssl_verify=ssl_verify), None
