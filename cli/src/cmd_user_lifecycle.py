"""The 'user pause'/'stop'/'resume' subcommands.

Split out of cmd_user.py to keep both files within a reasonable line count,
mirroring the cmd_platform.py / cmd_lifecycle.py split. The three commands
share one shape (targets via USERNAMES / --file / --all, then dispatch); only
the help text differs, so they are built by _make_lifecycle_command and wired
onto the 'user' group via add_user_lifecycle_commands.

These only manage additional (registry-tracked) users -- see
cmd_user_utils.reject_starting_users.
"""

import click
from .pkg import users_lifecycle as usersLifecyclePkg
from .pkg import registry as registryPkg
from .cmd_options import file_option
from .cmd_user_utils import reject_starting_users, resolve_usernames


_LIFECYCLE_VERBS = {
    "pause": ("pause_users", "paused"),
    "stop": ("stop_users", "stopped"),
    "resume": ("resume_users", "resumed"),
}


def _report_lifecycle_result(outcome, verb_past):
    """Echo the outcome of a pause/stop/resume: what happened, and why anything
    was skipped. *outcome* is the (acted, unregistered, not_provisioned) tuple
    a users_lifecycle function returns."""
    acted, unregistered, not_provisioned = outcome
    for name in unregistered:
        click.echo(f"'{name}' is not a registered user, skipping")
    for name in not_provisioned:
        click.echo(f"'{name}' is not currently provisioned, skipping")
    if acted:
        click.echo(f"{', '.join(acted)} {verb_past} successfully")


def _run_lifecycle(resolved, verb):
    """Run *verb* against the already-resolved *resolved* usernames and report.

    reject_starting_users runs before any compose or registry mutation, so a bad
    target aborts the whole batch rather than partially acting on it. The
    users_lifecycle function is looked up by name at call time (not stored at
    import time) so tests can patch usersLifecyclePkg.<verb>_users directly. An
    empty target list (only reachable via '--all' on an empty registry) is a
    friendly no-op.
    """
    if not resolved:
        click.echo("No additional users to act on.")
        return
    reject_starting_users(resolved, verb)
    attr_name, verb_past = _LIFECYCLE_VERBS[verb]
    action = getattr(usersLifecyclePkg, attr_name)
    _report_lifecycle_result(action(resolved), verb_past)


def _resolve_lifecycle_targets(selection, verb):
    """Resolve target usernames for a lifecycle *verb* from a selection tuple.

    *selection* is (usernames, csv_file, all_users). --all targets every
    additional (registry) user and is mutually exclusive with explicit targets.
    """
    usernames, csv_file, all_users = selection
    if not all_users:
        return resolve_usernames(
            usernames,
            csv_file,
            f"USERNAMES, --file <users.csv>, or --all to {verb} users",
        )
    if usernames or csv_file:
        raise click.ClickException(
            "Pass either target USERNAMES/--file or --all, not both."
        )
    return _all_registry_users()


_LIFECYCLE_EFFECTS = {
    "pause": (
        "Freezes the named users' containers in place (memory preserved) with "
        "'docker compose pause'.",
        "paused",
        "Reverse with 'user resume'.",
    ),
    "stop": (
        "Terminates the named users' containers in place with 'docker compose "
        "stop' (containers and their compose entries are kept, so this is not "
        "'user delete').",
        "stopped",
        "Reverse with 'user resume'.",
    ),
    "resume": (
        "Thaws a paused container with 'docker compose unpause', or restarts a "
        "stopped one with 'docker compose start', as appropriate.",
        "running",
        "",
    ),
}


def _lifecycle_help(verb):
    """Build the shared-shape help text for a pause/stop/resume command."""
    effect, desired_status, reverse = _LIFECYCLE_EFFECTS[verb]
    durability = (
        f"Records the users as '{desired_status}' in dtaas.users.registry.json so "
        "a later 'user add' or 'config reconcile --fix' does not silently override it."
    )
    return "\n\n".join(
        part
        for part in (
            f"{verb.capitalize()} specific additional users' containers.",
            "\b\nExamples:\n"
            f"  dtaas user {verb} alice bob\n"
            f"  dtaas user {verb} --file users.csv\n"
            f"  dtaas user {verb} --all",
            f"{effect} {durability} {reverse}".strip(),
        )
        if part
    )


def _all_registry_users():
    """Every additional (registry-tracked) user, for the --all target.

    Only additional users are registered, so this never includes dtaas.toml
    starting users (which reject_starting_users would refuse anyway).
    """
    return list(registryPkg.load_registry())


def _make_lifecycle_command(verb):
    """Build the pause/stop/resume click Command for *verb*, sharing options
    and dispatch; only the help text (via _LIFECYCLE_EFFECTS) differs."""

    @click.command(name=verb, help=_lifecycle_help(verb))
    @click.argument("usernames", nargs=-1, required=False)
    @file_option(
        "Bulk-target users listed in a CSV file (only the username column is used)."
    )
    @click.option(
        "--all",
        "all_users",
        is_flag=True,
        help="Target every additional (registry) user.",
    )
    def _command(usernames, csv_file, all_users):
        resolved = _resolve_lifecycle_targets((usernames, csv_file, all_users), verb)
        _run_lifecycle(resolved, verb)

    return _command


def add_user_lifecycle_commands(user_group):
    """Register pause/stop/resume on the *user_group*."""
    for verb in ("pause", "stop", "resume"):
        user_group.add_command(_make_lifecycle_command(verb))
