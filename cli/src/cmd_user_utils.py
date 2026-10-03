"""User-input resolution/validation shared by cmd_user.py's commands.

Split out of cmd_utils.py to keep both files within a reasonable line
count, mirroring the cmd_deploy_utils.py split. Where each user's GitLab
password comes from is cmd_user_passwords.py's concern; this module decides
which users a run acts on and what is staged into the registry.
"""

from dataclasses import dataclass, field
import click
from .pkg import config as configPkg
from .pkg import registry as registryPkg
from .pkg import registry_csv as registryCsvPkg
from .pkg.messages import with_hint
from .pkg.users_utils import validate_usernames
from .cmd_user_passwords import PasswordSources, require_passwords, resolve_passwords


def from_config(getter, fallback):
    """The value of the dtaas.toml getter named *getter*, else *fallback*.

    A missing or broken dtaas.toml is reported by the command's own run
    (through add_users), not from here, so the helpers below degrade to a
    neutral value rather than raising during input resolution. The getter is
    named rather than passed, so it is looked up on the Config instance.
    """
    try:
        config_obj = configPkg.Config()
    except RuntimeError:
        return fallback
    value, err = getattr(config_obj, getter)()
    if err is not None or value is None:
        return fallback
    return value


def _starting_usernames():
    """The [[users]] usernames from dtaas.toml, or [] when unavailable."""
    return from_config("get_starting_users", [])


def _starting_emails():
    """{username: email} for dtaas.toml's [[users]], or {} when unavailable.

    Keyed by the same usernames as _starting_usernames, so it answers both
    "is this a starting user" and "what is their email" from one read.
    """
    return from_config("get_user_emails", {})


def _read_users_csv(csv_file):
    """Parse a users CSV, mapping parse errors to ClickException."""
    try:
        return registryCsvPkg.read_csv_users(csv_file)
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


@dataclass(frozen=True)
class StagedUsers:
    """What a 'user add' run acts on, once the inputs are resolved.

    *added* are the users merged into the registry (the only ones whose
    containers are started), *starting* the dtaas.toml starting users named
    this run, whose workspaces dtaas.toml owns and whose GitLab half alone is
    provisioned, and *passwords* holds a password (or None) for every user
    named, both kinds included.
    """

    added: list
    starting: list = field(default_factory=list)
    passwords: dict = field(default_factory=dict)


def _users_from_args(user_input, starting_emails):
    """Build a one-user {name: details} mapping from CLI arguments.

    Defaults groups to ['additional'] when --group is omitted, matching the CSV
    import path (registry_csv._parse_csv_row) so the two produce identical users.

    A dtaas.toml starting user's email is already declared there, and that is
    the address GitLab provisioning uses, so --email is neither required nor
    read for them: naming one asks for their GitLab half alone.
    """
    email = starting_emails.get(user_input.username) or user_input.email
    if not email:
        raise click.ClickException("Provide --email when adding a single user.")
    return {
        user_input.username: {
            "email": email,
            "groups": list(user_input.groups) or ["additional"],
            "load_balance": user_input.load_balance,
            "desired_status": "running",
        }
    }


def _users_to_add(user_input, starting_emails):
    """Collect the users to add from --file or a single USERNAME argument."""
    if user_input.csv_file:
        return _read_users_csv(user_input.csv_file)
    if user_input.username:
        return _users_from_args(user_input, starting_emails)
    return {}


def _skip_notice(name, starting):
    """The line reporting one name 'user add' did not merge into the registry."""
    if name in starting:
        return with_hint(
            f"'{name}' is a dtaas.toml starting user.",
            "Its workspace is managed there, not by 'user add'.",
        )
    return f"'{name}' already exists, skipping"


def _register_users(named, starting):
    """Validate and register the new users, reporting the names left out.

    A name already in the registry is skipped, and a dtaas.toml starting user
    is never a registry user at all: either way the name is reported for what
    it is. Returns the usernames actually added.
    """
    try:
        validate_usernames(named)
    except ValueError as exc:
        raise click.ClickException(str(exc)) from exc
    added, skipped = registryPkg.register_new_users(named, starting)
    for name in skipped:
        click.echo(_skip_notice(name, starting))
    return added


def _password_sources(user_input, provision):
    """Where this run may take a password from.

    dtaas.toml is read only when provisioning is on, since nothing else uses
    [[users]].password.
    """
    configured = {}
    if provision:
        configured = from_config("get_user_passwords", {})
    return PasswordSources(user_input, configured)


def _reject_bad_input(user_input):
    """Refuse a 'user add' that names no users, or names them twice over."""
    if user_input.username and user_input.csv_file:
        raise click.ClickException("Pass either a USERNAME or --file, not both.")
    if not user_input.username and not user_input.csv_file:
        raise click.ClickException(
            with_hint(
                "Provide a USERNAME or --file <users.csv> to add users.",
                "For example: dtaas user add alice --email a@x.io",
            )
        )


def stage_users_for_add(user_input, provision=False):
    """Resolve a 'user add' run's users and merge the new ones into the registry.

    Rejects malformed usernames and skips (with a notice) any already
    registered. With *provision*, every named user must have a GitLab
    password or an account from an earlier run, and this is checked before
    anything is written, so a run that could do nothing on GitLab changes
    nothing at all. Raises ClickException on bad input (a USERNAME or --file
    is required, not both).

    Returns:
        A StagedUsers.
    """
    _reject_bad_input(user_input)
    starting_emails = _starting_emails()
    named = _users_to_add(user_input, starting_emails)
    starting = [name for name in named if name in starting_emails]
    sources = _password_sources(user_input, provision)
    passwords = resolve_passwords(sources, named, provision)
    if provision:
        require_passwords(named, passwords)
    added = _register_users(named, starting)
    if provision:
        registryPkg.register_starting_users(starting)
    return StagedUsers(added, starting, passwords)


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
            with_hint(
                f"Cannot {verb} starting user(s) {', '.join(hits)}.",
                "Manage the whole installation with 'dtaas platform "
                "pause'/'stop'/'resume' instead.",
            )
        )
