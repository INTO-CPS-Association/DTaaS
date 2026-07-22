"""This file defines all cli entrypoints for DTaaS"""

import click
from python_on_whales.exceptions import DockerException
from .pkg import project as projectPkg
from .pkg import deploy as deployPkg
from .pkg import config_validate as configValidatePkg
from .pkg.project import DEPLOY_TYPES
from .cmd_deploy_utils import (
    VerticalChoicesCommand,
    apply_deploy_config,
    provision_user_files,
)
from .cmd_utils import (
    UpdateOptions,
    confirm_remove_user_files,
    run_reconcile,
    run_uninstall,
    run_update,
)
from .cmd_user import (
    add as user_add,
    delete as user_delete,
    pause as user_pause,
    resume as user_resume,
    stop as user_stop,
)
from .cmd_lifecycle import add_lifecycle_commands


### Groups
@click.group()
def dtaas():
    """Provision, configure, and manage Digital Twin as a Service environments.

    \b
    First-time setup:
      1.  dtaas admin config generate        # create dtaas.toml template
      2.  # edit dtaas.toml (server DNS, paths, credentials)
      3.  dtaas admin config validate        # check for errors
      4.  dtaas generate-deployment --type secure-server
      5.  dtaas admin install                # start containers

    Full documentation: https://pypi.org/project/dtaas
    """
    return


@dtaas.command(name="generate-project")
@click.option(
    "--output-dir",
    default=".",
    show_default=True,
    help="Target directory for generated files.",
)
@click.option("--force", is_flag=True, help="Overwrite existing files.")
def generate_project(output_dir, force):
    """Generate user management templates.

    Creates dtaas.toml, users.server.yml, and users.server.secure.yml
    in the target directory. Existing files are left untouched unless
    --force is set.

    Next: edit dtaas.toml and run 'dtaas admin config validate'.
    """
    try:
        projectPkg.generate_project(output_dir, force)
    except OSError as exc:
        raise click.ClickException(f"Error while generating project: {exc}") from exc
    click.echo("Project files generated successfully")


@dtaas.group()
def admin():
    """Commands to install, update, and manage a DTaaS deployment.

    Run 'dtaas admin config generate' first to create dtaas.toml,
    then 'dtaas admin config validate' before any other command.
    """
    return


@admin.group(name="config")
def config():
    """Manage dtaas.toml, the single configuration file for a deployment.

    Start here: generate a template, fill it in, then validate before
    running 'dtaas generate-deployment' or any other 'dtaas admin' command.
    """


@config.command(name="generate")
@click.option(
    "--output-dir",
    default=".",
    show_default=True,
    help="Target directory for the generated dtaas.toml.",
)
@click.option("--force", is_flag=True, help="Overwrite an existing dtaas.toml.")
def config_generate(output_dir, force):
    """Generate a dtaas.toml configuration template.

    Writes dtaas.toml and a sample users.csv into --output-dir.
    Edit dtaas.toml to set your server address, paths, and credentials,
    then run 'dtaas admin config validate' to check for errors.
    """
    try:
        skipped = projectPkg.generate_config(output_dir, force)
    except OSError as exc:
        raise click.ClickException(f"Error while generating config: {exc}") from exc
    if not skipped:
        click.echo("Configuration file generated successfully")


