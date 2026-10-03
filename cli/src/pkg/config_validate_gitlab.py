"""Validate the [gitlab] section of a dtaas.toml configuration file.

Split out of config_validate.py, which is at its line limit, and called from
its check list. Like every check there, each function returns a list of
problems and an acceptable value returns an empty list, so 'dtaas config
validate' can report all of them at once.
"""

from .config_gitlab import (
    GITLAB_TEMPLATE_KEYS,
    MINUTE_KEYS,
    gitlab_minutes,
    gitlab_template_values,
)
from .validators import get_nested, is_url, optional, required


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


def _gitlab_template_errors(data, gitlab):
    """Check the project template settings: a valid URL per template, and
    either both keys or neither of them.

    Leaving the templates out is a valid choice (project creation is then
    skipped), but setting only one of them is a mistake worth catching before
    'user add' runs. The completeness rule itself lives in
    config_gitlab.gitlab_template_values, which reads the keys at run time.
    """
    errors = []
    for key in GITLAB_TEMPLATE_KEYS:
        message = f"gitlab.{key} must be a valid URL"
        errors += optional(data, ("gitlab", key), (is_url, message))
    _, problem = gitlab_template_values(gitlab)
    if problem:
        errors.append(problem)
    return errors


def _gitlab_minutes_errors(gitlab):
    """Check the [gitlab] keys given in minutes: the per import wait and the
    whole run's budget for waiting on imports."""
    problems = (gitlab_minutes(gitlab, key)[1] for key in MINUTE_KEYS)
    return [problem for problem in problems if problem]


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
    errors += _gitlab_template_errors(data, gitlab)
    errors += _gitlab_minutes_errors(gitlab)
    return errors
