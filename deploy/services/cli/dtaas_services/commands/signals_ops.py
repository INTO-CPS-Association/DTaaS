"""Signals gateway command, user add-signals."""

from pathlib import Path
import click
from rich.console import Console
from ..pkg.services.rabbitmq_signals import setup_signals_user


def _read_password(password_file: Path | None) -> str:
    """Read the password from a file, or prompt for it without echo.

    A command-line argument would show in the process list and in the shell
    history, so the command offers no option that takes the password itself.
    """
    if password_file is None:
        return click.prompt(
            "Password of the signals service user",
            hide_input=True,
            confirmation_prompt=True,
        )
    return password_file.read_text(encoding="utf-8").strip()


@click.command(name="add-signals")
@click.option(
    "--password-file",
    type=click.Path(exists=True, dir_okay=False, path_type=Path),
    help="File that holds the password. Prompted for when left out.",
)
def add_signals(password_file):
    """
    Create the read-only RabbitMQ user of the signals gateway.
    The user is SIGNALS_RABBITMQ_USER of config/services.env. It gets the
    read-only permissions of the gateway on every existing vhost, and
    'user add' grants it on each new user vhost.
    Example:
        dtaas-services user add-signals
        dtaas-services user add-signals --password-file signals-password
    """
    password = _read_password(password_file)
    if not password:
        raise click.ClickException("The password is empty")
    success, message = setup_signals_user(password)
    if not success:
        raise click.ClickException(message)
    Console().print(f"[green]RabbitMQ: {message}[/green]")
