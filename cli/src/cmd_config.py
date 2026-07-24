"""The 'config' noun group: generate, validate, and reconcile dtaas.toml.

'config' is the sole owner of dtaas.toml (see DTaaS-CLI-Design.md): 'generate'
writes the template, 'validate' checks it, and 'reconcile' reports/repairs
drift between the desired user registry and what is actually provisioned.
The group is defined here and wired onto the root 'dtaas' group by cmd.py.
"""

import click
from python_on_whales.exceptions import DockerException
from .pkg import project as projectPkg
from .pkg import config_validate as configValidatePkg
from .cmd_utils import run_reconcile


@click.group(name="config")
def config_group():
    """Manage dtaas.toml, the single configuration file for a deployment.

    Start here: generate a template, fill it in, then validate before running
    'dtaas deployment generate' or any other command.
    """


@config_group.command(name="generate")
@click.option(
    "--output-dir",
    default=".",
    show_default=True,
    help="Target directory for the generated dtaas.toml.",
)
@click.option("--force", is_flag=True, help="Overwrite an existing dtaas.toml.")
def generate(output_dir, force):
    """Generate a dtaas.toml configuration template.

    \b
    Examples:
      dtaas config generate
      dtaas config generate --force

    Writes dtaas.toml and a sample users.csv into --output-dir. Edit dtaas.toml
    to set your server address, paths, and credentials, then run
    'dtaas config validate' to check for errors. This is the sole writer of
    dtaas.toml; 'dtaas deployment generate' consumes it.
    """
    try:
        skipped = projectPkg.generate_config(output_dir, force)
    except OSError as exc:
        raise click.ClickException(f"Error while generating config: {exc}") from exc
    if not skipped:
        click.echo("Configuration file generated successfully")


@config_group.command(name="validate")
@click.option(
    "--output-dir",
    default=".",
    show_default=True,
    help="Directory containing the dtaas.toml to validate.",
)
def validate(output_dir):
    """Validate the values in dtaas.toml and report all errors at once.

    \b
    Examples:
      dtaas config validate
      dtaas config validate --output-dir ./demo

    Reads dtaas.toml from --output-dir (falls back to the current directory).
    Fix any errors shown, then run 'dtaas deployment generate --type <TYPE>'
    where TYPE is one of: localhost, insecure-server, secure-server,
    secure-server-gitlab, workspace-localhost, workspace-secure-server.
    """
    try:
        errors = configValidatePkg.validate_config(output_dir)
    except (OSError, ValueError) as exc:
        raise click.ClickException(str(exc)) from exc
    if errors:
        listed = "\n".join(f"- {err}" for err in errors)
        raise click.ClickException(f"Invalid dtaas.toml:\n{listed}")
    click.echo("Configuration is valid")


@config_group.command(name="reconcile")
@click.option(
    "--output-dir",
    default=".",
    show_default=True,
    help="Installation directory to inspect.",
)
@click.option(
    "--fix",
    is_flag=True,
    help="Reprovision missing/drifted registry users after reporting.",
)
def reconcile(output_dir, fix):
    """Report drift between the user registry and what is actually provisioned.

    \b
    Examples:
      dtaas config reconcile           # report drift (read-only)
      dtaas config reconcile --fix     # reprovision + enforce status

    Compares dtaas.users.registry.json (desired) against the live
    compose.users.yml services (actual), listing users that are missing
    (registered but not provisioned), unexpected (provisioned but not
    registered), or drifted (config changed since provisioning, via
    .dtaas.state.json). It also reports desired-status drift: a provisioned user
    whose live container state does not match its registry desired_status
    (paused/stopped/running); a user intentionally stopped/paused via
    'dtaas user stop'/'pause' is treated as being in its desired state.

    Without --fix this is read-only. With --fix, missing and drifted users are
    reprovisioned and every provisioned user is paused/stopped/started to match
    its desired_status. --fix is equivalent to running 'dtaas user add', so it
    operates on the current directory regardless of --output-dir. 'unexpected'
    services are never touched by --fix -- remove those deliberately with
    'dtaas user delete'.
    """
    try:
        run_reconcile(output_dir, fix)
    except (OSError, ValueError, DockerException) as exc:
        raise click.ClickException(str(exc)) from exc
