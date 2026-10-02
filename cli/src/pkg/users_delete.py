"""The 'user delete' command handler.

Split out of users.py, which keeps the 'user add' side: deprovisioning is
its own concern, and holding both in one module took it past this package's
file size limit. The compose and container plumbing both halves drive is
users_compose.py's.

Deleting a user removes their workspace and the CLI's record of them. It
never touches GitLab: the account, its Personal Access Token and the
projects in its namespace are reported and left alone, since only a GitLab
admin can remove them (see users_gitlab_records.release_gitlab_records).
"""

from . import utils
from .constants import COMPOSE_USERS_YML
from .registry import load_registry, remove_from_registry
from .state import write_state
from .users_compose import stop_user_containers
from .users_gitlab_records import release_gitlab_records
from .users_utils import (
    categorize_users,
    remove_conf_server_entry,
    remove_users_from_compose,
    report_delete_preview,
    report_missing_users,
    validate_usernames,
)


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
    # Before the registry entry goes: it is what records whether this user
    # has anything on GitLab to report and to stop tracking.
    release_gitlab_records(load_registry(), usernames)
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