@config.command(name="validate")
@click.option(
    "--output-dir",
    default=".",
    show_default=True,
    help="Directory containing the dtaas.toml to validate.",
)
def config_validate(output_dir):
    """Validate the values in dtaas.toml and report all errors at once.

    Reads dtaas.toml from --output-dir (falls back to the current directory).
    Fix any errors shown, then run:

    \b
      dtaas generate-deployment --type <TYPE>

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


@config.command(name="reconcile")
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
def config_reconcile(output_dir, fix):
    """Report drift between the user registry and what is actually provisioned.

    Compares dtaas.users.registry.json (desired) against the live
    compose.users.yml services (actual), and lists users that are missing,
    unexpected, or whose config has drifted since it was last provisioned
    (using .dtaas.state.json).

    Also reports desired-status drift: a provisioned user whose live container
    state does not match its registry desired_status (paused/stopped/running).

    Without --fix this is read-only. With --fix, missing and drifted users are
    reprovisioned and every provisioned user is paused/stopped/started to match
    its desired_status (equivalent to running 'dtaas admin user add', so it
    operates on the current directory regardless of --output-dir). 'unexpected'
    services (running but not registered) are never touched by --fix -- remove
    those deliberately with 'dtaas admin user delete'.

    \b
    Examples:
      dtaas admin config reconcile           # report drift (read-only)
      dtaas admin config reconcile --fix     # reprovision + enforce status
    """
    try:
        run_reconcile(output_dir, fix)
    except (OSError, ValueError, DockerException) as exc:
        raise click.ClickException(str(exc)) from exc


@dtaas.command(name="generate-deployment", cls=VerticalChoicesCommand)
@click.option(
    "--type",
    "deploy_type",
    required=True,
    type=click.Choice(sorted(DEPLOY_TYPES), case_sensitive=False),
    metavar="[...]",
    help="Deployment scenario to generate.",
)
@click.option(
    "--output-dir",
    default=".",
    show_default=True,
    help="Target directory for generated files.",
)
@click.option("--force", is_flag=True, help="Overwrite existing files.")
def generate_deployment(deploy_type, output_dir, force):
    """Generate files for a deployment scenario.

    Copies docker-compose.yml and supporting files for the chosen --type
    into the target directory, substituting values from dtaas.toml when
    present.

    \b
    Examples:
      dtaas generate-deployment --type secure-server
      dtaas generate-deployment --type localhost --output-dir ./demo
      dtaas generate-deployment --type insecure-server --force

    Next: edit generated files if needed, then run 'dtaas admin install'.
    """
    try:
        projectPkg.generate_deploy_project(deploy_type, output_dir, force)
    except (ValueError, RuntimeError, OSError) as exc:
        raise click.ClickException(str(exc)) from exc
    apply_deploy_config(deploy_type, output_dir, force)
    projectPkg.set_files_permissions(output_dir)
    click.echo(f"Project files for '{deploy_type}' generated successfully")


@admin.group()
def user():
    """Manage additional (registry-tracked) users on a running DTaaS instance.

    Requires a running deployment. Run 'dtaas admin install' first. Only
    manages users added via 'user add', not dtaas.toml's starting users --
    suspend/resume the whole installation with 'dtaas admin pause'/'stop'/'resume' instead.
    """
    return


#### user group commands (defined in cmd_user.py to keep this file short)
user.add_command(user_add)
user.add_command(user_delete)
user.add_command(user_pause)
user.add_command(user_stop)
user.add_command(user_resume)
#### lifecycle commands status/stop/pause/resume (defined in cmd_lifecycle.py)
add_lifecycle_commands(admin)


@admin.command(name="install")
@click.option(
    "--output-dir",
    default=".",
    show_default=True,
    help="Installation directory containing the generated deployment.",
)
def install(output_dir):
    """Start the deployment with 'docker compose up -d'.

    Requires a deployment generated by 'dtaas generate-deployment'.
    Before starting, provisions per-user workspace directories for any
    users declared under [[users]] in dtaas.toml.

    Next: run 'dtaas admin user add' to add users to the running instance.
    """
    try:
        provision_user_files(output_dir)
        deployPkg.install(output_dir)
    except (OSError, DockerException) as exc:
        raise click.ClickException(str(exc)) from exc
    click.echo("Deployment installed successfully")


@admin.command(name="uninstall")
@click.option(
    "--output-dir",
    default=".",
    show_default=True,
    help="Installation directory containing the generated deployment.",
)
@click.option(
    "--remove-user-files",
    is_flag=True,
    help="Also delete per-user workspace files (destructive).",
)
@click.option(
    "--yes",
    "-y",
    is_flag=True,
    help="Skip the confirmation prompt for --remove-user-files.",
)
def uninstall(output_dir, remove_user_files, yes):
    """Stop and remove the deployment with 'docker compose down'.

    Per-user workspace files are preserved by default.
    Use --remove-user-files to also delete workspace directories
    (prompts for confirmation; skip with --yes in non-interactive scripts).
    """
    confirm_remove_user_files(remove_user_files, yes)
    run_uninstall(output_dir, remove_user_files)


@admin.command(name="update")
@click.option(
    "--certs",
    is_flag=True,
    help="Refresh the deployment's TLS certificates in place.",
)
@click.option(
    "--config",
    "config_",
    is_flag=True,
    help="Re-apply dtaas.toml config to all services in place.",
)
@click.option(
    "--dry-run",
    is_flag=True,
    help="With --config, report what would change without applying it.",
)
@click.option(
    "--output-dir",
    default=".",
    show_default=True,
    help="Installation directory containing the generated deployment.",
)
def update(**kwargs):
    """Update deployment assets in place without regenerating the project.

    \b
    Examples:
      dtaas admin update --certs                  # rotate TLS certificates
      dtaas admin update --config                 # re-apply dtaas.toml
      dtaas admin update --config --dry-run       # preview changes first

    --certs swaps in the newest certificate pair from certs-src and reloads
    traefik. --config re-substitutes dtaas.toml into service config files
    and restarts services whose files changed.
    """
    run_update(UpdateOptions(**kwargs))
