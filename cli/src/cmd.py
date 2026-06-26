"""This file defines all cli entrypoints for DTaaS"""

import click
from python_on_whales.exceptions import DockerException
from .pkg import users as userPkg
from .pkg import project as projectPkg
from .pkg import deploy as deployPkg
from .pkg import cert_update as certUpdatePkg
from .pkg.cert_validate import CertValidationError
from .pkg.project import DEPLOY_TYPES
from .cmd_utils import (
    VerticalChoicesCommand,
    apply_deploy_config,
    provision_user_files,
    run_user_command,
    confirm_remove_user_files,
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
def add():
    """
    add a list of users to DTaaS at once\n
    Specify the list in dtaas.toml [users].add\n
    """
    run_user_command(
        userPkg.add_users, "Users added successfully", "Error while adding users"
    )


@user.command()
def delete():
    """
    removes the USERNAME user from DTaaS\n
    Specify the users in dtaas.toml [users].delete\n
    """
    run_user_command(
        userPkg.delete_user, "User deleted successfully", "Error while deleting users"
    )


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
    try:
        if not deployPkg.installation_present(output_dir):
            click.echo(NO_INSTALLATION_MESSAGE)
            return
        confirm_remove_user_files(remove_user_files, yes)
        message = deployPkg.uninstall(output_dir, remove_user_files)
    except (OSError, DockerException) as exc:
        raise click.ClickException(str(exc)) from exc
    if message:
        click.echo(message)
    click.echo("Deployment uninstalled successfully")


@admin.command(name="update")
@click.option(
    "--certs",
    is_flag=True,
    help="Refresh the deployment's TLS certificates in place.",
)
@click.option(
    "--output-dir",
    default=".",
    show_default=True,
    help="Installation directory containing the generated deployment.",
)
def update(certs, output_dir):
    """Update deployment assets in place.

    Currently supports --certs, which validates the newest certificate pair
    from certs-src and swaps it in before reloading traefik.
    """
    if not certs:
        raise click.ClickException("Nothing to update; pass --certs.")
    try:
        message = certUpdatePkg.update_certs(output_dir)
    except (CertValidationError, OSError, DockerException, RuntimeError) as exc:
        raise click.ClickException(str(exc)) from exc
    click.echo(message)
