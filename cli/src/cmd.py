"""This file defines all cli entrypoints for DTaaS"""

import click
from python_on_whales.exceptions import DockerException
from .pkg import users as userPkg
from .pkg import project as projectPkg
from .pkg import deploy as deployPkg
from .pkg import config_validate as configValidatePkg
from .pkg.project import DEPLOY_TYPES
from .cmd_utils import (
    VerticalChoicesCommand,
    apply_deploy_config,
    provision_user_files,
    stage_users_for_add,
    run_user_command,
    confirm_remove_user_files,
    run_config_update,
    run_reconcile,
    run_cert_update,
    require_update_flag,
)

NO_INSTALLATION_MESSAGE = "There is no existing DTaaS / Workspace installation"


### Groups
@click.group()
def dtaas():
    """Provision, configure, and manage Digital Twin as a Service environments."""
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
    """
    try:
        projectPkg.generate_project(output_dir, force)
    except OSError as exc:
        raise click.ClickException(f"Error while generating project: {exc}") from exc
    click.echo("Project files generated successfully")


@dtaas.group()
def admin():
    """administration commands"""
    return


@admin.group(name="config")
def config():
    """configuration file commands"""


@config.command(name="generate")
@click.option(
    "--output-dir",
    default=".",
    show_default=True,
    help="Target directory for the generated dtaas.toml.",
)
@click.option("--force", is_flag=True, help="Overwrite an existing dtaas.toml.")
def config_generate(output_dir, force):
    """Generate a dtaas.toml configuration template to fill in."""
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
    """Validate the values in dtaas.toml."""
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
def config_reconcile(output_dir):
    """Report users whose running config has drifted from .dtaas.state.json.

    Read-only: compares the state cache against compose.users.yml and lists
    drifted, untracked, and orphaned users. Re-run 'dtaas admin user add' to
    reprovision drifted users.
    """
    try:
        run_reconcile(output_dir)
    except (OSError, ValueError) as exc:
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
    """Generate project structure for a deployment scenario.

    Copies all files for the chosen --type into the target directory,
    removing the need to download separate zip packages.
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
    """user management commands"""
    return


#### user group commands
@user.command()
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
def add(username, csv_file, email, groups, load_balance):
    """
    add users to DTaaS\n
    Single user: dtaas admin user add alice --email alice@intocps.org\n
    Bulk from CSV: dtaas admin user add --file users.csv\n
    Both merge into dtaas.users.registry.json, then every registry user is
    provisioned. With no USERNAME and no --file, the existing registry is
    reprovisioned.\n
    """
    stage_users_for_add(username, csv_file, email, groups, load_balance)
    run_user_command(
        userPkg.add_users, "Users added successfully", "Error while adding users"
    )


@user.command()
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


@admin.command(name="install")
@click.option(
    "--output-dir",
    default=".",
    show_default=True,
    help="Installation directory containing the generated deployment.",
)
def install(output_dir):
    """Bring the generated deployment up with 'docker compose up -d'."""
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
    """Tear the deployment down with 'docker compose down'."""
    confirm_remove_user_files(remove_user_files, yes)
    try:
        if deployPkg.installation_present(output_dir):
            message = deployPkg.uninstall(output_dir, remove_user_files)
            if message:
                click.echo(message)
            click.echo("Deployment uninstalled successfully")
            return
        click.echo(NO_INSTALLATION_MESSAGE)
        if remove_user_files:
            deployPkg.require_compose_file(output_dir)
            click.echo(deployPkg.delete_user_files(output_dir))
    except (OSError, DockerException) as exc:
        raise click.ClickException(str(exc)) from exc


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
def update(certs, config_, dry_run, output_dir):
    """Update deployment assets in place.

    --certs validates the newest certificate pair from certs-src and swaps it
    in before reloading traefik. --config re-applies dtaas.toml to every
    service's config file and restarts the services whose files changed; add
    --dry-run to preview the changes first.
    """
    require_update_flag(certs, config_)
    if certs:
        run_cert_update(output_dir)
    if config_:
        run_config_update(output_dir, dry_run)
