"""Resolves the initial GitLab password 'user add' provisions each user with.

Split out of cmd_user_utils.py, which resolves which users a run acts on:
where a password comes from is its own concern, and one with a precedence
worth stating in one place. In order: --password or the users.csv password
column, then [[users]].password in dtaas.toml for a starting user, then a
hidden prompt for a single user add.

A password is used once, to create a GitLab account, and is never persisted:
it reaches the provisioning step through this map alone and never
dtaas.users.registry.json (see registry_csv.read_csv_passwords).
"""

from dataclasses import dataclass, field
import click
from .pkg import registry as registryPkg
from .pkg import registry_csv as registryCsvPkg

NO_PASSWORD_HINT = (
    "[gitlab].provision is enabled in dtaas.toml, so a new user needs an "
    "initial GitLab password: add a 'password' column to their users.csv row "
    "(and chmod 600 the file), pass --password for a single user, or set "
    "[[users]].password for a dtaas.toml starting user."
)


@dataclass(frozen=True)
class PasswordSources:
    """Everywhere a run's passwords may come from: the CLI inputs, and the
    [[users]].password values dtaas.toml holds for its starting users.

    The dtaas.toml map is read by the caller, which already holds the
    config, rather than here: this module then touches no config at all.
    """

    user_input: object
    configured: dict = field(default_factory=dict)


def _read_csv_passwords(csv_file):
    """Parse a users CSV's password column, mapping parse errors to ClickException."""
    try:
        return registryCsvPkg.read_csv_passwords(csv_file)
    except (OSError, KeyError, ValueError) as exc:
        raise click.ClickException(f"Error importing users file: {exc}") from exc


def _gitlab_state(username):
    """The GitLab markers recorded for *username*, from whichever store
    tracks them: the additional user registry, or the starting user section
    for a dtaas.toml user an earlier run already provisioned."""
    additional = registryPkg.load_registry().get(username)
    if additional is not None:
        return additional
    return registryPkg.load_starting_gitlab().get(username) or {}


def has_account(username):
    """True when an earlier run already created this user's GitLab account.

    Their projects can then be retried with no password at all, which is the
    documented recovery after a project failure, and no second token is
    minted for them.
    """
    state = _gitlab_state(username)
    return bool(state.get("gitlab_pat_issued") or state.get("gitlab_user_id"))


def _explicit_passwords(sources):
    """The passwords given on the command line or in the CSV password column."""
    user_input = sources.user_input
    if user_input.csv_file:
        return _read_csv_passwords(user_input.csv_file)
    if user_input.password:
        return {user_input.username: user_input.password}
    return {}


def _configured_passwords(sources, named, passwords):
    """[[users]].password from dtaas.toml for the starting users named here.

    The fallback behind an explicit password, and only for names that have
    none: a starting user's credentials live in dtaas.toml, so naming one in
    'user add' need not repeat them. A missing or empty key adds nothing.
    """
    return {
        name: sources.configured[name]
        for name in named
        if not passwords.get(name) and sources.configured.get(name)
    }


def _prompt_password(username):
    """Ask for *username*'s initial GitLab password with hidden input.

    Asked for rather than taken from --password, which is visible in shell
    history and in the process list; confirmed twice, since a typo would
    reach GitLab as the account's real password.
    """
    return click.prompt(
        f"GitLab password for '{username}'",
        hide_input=True,
        confirmation_prompt=True,
    )


def resolve_passwords(sources, named, provision):
    """A password (or None) for every user named this run.

    Keyed by every name, so a user named without a password is still a GitLab
    target: only the account half needs one, which is how the projects of an
    account that already exists are retried. Without *provision* only the
    explicit passwords are collected, since nothing will read them.
    """
    passwords = dict.fromkeys(named)
    passwords.update(_explicit_passwords(sources))
    if not provision:
        return passwords
    passwords.update(_configured_passwords(sources, named, passwords))
    name = sources.user_input.username
    if name and not passwords.get(name) and not has_account(name):
        passwords[name] = _prompt_password(name)
    return passwords


def require_passwords(named, passwords):
    """Refuse a provisioning run that could do nothing for a named user.

    A user with no password and no account from an earlier run has neither
    GitLab half to do. That used to be reported as a per user skip while the
    command still exited 0, so a bulk add from a users.csv with no password
    column produced users with containers, no GitLab account and no
    repositories. Raised before anything is staged or started, so the fix is
    to edit users.csv and run the same command again.
    """
    unset = [name for name in named if not passwords.get(name)]
    missing = sorted(name for name in unset if not has_account(name))
    if missing:
        listed = ", ".join(f"'{name}'" for name in missing)
        raise click.ClickException(
            f"No GitLab password for {listed}. {NO_PASSWORD_HINT}"
        )
