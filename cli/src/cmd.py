"""This file defines all cli entrypoints for DTaaS"""

import click
from .pkg import config as configPkg
from .pkg import users as userPkg
from .pkg import project as projectPkg
from .pkg.project import DEPLOY_TYPES


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
