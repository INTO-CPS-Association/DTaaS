"""The lifecycle subcommands: status, stop, start, pause, resume.

Defined here as standalone commands (rather than under cmd.py's 'admin' group
decorator) to keep cmd.py within a reasonable line count; cmd.py wires them
onto the 'admin' group via add_lifecycle_commands.

These operate on an *installed* deployment. 'status' reports per-service state
for both the main deployment and user-added workloads. 'stop'/'start' and
'pause'/'resume' suspend or resume a running deployment in place, without
removing containers or networks (that is what 'uninstall' does).
"""

import json
import click
from python_on_whales.exceptions import DockerException
from .pkg import lifecycle as lifecyclePkg
from .pkg import deploy as deployPkg
from .cmd_utils import NO_INSTALLATION_MESSAGE

_STATUS_HEADERS = ("PROJECT", "SERVICE", "STATE", "HEALTH")


def _status_rows_text(rows):
    """Render status records as aligned columns (header plus one line each)."""
    table: list[tuple[str, str, str, str]] = [_STATUS_HEADERS]
    table.extend(
        (row["project"], row["service"], row["state"], row["health"] or "-")
        for row in rows
    )
    widths = [max(len(line[i]) for line in table) for i in range(len(_STATUS_HEADERS))]
    return "\n".join(
        "  ".join(cell.ljust(widths[i]) for i, cell in enumerate(line))
        for line in table
    )


def _echo_status(rows, as_json):
    """Print status records as JSON or an aligned human-readable table."""
    if as_json:
        click.echo(json.dumps(rows, indent=2))
    elif rows:
        click.echo(_status_rows_text(rows))
    else:
        click.echo("No services found.")


def _run_suspend(output_dir, action, success_msg):
    """Apply a suspend/resume *action* to a present installation, or report it absent.

    Reports the absent case (exit 0) so scripts can call these idempotently,
    and maps deployment/compose failures to a ClickException (non-zero exit).
    """
    try:
        if not deployPkg.installation_present(output_dir):
            click.echo(NO_INSTALLATION_MESSAGE)
            return
        action(output_dir)
    except (OSError, DockerException) as exc:
        raise click.ClickException(str(exc)) from exc
    click.echo(success_msg)


_output_dir_option = click.option(
    "--output-dir",
    default=".",
    show_default=True,
    help="Installation directory containing the generated deployment.",
)


@click.command(name="status")
@_output_dir_option
@click.option(
    "--json",
    "as_json",
    is_flag=True,
    help="Emit machine-readable JSON instead of a human-readable table.",
)
def status(output_dir, as_json):
    """Report per-service state for the deployment and user workloads.

    Each service is reported as running/paused/exited/restarting, or 'not
    created' when it is defined but has no container yet. Always exits 0 when
    it can read the deployment; pass --json for automation.
    """
    try:
        rows = lifecyclePkg.collect_status(output_dir)
    except (OSError, DockerException) as exc:
        raise click.ClickException(str(exc)) from exc
    _echo_status(rows, as_json)


@click.command(name="stop")
@_output_dir_option
def stop(output_dir):
    """Stop all services in place ('docker compose stop').

    Containers and networks are kept, so this is not 'uninstall'. Reverse it
    with 'dtaas admin start'.
    """
    _run_suspend(output_dir, lifecyclePkg.stop, "Deployment stopped successfully")


@click.command(name="start")
@_output_dir_option
def start(output_dir):
    """Start all stopped services in place ('docker compose start').

    The counterpart to 'dtaas admin stop'.
    """
    _run_suspend(output_dir, lifecyclePkg.start, "Deployment started successfully")


@click.command(name="pause")
@_output_dir_option
def pause(output_dir):
    """Freeze all running services in place ('docker compose pause').

    Processes are frozen, not terminated, and memory is preserved. Reverse it
    with 'dtaas admin resume'.
    """
    _run_suspend(output_dir, lifecyclePkg.pause, "Deployment paused successfully")


@click.command(name="resume")
@_output_dir_option
def resume(output_dir):
    """Resume all paused services ('docker compose unpause')."""
    _run_suspend(output_dir, lifecyclePkg.unpause, "Deployment resumed successfully")


def add_lifecycle_commands(admin_group):
    """Register the lifecycle commands (status/stop/start/pause/resume) on *admin_group*."""
    for command in (status, stop, start, pause, resume):
        admin_group.add_command(command)
