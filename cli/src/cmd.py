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


class VerticalChoicesCommand(click.Command):
    """Format Choice options as a vertical list in help text."""

    def format_help_text(self, ctx, formatter):
        if self.help:
            formatter.write_paragraph()
            with formatter.indentation():
                formatter.write_text(self.help)

    @staticmethod
    def _make_opt_entry(param, rv):
        if not isinstance(param.type, click.Choice):
            return rv
        choices_str = "\n          ".join(param.type.choices)
        prefix = f"{rv[1]}. " if rv[1] else ""
        return (rv[0], f"{prefix}One of:\n          {choices_str}")

    def format_options(self, ctx, formatter):
        opts = []
        for param in self.get_params(ctx):
            rv = param.get_help_record(ctx)
            if rv is not None:
                opts.append(self._make_opt_entry(param, rv))
        if opts:
            with formatter.section("Options"):
                formatter.write_dl(opts)


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
