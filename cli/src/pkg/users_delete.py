"""The 'user delete' command handler.

Split out of users.py, which keeps the 'user add' side: deprovisioning is
its own concern, and holding both in one module took it past this package's
file size limit. The compose and container plumbing both halves drive is
users_compose.py's.

Deleting a user removes their workspace and the CLI's record of them. On
GitLab the account stays, and only the Personal Access Tokens this CLI
issued to it are revoked (see users_gitlab_records.release_gitlab_records).
A dtaas.toml starting user gets the same GitLab handling, but its workspace
is one of the installation's own (docker-compose.yml), so its container and
forward-auth rule are left alone.
"""

from dataclasses import dataclass
from . import utils
from .constants import COMPOSE_USERS_YML
from .registry import load_registry, load_starting_gitlab, remove_from_registry
from .state import write_state
from .users_compose import stop_user_containers
from .users_gitlab_records import release_gitlab_records, revoke_failure_exc
from .users_utils import (
    categorize_users,
    remove_conf_server_entry,
    remove_users_from_compose,
    report_delete_preview,
    report_missing_users,
    report_starting_users,
    validate_usernames,
)


@dataclass
class _DeletePlan:
    """What one 'user delete' run acts on: every name given, the ones with a
    container in compose.users.yml, and the dtaas.toml starting users."""

    compose: dict
    usernames: list
    existing: list
    starting: list


def _delete_context(usernames, starting):
    """Validate usernames and load compose, returning a _DeletePlan.

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
    named_starting = [name for name in usernames if name in starting]
    report_starting_users(named_starting)
    report_missing_users([name for name in missing if name not in named_starting])
    return _DeletePlan(compose, list(usernames), existing, named_starting)


def _gitlab_markers():
    """Every user's GitLab markers, additional and starting users alike."""
    return {**load_starting_gitlab(), **load_registry()}


def _remove_users(plan):
    """Stop containers, rewrite compose, clear auth rules, and update state.

    A starting user's forward-auth rule is the installation's own and
    stays. A token that could not be revoked fails the command, but only
    once the rest of the delete is done, as a GitLab failure never undoes
    'user add'.
    """
    if plan.existing:
        err = stop_user_containers(plan.existing)
        utils.check_error(err)
    remove_users_from_compose(plan.compose, plan.existing)
    err = utils.export_yaml(plan.compose, COMPOSE_USERS_YML)
    utils.check_error(err)
    for username in [n for n in plan.usernames if n not in plan.starting]:
        remove_conf_server_entry(username)
    # Before the registry entry goes: it is what records whether this user
    # has anything on GitLab to revoke and to stop tracking.
    not_revoked = release_gitlab_records(_gitlab_markers(), plan.usernames)
    remove_from_registry(plan.usernames)
    write_state(plan.compose.get("services", {}))
    utils.check_error(revoke_failure_exc(not_revoked))


def delete_users(usernames, dry_run=False, starting=()):
    """delete cli command handler: deprovision *usernames* and drop them from
    the CLI-owned user registry. With dry_run, report what would happen and make
    no changes. *starting* are dtaas.toml's starting users: only their GitLab
    tokens and markers are released."""
    try:
        plan = _delete_context(usernames, starting)
        if dry_run:
            report_delete_preview(plan.existing, usernames)
        else:
            _remove_users(plan)
    except Exception as e:
        return e
    return None
