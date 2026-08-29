"""The 'user' noun group: add, delete, status, pause, stop, and resume users.

Defines the 'user' group and its commands, wired onto the root 'dtaas' group by
cmd.py. 'user' acts on additional (registry-tracked) users individually -- a
separate axis from the whole-installation 'platform' verbs.

'status'/'pause'/'stop'/'resume' only manage additional (registry-tracked)
users -- see cmd_user_utils.reject_starting_users. Starting users are
suspended/resumed as part of the whole installation via
'dtaas platform pause'/'stop'/'resume'.
"""

import click
from python_on_whales.exceptions import DockerException
from .pkg import users as userPkg
from .pkg import lifecycle as lifecyclePkg
from .pkg import registry as registryPkg
from .cmd_utils import run_user_command
from .cmd_lifecycle import echo_status
from .cmd_options import file_option, json_option
from .cmd_user_lifecycle import add_user_lifecycle_commands
from .cmd_user_utils import (
    UserAddInput,
    resolve_usernames,
    stage_users_for_add,
)


@click.group(name="user")
def user_group():
    """Manage additional (registry-tracked) users on a running DTaaS instance.

    Requires a running deployment (run 'dtaas platform install' first). Only
    manages users added via 'user add', not dtaas.toml's starting users --
    suspend/resume the whole installation with 'dtaas platform stop'/'pause'/
    'resume' instead.
    """


def _should_prompt_password(user_input, provision):
    """True when a single-user 'user add' needs an interactive GitLab password.

    Only a single-USERNAME add with GitLab provisioning enabled and no
    --password given; a --file import supplies passwords via the CSV instead.
    """
    return bool(
        provision
        and user_input.username
        and not user_input.csv_file
        and not user_input.password
    )


@user_group.command()
@click.argument("username", required=False)
@file_option("Bulk-add users from a CSV file into the registry.")
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
@click.option(
    "--password",
    help=(
        "Initial GitLab password for USERNAME. Only used when GitLab "
        "provisioning ([gitlab].provision in dtaas.toml) is enabled; "
        "prompted for interactively if omitted."
    ),
)
def add(**kwargs):
    """Add users to a running DTaaS instance.

    \b
    Examples:
      dtaas user add alice --email alice@example.org
      dtaas user add --file users.csv

    Merges the specified user(s) into dtaas.users.registry.json and starts
    only those users; already-provisioned users are left untouched. A USERNAME
    or --file is required (not both). Requires a running deployment (run
    'dtaas platform install' first). To (re)provision every registry user, use
    'dtaas config reconcile --fix'.

    When [gitlab].provision is enabled in dtaas.toml, each newly-added user's
    GitLab account and Personal Access Token are also created; see --password.
    """
    user_input = UserAddInput(**kwargs)

    def _stage_then_add(config_obj):
        """Stage the registry only once dtaas.toml has loaded successfully.

        Only the newly-added users are started, so adding one user does not
        recreate every other registry user's container. A single-user add
        with GitLab provisioning enabled and no --password prompts for one
        interactively (hidden input) rather than requiring it on the command
        line, where it would be visible in shell history and the process list.
        """
        provision, err = config_obj.get_gitlab_provision()
        if err is not None:
            raise click.ClickException(f"Error while adding users: {err}")
        if _should_prompt_password(user_input, provision):
            user_input.password = click.prompt(
                f"GitLab password for '{user_input.username}'",
                hide_input=True,
                confirmation_prompt=True,
            )
        added, passwords = stage_users_for_add(user_input)
        return userPkg.add_users(config_obj, start_only=added, passwords=passwords)

    run_user_command(
        _stage_then_add, "Users added successfully", "Error while adding users"
    )


@user_group.command()
@click.argument("usernames", nargs=-1, required=False)
@file_option(
    "Bulk-delete users listed in a CSV file (only the username column is used)."
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
      dtaas user delete alice bob
      dtaas user delete --file users.csv
      dtaas user delete alice --dry-run

    Deprovisions each user and removes them from dtaas.users.registry.json.
    Use --dry-run to preview removals without making any changes.
    """
    resolved = resolve_usernames(usernames, csv_file)
    err = userPkg.delete_users(resolved, dry_run=dry_run)
    if err is not None:
        raise click.ClickException(f"Error while deleting users: {err}")
    if dry_run:
        click.echo("Dry run complete; nothing was deleted.")
    else:
        click.echo("Users deleted successfully")


def _reject_unregistered(username):
    """Reject a status query for a USERNAME that is not in the registry.

    Makes a typo distinguishable from a stopped or unprovisioned user, which
    would otherwise both render as an empty result.
    """
    if username is not None and username not in registryPkg.load_registry():
        raise click.ClickException(f"'{username}' is not a registered user.")


def _user_status_rows():
    """Per-user status rows for the current directory, mapping read errors."""
    try:
        rows = lifecyclePkg.collect_status(".")
    except (OSError, DockerException) as exc:
        raise click.ClickException(str(exc)) from exc
    return [row for row in rows if row["project"] == lifecyclePkg.USERS_PROJECT]


@user_group.command(name="status")
@click.argument("username", required=False)
@json_option
def status(username, as_json):
    """Report the state of all additional users, or one named USERNAME.

    Narrows the whole-installation 'dtaas platform status' view to the per-user
    containers (compose.users.yml). Each user is reported running/paused/
    stopped/restarting. A USERNAME that is not in dtaas.users.registry.json is
    rejected (so a typo is distinguishable from a stopped user), and a
    registered user with no container yet is reported as not provisioned rather
    than shown as absent. Like the other 'user' verbs, it acts on the current
    directory. Always exits 0 when it can read the deployment.
    """
    _reject_unregistered(username)
    rows = _user_status_rows()
    if username is not None:
        rows = [row for row in rows if row["service"] == username]
        if not rows:
            click.echo(f"'{username}' is registered but not currently provisioned.")
            return
    echo_status(rows, as_json)


add_user_lifecycle_commands(user_group)
