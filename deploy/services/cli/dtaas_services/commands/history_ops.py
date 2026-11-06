"""History commands: user add-history, twin register and twin remove."""

from pathlib import Path
import click
from rich.console import Console
from .utility import projects_option
from ..pkg.history.registration import register_twin, remove_twin
from ..pkg.history.setup import setup_group_history


def _finish(success: bool, message: str) -> None:
    """Print a success message or end the command with the error."""
    if not success:
        raise click.ClickException(message)
    Console().print(f"[green]{message}[/green]")


@click.command(name="add-history")
@click.option("--group", "-g", required=True, help="GitLab group that owns the twins.")
@projects_option(
    "Project of the group, the first topic level. Repeat for more."
)
@click.option(
    "--owner",
    "-o",
    "owners",
    multiple=True,
    help="GitLab project path whose twins use this group. Repeat for more.",
)
def add_history(group, projects, owners):
    """
    Set up the history of a group before its twins are registered.
    Makes the MQTT account <group>_telegraf that reads the group's projects,
    the database <group> with the tables device and reading, the roles
    <group>_telegraf, <group>_view_ro and dtaas_signals_ro and the Grafana
    data source postgresql_<group>. Passwords go to files with mode 600
    under secrets/. Restart Grafana to load a new data source.
    Each --owner is mapped to the group and the topics of its projects in
    secrets/signals/signals_owners.json, which the signals gateway reads.
    Example:
        dtaas-services user add-history -g swim -p SWiM -o jady
    """
    _finish(*setup_group_history(group, list(projects), owners))


@click.command()
@click.option(
    "--file",
    "-f",
    "twin_path",
    required=True,
    type=click.Path(exists=True, dir_okay=False, path_type=Path),
    help="JSON file with the group, the twin, its topic prefix and devices.",
)
def register(twin_path):
    """
    Register a twin: its devices, then its Telegraf file.
    The Telegraf file is written only after 'telegraf config check' passes
    on it, with the local telegraf or the pinned image through Docker.
    Example:
        dtaas-services twin register -f twins/room_0224.json
    """
    _finish(*register_twin(twin_path))


@click.command()
@click.option("--group", "-g", required=True, help="Group that owns the twin.")
@click.option("--twin", "-t", "twin_name", required=True, help="Name of the twin.")
def remove(group, twin_name):
    """
    Remove a twin's Telegraf file and its MQTT session queue.
    Its devices and readings are kept.
    Example:
        dtaas-services twin remove -g swim -t room_0224
    """
    _finish(*remove_twin(group, twin_name))
