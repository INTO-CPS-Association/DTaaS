"""Resolves the initial GitLab password 'user add' provisions each user with.

Split out of cmd_user_utils.py, which resolves which users a run acts on:
where a password comes from is its own concern, and one with a precedence
worth stating in one place. In order: --password or the users.csv password
column, then [[users]].password in dtaas.toml for a starting user, then a
hidden prompt for a single user add.

The CLI never writes a password anywhere: it reaches the provisioning step
through this map alone and never dtaas.users.registry.json (see
registry_csv.read_csv_passwords). The files it may read one from are the
admin's own, though, and hold it in plaintext: [[users]].password in
dtaas.toml and the users.csv password column. A run that takes a password
from one warns when that file is readable by other users, and a
[[users]].password key is pointed out once its account exists, since it
stays a valid GitLab login until the user changes it.
"""

import os
import stat
from dataclasses import dataclass, field
from pathlib import Path
import click
from .gitlab_common import with_hint
from .pkg import registry as registryPkg
from .pkg import registry_csv as registryCsvPkg

NO_PASSWORD_HINT = (
    "[gitlab].provision is enabled in dtaas.toml, so a new user needs an "
    "initial GitLab password: add a 'password' column to their users.csv row "
    "(and chmod 600 the file), pass --password for a single user, or set "
    "[[users]].password for a dtaas.toml starting user."
)


CONFIG_FILE = "dtaas.toml"

# Mode bits do not say who can read a file on Windows, where ACLs decide.
IS_WINDOWS = os.name == "nt"


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

    Such a user needs no password on a re-run: their account step is
    reported as done or skipped rather than creating the account again, and
    no second token is minted for them.
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


def _file_mode(path):
    """The permission bits of *path*."""
    return stat.S_IMODE(os.stat(path).st_mode)


def _warn_if_shared(path, passwords):
    """Warn when *path*, which supplied *passwords*, is readable by other
    users. Nothing is checked on Windows (see IS_WINDOWS)."""
    if not path or not any(passwords.values()) or IS_WINDOWS:
        return
    if _file_mode(path) & 0o077:
        click.echo(
            with_hint(
                f"Warning: {Path(path).name} is readable by other users.",
                "It holds plaintext GitLab passwords. Restrict it with: "
                f"chmod 600 {path}",
            )
        )


def configured_names(sources, named):
    """The users *named* whose [[users]].password dtaas.toml holds."""
    return [name for name in named if sources.configured.get(name)]


def remind_configured_passwords(names):
    """Point at the [[users]].password keys dtaas.toml still holds for
    *names* once their GitLab accounts exist."""
    done = [name for name in names if has_account(name)]
    if done:
        listed = ", ".join(f"'{name}'" for name in done)
        click.echo(
            with_hint(
                f"Warning: remove [[users]].password from {CONFIG_FILE}.",
                f"It is kept there in plaintext for {listed}, and stays a "
                "valid GitLab login until changed.",
            )
        )


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
    target, whose account step is then reported rather than dropped in
    silence. Without *provision* only the explicit passwords are collected,
    since nothing will read them.
    """
    passwords = dict.fromkeys(named)
    explicit = _explicit_passwords(sources)
    passwords.update(explicit)
    if not provision:
        return passwords
    _warn_if_shared(sources.user_input.csv_file, explicit)
    configured = _configured_passwords(sources, named, passwords)
    _warn_if_shared(CONFIG_FILE, configured)
    passwords.update(configured)
    name = sources.user_input.username
    if name and not passwords.get(name) and not has_account(name):
        passwords[name] = _prompt_password(name)
    return passwords


def require_passwords(named, passwords):
    """Refuse a provisioning run that could do nothing for a named user.

    A user with no password and no account from an earlier run has no GitLab
    work this run can do. That used to be reported as a per user skip while
    the command still exited 0, so a bulk add from a users.csv with no
    password column produced users with containers and no GitLab account.
    Raised before anything is staged or started, so the fix is to edit
    users.csv and run the same command again.
    """
    unset = [name for name in named if not passwords.get(name)]
    missing = sorted(name for name in unset if not has_account(name))
    if missing:
        listed = ", ".join(f"'{name}'" for name in missing)
        raise click.ClickException(
            with_hint(f"No GitLab password for {listed}.", NO_PASSWORD_HINT)
        )
