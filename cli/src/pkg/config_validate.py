"""Validate the values in a dtaas.toml configuration file.

Used by 'dtaas config validate'. Each check returns a list of human
readable problems (empty when acceptable); validate_config aggregates them so
the user sees every issue at once rather than one at a time. See
validators.py for the generic, DTaaS-agnostic predicates each check builds on.
"""

from . import utils
from .validators import (
    get_nested,
    is_email,
    is_existing_dir,
    is_host,
    is_int,
    is_number,
    is_size,
    is_string_list,
    is_url,
    is_username,
    optional,
    required,
)

_SIZE_FIELDS = (("mem_limit", "4G"), ("shm_size", "512m"))


def _check_git_repo(data):
    """git-repo must be a URL."""
    return required(data, ("git-repo",), (is_url, "git-repo must be a valid URL"))


def _check_server_dns(data):
    """common.server-dns must be a hostname or IP."""
    message = "common.server-dns must be a valid hostname or IP address"
    return required(data, ("common", "server-dns"), (is_host, message))


def _check_path(data):
    """common.path must be an absolute path to an existing directory."""
    message = "common.path must be an absolute path to an existing directory"
    return required(data, ("common", "path"), (is_existing_dir, message))


def _check_certs_src(data):
    """common.security.certs-src, when present, must be an existing directory."""
    keys = ("common", "security", "certs-src")
    message = (
        "common.security.certs-src must be an absolute path to an existing directory"
    )
    return optional(data, keys, (is_existing_dir, message))


def _check_resources(data):
    """Resource limits, required unless common.resources.set_limits is false.

    With set_limits = false the container runs uncapped, so the fields are
    optional; any values that are present are still checked.
    """
    enabled = get_nested(data, "common", "resources", "set_limits") is not False
    check = required if enabled else optional
    cpus_msg = "common.resources.cpus must be a positive number of CPU cores"
    errors = check(data, ("common", "resources", "cpus"), (is_number, cpus_msg))
    pids_msg = "common.resources.pids_limit must be an integer"
    errors += check(data, ("common", "resources", "pids_limit"), (is_int, pids_msg))
    for field, example in _SIZE_FIELDS:
        message = f"common.resources.{field} must include a unit, e.g. '{example}'"
        errors += check(data, ("common", "resources", field), (is_size, message))
    return errors


def _duplicate_username_errors(users):
    """Every username across [[users]] must be unique."""
    names = [
        str(u.get("username"))
        for u in users
        if isinstance(u, dict) and is_username(u.get("username"))
    ]
    dupes = sorted({n for n in names if names.count(n) > 1})
    return [f"users: duplicate username '{n}'" for n in dupes]


# Optional [[users]] fields checked when present: (key, predicate, label).
_OPTIONAL_USER_FIELDS = (
    ("groups", is_string_list, "must be a list of strings"),
    ("load_balance", lambda v: isinstance(v, bool), "must be true or false"),
    ("password", lambda v: isinstance(v, str), "must be a string"),
)


def _optional_user_field_errors(info, name):
    """Check the optional [[users]] fields (groups/load_balance/password)."""
    errors = []
    for field, predicate, label in _OPTIONAL_USER_FIELDS:
        value = info.get(field)
        if value is not None and not predicate(value):
            errors.append(f"users.{name}.{field} {label}")
    return errors


def _user_record_errors(info):
    """Validate one [[users]] record: required username/email, optional tags."""
    if not isinstance(info, dict):
        return ["users: each entry must be a table"]
    name = info.get("username")
    errors = []
    if not is_username(name):
        errors.append("users: each entry requires a valid 'username'")
        name = "?"
    if not is_email(info.get("email", "")):
        errors.append(f"users.{name}.email is not a valid email address")
    errors += _optional_user_field_errors(info, name)
    return errors


def _check_users(data):
    """[[users]], when present, must be a list of valid, uniquely-named records."""
    users = get_nested(data, "users")
    if users is None:
        return []
    if not isinstance(users, list):
        return ["users must be an array of tables ([[users]])"]
    errors = _duplicate_username_errors(users)
    for info in users:
        errors += _user_record_errors(info)
    return errors


# Deployment-section fields checked when present: (section, key, predicate, label).
_DEPLOY_FIELDS = (
    ("frontend", "react-app-oauth-url", is_url, "URL"),
    ("localhost", "auth-authority", is_url, "URL"),
    ("localhost", "default-user", is_username, "username"),
    ("insecure-server", "oauth-url", is_url, "URL"),
    ("secure-server", "oauth-url", is_url, "URL"),
    ("secure-server-gitlab", "oauth-url", is_url, "URL"),
    ("workspace-localhost", "auth-authority", is_url, "URL"),
    ("workspace-localhost", "default-user", is_username, "username"),
    ("workspace-secure-server", "keycloak-issuer-url", is_url, "URL"),
    ("workspace-secure-server", "auth-authority", is_url, "URL"),
)

# Top-level sections that are specific to one deployment type. The shared
# '[frontend]' section is not listed, so it is always checked.
DEPLOYMENT_SECTIONS = frozenset(
    {
        "localhost",
        "insecure-server",
        "secure-server",
        "secure-server-gitlab",
        "workspace-localhost",
        "workspace-secure-server",
    }
)


def _field_applies(section, deploy_type):
    """True if a deployment-section field should be checked for *deploy_type*.

    With deploy_type None (standalone 'config validate') every present section
    is checked. Scoped to a deploy_type ('update --config'), only that type's
    section (plus shared sections like [frontend]) is checked, so an unrelated
    leftover section does not fail the update.
    """
    if deploy_type is None or section not in DEPLOYMENT_SECTIONS:
        return True
    return section == deploy_type


def _check_deploy_fields(data, deploy_type=None):
    """Validate URL/username fields across deployment sections when present."""
    errors = []
    for section, key, predicate, label in _DEPLOY_FIELDS:
        if not _field_applies(section, deploy_type):
            continue
        message = f"{section}.{key} must be a valid {label}"
        errors += optional(data, (section, key), (predicate, message))
    return errors


# Checks that do not depend on the deployment type.
_CHECKS = (
    _check_git_repo,
    _check_server_dns,
    _check_path,
    _check_certs_src,
    _check_resources,
    _check_users,
)


def collect_errors(data, deploy_type=None):
    """Run every check against *data* and return the combined list of problems.

    When *deploy_type* is given, only that type's deployment section (plus
    shared sections) is validated; with None every present section is checked.
    """
    errors = []
    for check in _CHECKS:
        errors += check(data)
    errors += _check_deploy_fields(data, deploy_type)
    return errors


def validate_config(output_dir):
    """Validate dtaas.toml in *output_dir*, returning a list of problems.

    The list is empty when the configuration is valid. Raises FileNotFoundError
    when no dtaas.toml is found and ValueError when the file cannot be parsed.
    """
    toml_path = utils.find_toml(output_dir)
    if toml_path is None:
        raise FileNotFoundError(
            f"dtaas.toml not found in '{output_dir}' or the current directory"
        )
    data, err = utils.import_toml(str(toml_path))
    if err is not None:
        raise ValueError(str(err))
    return collect_errors(data)
