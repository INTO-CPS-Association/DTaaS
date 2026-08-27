"""User-input resolution/validation shared by cmd_user.py's commands.

Split out of cmd_utils.py to keep both files within a reasonable line
count, mirroring the cmd_deploy_utils.py split.
"""

from dataclasses import dataclass
import click
from .pkg import config as configPkg
from .pkg import registry as registryPkg
from .pkg.users_utils import validate_usernames


def _starting_usernames():
    """The [[users]] usernames from dtaas.toml, or [] when unavailable."""
    try:
        config_obj = configPkg.Config()
    except RuntimeError:
        return []
    usernames, err = config_obj.get_starting_users()
    if err is not None or usernames is None:
        return []
    return usernames


def _read_users_csv(csv_file):
    """Parse a users CSV, mapping parse errors to ClickException."""
    try:
        return registryPkg.read_csv_users(csv_file)
    except (OSError, KeyError, ValueError) as exc:
        raise click.ClickException(f"Error importing users file: {exc}") from exc


@dataclass
class UserAddInput:
    """CLI inputs for 'user add': a single USERNAME or a --file import, not both."""

    username: str | None
    csv_file: str | None
    email: str | None
    groups: tuple
    load_balance: bool
    password: str | None = None


def _users_from_args(user_input):
    """Build a one-user {name: details} mapping from CLI arguments.

    Defaults groups to ['additional'] when --group is omitted, matching the CSV
    import path (registry._parse_csv_row) so the two produce identical users.
    """
    if not user_input.email:
        raise click.ClickException("Provide --email when adding a single user.")
    return {
        user_input.username: {
            "email": user_input.email,
            "groups": list(user_input.groups) or ["additional"],
            "load_balance": user_input.load_balance,
            "desired_status": "running",
        }
    }


def _users_to_add(user_input):
    """Collect the users to add from --file or a single USERNAME argument."""
    if user_input.csv_file:
        return _read_users_csv(user_input.csv_file)
    if user_input.username:
        return _users_from_args(user_input)
    return {}


def _register_users(new_users):
    """Validate and register new users, warning about skipped duplicates.

    Returns the usernames actually added (excluding skipped duplicates).
    """
    try:
        validate_usernames(new_users)
    except ValueError as exc:
        raise click.ClickException(str(exc)) from exc
    added, skipped = registryPkg.register_new_users(new_users, _starting_usernames())
    for name in skipped:
        click.echo(f"'{name}' already exists, skipping")
    return added


def _passwords_to_add(user_input):
    """Collect GitLab-provisioning passwords to use, keyed by username.

    Kept independent of _users_to_add's registry-details dict: a password is
    transient, used only for GitLab account creation, and must never reach
    dtaas.users.registry.json.
    """
    if user_input.csv_file:
        return _read_csv_passwords(user_input.csv_file)
    if user_input.username and user_input.password:
        return {user_input.username: user_input.password}
    return {}


def _read_csv_passwords(csv_file):
    """Parse a users CSV's password column, mapping parse errors to ClickException."""
    try:
        return registryPkg.read_csv_passwords(csv_file)
    except (OSError, KeyError, ValueError) as exc:
        raise click.ClickException(f"Error importing users file: {exc}") from exc


def stage_users_for_add(user_input):
    """Merge CLI/CSV users into the registry before provisioning.

    Rejects malformed usernames and skips (with a warning) any already
    registered. Raises ClickException on bad input (a USERNAME or --file is
    required, not both). Returns (added, passwords): newly-added usernames,
    and every named user's password -- including an already-registered
    one, which retries just their GitLab step (see add_users).
    """
    if user_input.username and user_input.csv_file:
        raise click.ClickException("Pass either a USERNAME or --file, not both.")
    if not user_input.username and not user_input.csv_file:
        raise click.ClickException(
            "Provide a USERNAME (e.g. 'dtaas user add alice --email "
            "a@x.io') or --file <users.csv> to add users."
        )
    added = _register_users(_users_to_add(user_input))
    passwords = _passwords_to_add(user_input)
    return added, passwords


def resolve_usernames(
    usernames, csv_file, missing_hint="USERNAMES or --file <users.csv> to delete users"
):
    """Resolve the usernames to act on from positional USERNAMES or --file/-f.

    Only the username column of the CSV is used. Raises ClickException if both
    are given, or *missing_hint* (the target options plus verb, e.g. "USERNAMES,
    --file <users.csv>, or --all to pause users") if neither is. Shared by
    'user delete'/'pause'/'stop'/'resume'.
    """
    if usernames and csv_file:
        raise click.ClickException("Pass either USERNAMES or --file, not both.")
    if csv_file:
        return list(_read_users_csv(csv_file))
    if usernames:
        return list(usernames)
    raise click.ClickException(f"Provide one or more {missing_hint}.")


def reject_starting_users(usernames, verb):
    """Raise ClickException if any *usernames* is a dtaas.toml starting user.

    'user pause'/'stop'/'resume' only manage additional, registry-tracked
    users; starting users are suspended/resumed as part of the whole
    installation instead, via 'dtaas platform pause'/'stop'/'resume'.
    """
    hits = sorted(set(usernames) & set(_starting_usernames()))
    if hits:
        raise click.ClickException(
            f"Cannot {verb} starting user(s) {', '.join(hits)}: manage the whole "
            "installation with 'dtaas platform pause'/'stop'/'resume' instead."
        )
