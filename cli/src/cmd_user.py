"""The 'user' subcommands: add and delete DTaaS users.

Defined here as standalone commands (rather than under cmd.py's 'user' group
decorator) purely to keep cmd.py within a reasonable line count; they are
wired onto the 'user' group by cmd.py via Group.add_command.
"""

import click
from .pkg import users as userPkg
from .cmd_utils import (
    UserAddInput,
    resolve_delete_usernames,
    run_user_command,
    stage_users_for_add,
)


@click.command()
@click.argument("username", required=False)
@click.option(
    "--file",
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

    Merges the specified user(s) into dtaas.users.registry.json, then
    provisions all registry users. A USERNAME or --file is required.
    Requires a running deployment (run 'dtaas admin install' first).
    """
    user_input = UserAddInput(**kwargs)

    def _stage_then_add(config_obj):
        """Stage the registry only once dtaas.toml has loaded successfully."""
        stage_users_for_add(user_input)
        return userPkg.add_users(config_obj)

    run_user_command(
        _stage_then_add, "Users added successfully", "Error while adding users"
    )


@click.command()
@click.argument("usernames", nargs=-1, required=False)
@click.option(
    "--file",
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
    resolved = resolve_delete_usernames(usernames, csv_file)
    err = userPkg.delete_users(resolved, dry_run=dry_run)
    if err is not None:
        raise click.ClickException(f"Error while deleting users: {err}")
    if dry_run:
        click.echo("Dry run complete; nothing was deleted.")
    else:
        click.echo("Users deleted successfully")
