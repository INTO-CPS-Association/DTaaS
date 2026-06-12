"""This file defines all cli entrypoints for DTaaS"""

from pathlib import Path
import click
from .pkg import config as configPkg
from .pkg import users as userPkg
from .pkg import project as projectPkg
from .pkg import deploy_config as deployConfigPkg
from .pkg.project import DEPLOY_TYPES


def _toml_exists():
    """Return True if dtaas.toml is present in the working directory."""
    return Path("dtaas.toml").is_file()


### Groups
@click.group()
def dtaas():
    """all commands to help with Digital Twins as a Service"""
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
    """
    generate project configuration files\n
    Creates dtaas.toml, users.server.yml, and users.server.secure.yml\n
    in the target directory. Existing files are left untouched unless --force is set.\n
    """
    try:
        projectPkg.generate_project(output_dir, force)
    except OSError as exc:
        raise click.ClickException(f"Error while generating project: {exc}") from exc
    click.echo("Project files generated successfully")


@dtaas.group()
def admin():
    "administrative commands for DTaaS"
    return


@dtaas.command(name="generate-deployment")
@click.option(
    "--type",
    "deploy_type",
    required=True,
    type=click.Choice(sorted(DEPLOY_TYPES), case_sensitive=False),
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
    _apply_deploy_config(deploy_type, output_dir)
    click.echo(f"Project files for '{deploy_type}' generated successfully")


def _apply_deploy_config(deploy_type, output_dir):
    """Read dtaas.toml and substitute values into generated deployment files."""
    if not _toml_exists():
        click.echo("Note: dtaas.toml not found; template values not substituted.")
        return
    try:
        config = configPkg.Config()
        toml_data, _ = config.get_config()
    except RuntimeError as exc:
        raise click.ClickException(f"Error reading dtaas.toml: {exc}") from exc
    try:
        specs = deployConfigPkg.build_file_specs(deploy_type, toml_data)
        deployConfigPkg.apply_config(output_dir, specs)
    except (OSError, ValueError, TypeError) as exc:
        raise click.ClickException(f"Error substituting config values: {exc}") from exc
    for warning in deployConfigPkg.check_placeholders(output_dir, specs):
        click.echo(warning)


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

    try:
        config_obj = configPkg.Config()
    except RuntimeError as exc:
        raise click.ClickException(str(exc)) from exc

    err = userPkg.add_users(config_obj)
    if err is not None:
        raise click.ClickException("Error while adding users: " + str(err))
    click.echo("Users added successfully")


@user.command()
def delete():
    """
    removes the USERNAME user from DTaaS\n
    Specify the users in dtaas.toml [users].delete\n
    """

    try:
        config_obj = configPkg.Config()
    except RuntimeError as exc:
        raise click.ClickException(str(exc)) from exc

    err = userPkg.delete_user(config_obj)
    if err is not None:
        raise click.ClickException("Error while deleting users: " + str(err))
    click.echo("User deleted successfully")
