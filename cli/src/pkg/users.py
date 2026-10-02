"""The 'user add' CLI command handler.

Loads registry/deploy config, then drives the compose/container plumbing in
users_compose.py to provision the requested users. 'user delete' is
users_delete.py's.
"""

from dataclasses import dataclass, field
from . import utils
from .constants import COMPOSE_USERS_YML
from .registry import load_registry
from .users_compose import (
    add_users_to_compose,
    create_user_files,
    finalize_compose,
    load_user_template,
    setup_compose_structure,
)
from .users_gitlab import gitlab_failure_exc, provision_gitlab_users
from .users_gitlab_targets import gitlab_candidates
from .users_utils import (
    add_conf_server_entry,
    validate_usernames,
)


def _get_registry_users():
    """Return (all registry usernames, the additional-user store) to provision."""
    users_section = load_registry()
    return list(users_section), users_section


def _get_deploy_config(config_obj):
    """Retrieve deployment settings (server, path, resources, TLS) from dtaas.toml."""
    server, err = config_obj.get_server_dns()
    utils.check_error(err)
    path, err = config_obj.get_path()
    utils.check_error(err)
    resources, err = config_obj.get_resource_limits()
    utils.check_error(err)
    tls, err = config_obj.get_tls()
    utils.check_error(err)
    set_limits, err = config_obj.get_set_limits()
    utils.check_error(err)
    return server, path, resources, tls, set_limits


def check_add_supported(config_obj):
    """The error 'user add' would fail with, before anything is staged.

    'user add' needs a deployment whose per-user compose template is present
    and whose server is not localhost. Both were discovered only once the
    users had been merged into the registry, which left them registered but
    never provisioned, and the next run then skipped them as already there.
    Returns None when the deployment can take new users.
    """
    server, err = config_obj.get_server_dns()
    if err is None:
        tls, err = config_obj.get_tls()
    if err is None:
        _template, err = load_user_template(server, tls)
    return err


@dataclass
class _AddContext:
    """Everything needed to provision the registry's users.

    *starting* maps each dtaas.toml starting user to its email. Their
    containers come from docker-compose.yml, so they are never in
    *user_list*; they are here only so a run that names one can provision
    its GitLab half.
    """

    compose: dict
    user_list: list
    users_section: dict
    config: dict
    starting: dict = field(default_factory=dict)


def _load_add_context(config_obj):
    """Load compose, registry users, and deploy config for provisioning.

    Returns an _AddContext, or None when the registry is empty (nothing to
    provision). Raises on any other error.
    """
    compose, err = utils.import_yaml(COMPOSE_USERS_YML)
    utils.check_error(err)
    compose = compose or {}
    user_list, users_section = _get_registry_users()
    starting, err = config_obj.get_user_emails()
    utils.check_error(err)
    if not user_list and not starting:
        return None
    validate_usernames(user_list)
    server, path, resources, tls, set_limits = _get_deploy_config(config_obj)
    config = {
        "server": server,
        "path": path,
        "resources": resources,
        "tls": tls,
        "set_limits": set_limits,
    }
    return _AddContext(compose, user_list, users_section, config, starting or {})


def _authorise_user(username, users_section):
    """Validate username/email are newline-free, then add the forward-auth rule.

    Raises ValueError if either contains a newline (which would corrupt
    conf.server).
    """
    section = (users_section or {}).get(username, {})
    email = str(section.get("email", "") if isinstance(section, dict) else "").strip()
    if any(c in username for c in ("\n", "\r")) or any(
        c in email for c in ("\n", "\r")
    ):
        raise ValueError(
            f"Invalid user config for '{username}': "
            "username/email must not contain newlines"
        )
    add_conf_server_entry(username, email)


def _skip_start_users(users_section):
    """Registry usernames whose desired_status is not 'running' (paused/stopped)."""
    return {
        name
        for name, details in (users_section or {}).items()
        if isinstance(details, dict)
        and details.get("desired_status", "running") != "running"
    }


def _resolve_start_only(start_only, skip_start):
    """Which users to actually start: start_only minus skip_start, or None.

    None means "start every provisioned user" (used by config reconcile
    --fix). A list restricts starting to the newly-added users (used by
    'user add'), never restarting the rest of the registry.
    """
    if start_only is None:
        return None
    return [name for name in start_only if name not in skip_start]


def _provision_users(ctx, start_only=None):
    """Create workspace files, compose entries, and forward-auth rules.

    conf.server is written before starting containers, so a later 'compose
    up' failure can't leave forward-auth rules stale. Every registry user is
    written to compose, but only *start_only* users are started (None = all);
    a paused/stopped user is never started see _skip_start_users.
    """
    create_user_files(ctx.user_list, ctx.config["path"] + "/files")
    err = add_users_to_compose(ctx.user_list, ctx.compose, ctx.config)
    utils.check_error(err)
    for username in ctx.user_list:
        _authorise_user(username, ctx.users_section)
    skip_start = _skip_start_users(ctx.users_section)
    finalize_compose(
        ctx.compose, skip_start, _resolve_start_only(start_only, skip_start)
    )


def _add_users(config_obj, start_only, passwords):
    """Provision the registry's users; return an Exception to surface, or None.

    Raises propagate to add_users, which catches and returns them.
    """
    ctx = _load_add_context(config_obj)
    if ctx is None:
        return None  # no registry users and no starting users: nothing to do
    if ctx.user_list:
        # Skipped when the registry is empty: a run that names a starting
        # user alone has no container work, and must not write an empty
        # compose.users.yml or state file for it.
        setup_compose_structure(ctx.compose)
        _provision_users(ctx, start_only)
    if passwords is None:
        return None  # no GitLab work was asked for (config reconcile --fix)
    candidates = gitlab_candidates(ctx, start_only, passwords)
    return gitlab_failure_exc(provision_gitlab_users(config_obj, candidates))


def add_users(config_obj, start_only=None, passwords=None):
    """add cli command handler.

    *start_only* restricts which users' containers are started (None = all;
    a list = just those); the registry is always fully written to compose.
    *passwords* ({username: password or None}) drives GitLab provisioning
    when enabled, targeting every key (every user named this run) regardless
    of start_only; omit it (None, not an empty map) to skip GitLab entirely,
    as 'config reconcile --fix' does. A user mapped to None still gets the
    GitLab step, because only the account half needs a password: it is how
    the projects of an account that already exists are retried. A GitLab
    failure is returned as an error (non-zero exit) without undoing
    container work.
    """
    try:
        return _add_users(config_obj, start_only, passwords)
    except Exception as e:
        return e
