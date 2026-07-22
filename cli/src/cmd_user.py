"""The 'user' subcommands: add, delete, pause, stop, and resume DTaaS users.

Defined here as standalone commands (rather than under cmd.py's 'user' group
decorator) purely to keep cmd.py within a reasonable line count; they are
wired onto the 'user' group by cmd.py via Group.add_command.

'pause'/'stop'/'resume' only manage additional (registry-tracked) users --
see cmd_user_utils.reject_starting_users. Starting users are suspended/resumed
as part of the whole installation via 'dtaas admin pause'/'stop'/'resume'.
"""

import click
from .pkg import users as userPkg
from .pkg import users_lifecycle as usersLifecyclePkg
from .cmd_utils import run_user_command
from .cmd_user_utils import (
    UserAddInput,
    reject_starting_users,
    resolve_usernames,
    stage_users_for_add,
)


@click.command()
@click.argument("username", required=False)
@click.option(
    "--file",
    "-f",
    "csv_file",
    type=click.Path(exists=True, dir_okay=False),
    help="Bulk-add users from a CSV file into the registry.",
)
@click.option("--email", help="Email for USERNAME (enables forward-auth routing).")
@click.option(
    "--group",
    "groups",
    multiple=True,
    help="Group tag for USERNAME (repeatable; defaults to 'additional').",
)
@click.option(
    "--load-balance/--no-load-balance",
    default=True,
    help="Mark USERNAME for load balancing (default: enabled).",
)
def add(**kwargs):
    """Add users to a running DTaaS instance.

    \b
    Examples:
      dtaas admin user add alice --email alice@example.org
      dtaas admin user add --file users.csv

    Merges the specified user(s) into dtaas.users.registry.json and starts
    only those users; already-provisioned users are left untouched. A USERNAME
    or --file is required (not both). Requires a running deployment (run
    'dtaas admin install' first). To (re)provision every registry user, use
    'dtaas admin config reconcile --fix'.
    """
    user_input = UserAddInput(**kwargs)

    def _stage_then_add(config_obj):
        """Stage the registry only once dtaas.toml has loaded successfully.

        Only the newly-added users are started, so adding one user does not
        recreate every other registry user's container.
        """
        added = stage_users_for_add(user_input)
        return userPkg.add_users(config_obj, start_only=added)

    run_user_command(
        _stage_then_add, "Users added successfully", "Error while adding users"
    )


@click.command()
@click.argument("usernames", nargs=-1, required=False)
@click.option(
    "--file",
    "-f",
    "csv_file",
    type=click.Path(exists=True, dir_okay=False),
    help="Bulk-delete users listed in a CSV file (only the username column is used).",
)
@click.option(
    "--dry-run",
    is_flag=True,
    help="Show which users would be removed without deleting anything.",
)
def delete(usernames, csv_file, dry_run):
    """Remove users from a running DTaaS instance.

    \b
    Examples:
      dtaas admin user delete alice bob
      dtaas admin user delete --file users.csv
      dtaas admin user delete alice --dry-run

    Deprovisions each user and removes them from dtaas.users.registry.json.
    Use --dry-run to preview removals without making any changes.
    """
    resolved = resolve_usernames(usernames, csv_file, verb="delete")
    err = userPkg.delete_users(resolved, dry_run=dry_run)
    if err is not None:
        raise click.ClickException(f"Error while deleting users: {err}")
    if dry_run:
        click.echo("Dry run complete; nothing was deleted.")
    else:
        click.echo("Users deleted successfully")


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


def _lifecycle_command(usernames, csv_file, verb):
    """Resolve/validate the target usernames for *verb*, run it, and report.

    Shared by pause/stop/resume: reject_starting_users runs before any compose
    or registry mutation, so a bad target aborts the whole batch rather than
    partially acting on it. The users_lifecycle function is looked up by name
    at call time (not stored at import time) so tests can patch
    usersLifecyclePkg.<verb>_users directly.
    """
    resolved = resolve_usernames(usernames, csv_file, verb=verb)
    reject_starting_users(resolved, verb)
    attr_name, verb_past = _LIFECYCLE_VERBS[verb]
    action = getattr(usersLifecyclePkg, attr_name)
    _report_lifecycle_result(action(resolved), verb_past)


@click.command()
@click.argument("usernames", nargs=-1, required=False)
@click.option(
    "--file",
    "-f",
    "csv_file",
    type=click.Path(exists=True, dir_okay=False),
    help="Bulk-target users listed in a CSV file (only the username column is used).",
)
def pause(usernames, csv_file):
    """Pause specific additional users' containers.

    \b
    Examples:
      dtaas admin user pause alice bob
      dtaas admin user pause --file users.csv

    Freezes the named users' containers in place (memory preserved) with
    'docker compose pause', and records the pause in
    dtaas.users.registry.json so a later 'user add' or 'config reconcile
    --fix' does not silently restart them. Reverse with 'user resume'.
    """
    _lifecycle_command(usernames, csv_file, "pause")


@click.command()
@click.argument("usernames", nargs=-1, required=False)
@click.option(
    "--file",
    "-f",
    "csv_file",
    type=click.Path(exists=True, dir_okay=False),
    help="Bulk-target users listed in a CSV file (only the username column is used).",
)
def stop(usernames, csv_file):
    """Stop specific additional users' containers.

    \b
    Examples:
      dtaas admin user stop alice bob
      dtaas admin user stop --file users.csv

    Terminates the named users' containers in place with 'docker compose
    stop' (containers and their compose entries are kept, so this is not
    'user delete'), and records the stop in dtaas.users.registry.json so a
    later 'user add' or 'config reconcile --fix' does not silently restart
    them. Reverse with 'user resume'.
    """
    _lifecycle_command(usernames, csv_file, "stop")


@click.command()
@click.argument("usernames", nargs=-1, required=False)
@click.option(
    "--file",
    "-f",
    "csv_file",
    type=click.Path(exists=True, dir_okay=False),
    help="Bulk-target users listed in a CSV file (only the username column is used).",
)
def resume(usernames, csv_file):
    """Resume specific additional users previously paused or stopped.

    \b
    Examples:
      dtaas admin user resume alice bob
      dtaas admin user resume --file users.csv

    Thaws paused containers with 'docker compose unpause' or restarts stopped
    ones with 'docker compose start' (as appropriate), and marks them
    'running' again in dtaas.users.registry.json.
    """
    _lifecycle_command(usernames, csv_file, "resume")
