"""The 'user' subcommands: add and delete DTaaS users.

Defined here as standalone commands (rather than under cmd.py's 'user' group
decorator) purely to keep cmd.py within a reasonable line count; they are
wired onto the 'user' group by cmd.py via Group.add_command.
"""

import click
from .pkg import users as userPkg
from .cmd_utils import UserAddInput, run_user_command, stage_users_for_add


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
    """
    add users to DTaaS\n
    Single user: dtaas admin user add alice --email alice@intocps.org\n
    Bulk from CSV: dtaas admin user add --file users.csv\n
    Both merge into dtaas.users.registry.json, then every registry user is
    provisioned. With no USERNAME and no --file, the existing registry is
    reprovisioned.\n
    """
    stage_users_for_add(UserAddInput(**kwargs))
    run_user_command(
        userPkg.add_users, "Users added successfully", "Error while adding users"
    )


@click.command()
@click.argument("usernames", nargs=-1, required=True)
@click.option(
    "--dry-run",
    is_flag=True,
    help="Show which users would be removed without deleting anything.",
)
def delete(usernames, dry_run):
    """
    removes the named USERNAMES from DTaaS\n
    Deprovisions each user and drops them from dtaas.users.registry.json.\n
    Pass --dry-run to preview the removal without making any changes.\n
    """
    err = userPkg.delete_users(usernames, dry_run=dry_run)
    if err is not None:
        raise click.ClickException(f"Error while deleting users: {err}")
    if dry_run:
        click.echo("Dry run complete; nothing was deleted.")
    else:
        click.echo("Users deleted successfully")
