"""The platform lifecycle subcommands: status, stop, start, pause, resume.

Defined here as standalone commands (rather than under cmd_platform.py's
'platform' group decorator) to keep each file within a reasonable line count;
they are wired onto the 'platform' group via add_lifecycle_commands.

These operate on an *installed* deployment. 'status' reports per-service state
for both the core services and user-added workloads. 'stop'/'start' and
'pause'/'resume' suspend or resume the core services in place, without removing
containers or networks (that is what 'uninstall' does) and without touching
per-user containers -- those are managed individually via 'dtaas user ...'.
"""

import json
import click
from python_on_whales.exceptions import DockerException
from .pkg import lifecycle as lifecyclePkg
from .pkg import deploy as deployPkg
from .cmd_utils import NO_INSTALLATION_MESSAGE
from .cmd_options import output_dir_option, json_option

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


def echo_status(rows, as_json):
    """Print status records as JSON or an aligned human-readable table.

    Shared by 'platform status' and 'user status' so both render identically.
    """
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
    Returns True if it acted, False if nothing was installed.
    """
    try:
        if not deployPkg.installation_present(output_dir):
            click.echo(NO_INSTALLATION_MESSAGE)
            return False
        action(output_dir)
    except (OSError, DockerException) as exc:
        raise click.ClickException(str(exc)) from exc
    click.echo(success_msg)
    return True


def _report_leftover_user_containers(output_dir, verb):
    """After a core-only *verb*, note any per-user containers left running.

    'platform stop'/'pause' act on the core services only; this makes the
    per-user blast radius visible so the operator is not misled into thinking
    the whole installation was quiesced.
    """
    try:
        count = lifecyclePkg.running_user_container_count(output_dir)
    except (OSError, DockerException) as exc:
        click.echo(f"Note: could not check per-user containers ({exc}).", err=True)
        return
    if count:
        click.echo(
            f"Note: {count} per-user container(s) are still running "
            f"({verb} them too with 'dtaas user {verb} --all')."
        )


@click.command(name="status")
@output_dir_option
@json_option
def status(output_dir, as_json):
    """Report per-service state for the core services and user containers.

    Unlike the other platform verbs, 'status' reports the whole installation:
    both the core services and per-user containers. Each service is reported as
    running/paused/exited/restarting, or 'not created' when it is defined but
    has no container yet. Always exits 0 when it can read the deployment; pass
    --json for automation. For a per-user view, use 'dtaas user status'.
    """
    try:
        rows = lifecyclePkg.collect_status(output_dir)
    except (OSError, DockerException) as exc:
        raise click.ClickException(str(exc)) from exc
    echo_status(rows, as_json)


@click.command(name="stop")
@output_dir_option
def stop(output_dir):
    """Stop the core services in place ('docker compose stop').

    Acts on the core services only, never on per-user containers (suspend those
    with 'dtaas user stop'). Containers and networks are kept, so this is not
    'uninstall'. Reverse it with 'dtaas platform start'.
    """
    if _run_suspend(output_dir, lifecyclePkg.stop, "Deployment stopped successfully"):
        _report_leftover_user_containers(output_dir, "stop")


@click.command(name="start")
@output_dir_option
def start(output_dir):
    """Start the stopped core services in place ('docker compose start').

    The counterpart to 'dtaas platform stop'. Acts on the core services only.
    """
    _run_suspend(output_dir, lifecyclePkg.start, "Deployment started successfully")


@click.command(name="pause")
@output_dir_option
def pause(output_dir):
    """Freeze the running core services in place ('docker compose pause').

    Acts on the core services only, never on per-user containers (freeze those
    with 'dtaas user pause'). Processes are frozen, not terminated, and memory
    is preserved. Reverse it with 'dtaas platform resume'.
    """
    if _run_suspend(output_dir, lifecyclePkg.pause, "Deployment paused successfully"):
        _report_leftover_user_containers(output_dir, "pause")


@click.command(name="resume")
@output_dir_option
def resume(output_dir):
    """Resume the paused core services ('docker compose unpause').

    Acts on the core services only. The counterpart to 'dtaas platform pause'.
    """
    _run_suspend(output_dir, lifecyclePkg.unpause, "Deployment resumed successfully")


def add_lifecycle_commands(platform_group):
    """Register status/stop/start/pause/resume on the *platform_group*."""
    for command in (status, stop, start, pause, resume):
        platform_group.add_command(command)
