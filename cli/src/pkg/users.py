"""The 'user add'/'user delete' CLI command handlers.

Loads registry/deploy config, then drives the compose/container plumbing in
users_compose.py to provision or deprovision the requested users.
"""

import json
from dataclasses import dataclass
from pathlib import Path
import click
from . import gitlab as gitlabPkg
from . import utils
from .constants import COMPOSE_USERS_YML, GITLAB_USER_TOKENS_FILE
from .registry import load_registry, remove_from_registry, set_gitlab_user_ids
from .state import write_state
from .users_compose import (
    add_users_to_compose,
    create_user_files,
    finalize_compose,
    setup_compose_structure,
    stop_user_containers,
)
from .users_utils import (
    add_conf_server_entry,
    remove_conf_server_entry,
    categorize_users,
    report_missing_users,
    remove_users_from_compose,
    report_delete_preview,
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


@dataclass
class _AddContext:
    """Everything needed to provision the registry's users."""

    compose: dict
    user_list: list
    users_section: dict
    config: dict


def _load_add_context(config_obj):
    """Load compose, registry users, and deploy config for provisioning.

    Returns an _AddContext, or None when the registry is empty (nothing to
    provision). Raises on any other error.
    """
    compose, err = utils.import_yaml(COMPOSE_USERS_YML)
    utils.check_error(err)
    compose = compose or {}
    user_list, users_section = _get_registry_users()
    if not user_list:
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
    return _AddContext(compose, user_list, users_section, config)


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


def _gitlab_target_usernames(ctx, start_only, passwords):
    """Registry users to attempt GitLab provisioning for this run.

    Mirrors _provision_users' start_only scoping, plus any already-registered
    user who supplied a password again this run even though their container
    isn't being (re)started the explicit retry path after a prior PAT-
    issuance failure, without touching anyone else.
    """
    if start_only is None:
        started = ctx.user_list
    else:
        started = [name for name in start_only if name in ctx.user_list]
    retries = [
        name for name in passwords if name in ctx.user_list and name not in started
    ]
    return started + retries


def _save_gitlab_tokens(tokens):
    """Persist newly issued GitLab PATs, merging with any already saved."""
    path = Path(GITLAB_USER_TOKENS_FILE)
    existing = json.loads(path.read_text(encoding="utf-8")) if path.is_file() else {}
    existing.update(tokens)
    utils.write_secret_file(path, json.dumps(existing, indent=2))


def _provision_gitlab_users(config_obj, ctx, start_only, passwords):
    """Create each targeted user's GitLab account and PAT, when enabled.

    Container provisioning is unaffected by a GitLab failure. Returns the
    usernames that could not be provisioned, so add_users can surface a
    command failure (a missing password is not counted). A candidate with a
    registry-stored gitlab_user_id retries PAT issuance directly against it
    rather than calling create_user again; any new id is persisted.
    """
    provision, err = config_obj.get_gitlab_provision()
    utils.check_error(err)
    if not provision:
        return []

    candidates = _gitlab_target_usernames(ctx, start_only, passwords)
    if not candidates:
        return []

    gl, err = gitlabPkg.resolve_client(config_obj)
    if err is not None:
        click.echo(f"GitLab provisioning skipped: {err}")
        return list(candidates)

    tokens = {}
    new_user_ids = {}
    failed = []
    for username in candidates:
        password = passwords.get(username)
        if not password:
            click.echo(
                f"GitLab provisioning skipped for '{username}': no password supplied."
            )
            continue
        details = ctx.users_section.get(username) or {}
        email = details.get("email", "")
        existing_user_id = details.get("gitlab_user_id")
        result = gitlabPkg.ensure_user_resources(
            gl, username, email, password, existing_user_id=existing_user_id
        )
        if result.user_id is not None and result.user_id != existing_user_id:
            new_user_ids[username] = result.user_id
        if not result.ok:
            click.echo(f"GitLab provisioning failed for '{username}': {result.message}")
            failed.append(username)
        elif result.already_exists:
            click.echo(f"Warning: GitLab provisioning for '{username}': {result.message}")
        elif result.token:
            tokens[username] = result.token

    if new_user_ids:
        set_gitlab_user_ids(new_user_ids)
    if tokens:
        _save_gitlab_tokens(tokens)
    return failed


def add_users(config_obj, start_only=None, passwords=None):
    """add cli command handler.

    *start_only* restricts which users' containers are started (None = all;
    a list = just those); the registry is always fully written to compose.
    *passwords* ({username: password}) drives GitLab provisioning when
    enabled, targeting every named user regardless of start_only; omit it to
    skip GitLab entirely (e.g. 'config reconcile --fix'). A GitLab failure is
    returned as an error (non-zero exit) without undoing container work.
    """
    try:
        ctx = _load_add_context(config_obj)
        if ctx is None:
            return None  # empty registry: nothing to provision
        setup_compose_structure(ctx.compose)
        _provision_users(ctx, start_only)
        if passwords:
            failed = _provision_gitlab_users(config_obj, ctx, start_only, passwords)
            if failed:
                return Exception(
                    "GitLab provisioning failed for: "
                    + ", ".join(failed)
                    + " (their containers were still provisioned)"
                )
    except Exception as e:
        return e
    return None


def _delete_context(usernames):
    """Validate usernames and load compose, returning (compose, existing users).

    Raises on validation/import failure or a missing compose file.
    """
    validate_usernames(usernames)
    compose, err = utils.import_yaml(COMPOSE_USERS_YML)
    utils.check_error(err)
    if compose is None:
        raise ValueError("Failed to load compose configuration")
    services = compose.get("services")
    existing_services = services if isinstance(services, dict) else {}
    existing, missing = categorize_users(list(usernames), existing_services)
    report_missing_users(missing)
    return compose, existing


def _remove_users(compose, existing, usernames):
    """Stop containers, rewrite compose, clear auth rules, and update state."""
    if existing:
        err = stop_user_containers(existing)
        utils.check_error(err)
    remove_users_from_compose(compose, existing)
    err = utils.export_yaml(compose, COMPOSE_USERS_YML)
    utils.check_error(err)
    for username in usernames:
        remove_conf_server_entry(username)
    remove_from_registry(usernames)
    write_state(compose.get("services", {}))


def delete_users(usernames, dry_run=False):
    """delete cli command handler: deprovision *usernames* and drop them from
    the CLI-owned user registry. With dry_run, report what would happen and make
    no changes."""
    try:
        compose, existing = _delete_context(usernames)
        if dry_run:
            report_delete_preview(existing, usernames)
        else:
            _remove_users(compose, existing, usernames)
    except Exception as e:
        return e
    return None
