"""Signals gateway commands, user add-signals."""

import click
from rich.console import Console
from .utility import projects_option
from ..pkg.secret_files import secret_path
from ..pkg.services.signals_account import (
    SIGNALS_ACCOUNT,
    SIGNALS_CONSUMER,
    setup_signals_account,
)


@click.command(name="add-signals")
@projects_option("Project the gateway serves, the first topic level. Repeat for more.")
def add_signals(projects):
    """
    Create the MQTT account dtaas_signals of the signals gateway.
    It may read the topics of the given projects and write only their
    command topics, .../cmd/<command>, in the vhost '/'. Its random password
    is written to secrets/signals/rabbitmq_dtaas_signals_password with mode
    600. Running the command again keeps the password and replaces the list
    of projects.
    Example:
        dtaas-services user add-signals -p SWiM
        dtaas-services user add-signals -p SWiM -p Soil
    """
    success, message = setup_signals_account(list(projects))
    if not success:
        raise click.ClickException(message)
    path = secret_path(SIGNALS_CONSUMER, "rabbitmq", SIGNALS_ACCOUNT)
    Console().print(f"[green]RabbitMQ: {message}[/green]")
    Console().print(f"Password file: {path}")
