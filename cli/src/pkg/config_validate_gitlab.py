"""Validate the [gitlab] section of a dtaas.toml configuration file.

Split out of config_validate.py, which is at its line limit, and called from
its check list. Like every check there, each function returns a list of
problems and an acceptable value returns an empty list, so 'dtaas config
validate' can report all of them at once.
"""

from ..gitlab_common import TemplateKeys
from ..gitlab_common import template_errors as _template_errors
from .validators import get_nested, is_url, optional, required

# The template keys as messages name them. Their rules are gitlab_common's,
# shared with dtaas-services.
_TEMPLATE_KEYS = TemplateKeys("gitlab.template_host", "gitlab.template_group")
TEMPLATES_TOGETHER = _TEMPLATE_KEYS.together


def template_errors(gitlab):
    """template_group, when present, must be a GitLab group path and
    template_host an http(s) URL, and the two are set together or not at
    all: leaving both out means accounts and tokens only. Shared with
    Config.get_gitlab_templates, since 'user add' does not run 'config
    validate'."""
    return _template_errors(
        gitlab.get("template_host"), gitlab.get("template_group"), _TEMPLATE_KEYS
    )


def _gitlab_provision_errors(gitlab):
    """Check gitlab.provision type and return the provision flag."""
    provision = gitlab.get("provision")
    if provision is not None and not isinstance(provision, bool):
        return ["gitlab.provision must be true or false"], provision
    return [], provision


def _gitlab_pat_errors(gitlab):
    """Check gitlab.pat is not set but empty."""
    pat = gitlab.get("pat")
    if pat is not None and not str(pat).strip():
        return ["gitlab.pat is set but empty: remove it or set a real token"]
    return []


def _gitlab_ssl_verify_errors(gitlab):
    """Check gitlab.ssl_verify is bool or string path."""
    ssl_verify = gitlab.get("ssl_verify")
    if ssl_verify is not None and not isinstance(ssl_verify, (bool, str)):
        return ["gitlab.ssl_verify must be true, false, or a CA bundle path"]
    return []


def check_gitlab(data):
    """[gitlab], when present, must have well-typed fields and a valid
    api_url, which is required when provision is true, so a malformed or
    missing URL is caught before 'user add' runs, not after containers
    already exist."""
    gitlab = get_nested(data, "gitlab")
    if gitlab is None:
        return []
    if not isinstance(gitlab, dict):
        return ["gitlab section is not a table"]

    prov_errors, provision = _gitlab_provision_errors(gitlab)
    errors = prov_errors
    api_url_check = required if provision is True else optional
    errors += api_url_check(
        data, ("gitlab", "api_url"), (is_url, "gitlab.api_url must be a valid URL")
    )
    errors += _gitlab_pat_errors(gitlab)
    errors += _gitlab_ssl_verify_errors(gitlab)
    errors += template_errors(gitlab)
    return errors
