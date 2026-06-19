"""This file defines all cli entrypoints for DTaaS"""

from pathlib import Path
import click
from .pkg import config as configPkg
from .pkg import users as userPkg
from .pkg import project as projectPkg
from .pkg import deploy_config as deployConfigPkg
from .pkg import utils as utilsPkg
from .pkg.project import DEPLOY_TYPES


class VerticalChoicesCommand(click.Command):
    """Format Choice options as a vertical list in help text."""

    def format_help_text(self, ctx, formatter):
        if self.help:
            formatter.write_paragraph()
            with formatter.indentation():
                formatter.write_text(self.help)

    def format_options(self, ctx, formatter):
        rows = []
        for param in self.get_params(ctx):
            rows.extend(self._param_rows(param, ctx))
        if rows:
            with formatter.section("Options"):
                formatter.write_dl(rows)

    @staticmethod
    def _param_rows(param, ctx):
        """Return the help rows for a single param (empty list if hidden)."""
        rv = param.get_help_record(ctx)
        if rv is None:
            return []
        if not isinstance(param.type, click.Choice):
            return [rv]
        prefix = f"{rv[1]}. " if rv[1] else ""
        rows = [(rv[0], f"{prefix}One of:")]
        rows.extend(("", choice) for choice in param.type.choices)
        return rows


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
    projectPkg.set_files_permissions(output_dir)
    click.echo(f"Project files for '{deploy_type}' generated successfully")


def _find_toml(output_dir):
    """Return path to dtaas.toml, checking output_dir first then cwd, or None."""
    for candidate in [Path(output_dir) / "dtaas.toml", Path("dtaas.toml")]:
        if candidate.is_file():
            return candidate
    return None


def _apply_deploy_config(deploy_type, output_dir):
    """Read dtaas.toml and substitute values into generated deployment files."""
    toml_path = _find_toml(output_dir)
    if toml_path is None:
        click.echo("Note: dtaas.toml not found; template values not substituted.")
        return
    toml_data, err = utilsPkg.import_toml(str(toml_path))
    if err is not None:
        raise click.ClickException(f"Error reading dtaas.toml: {err}")
    _substitute_config(deploy_type, output_dir, toml_data)
    _create_user_dirs(output_dir, toml_data)


def _substitute_config(deploy_type, output_dir, toml_data):
    """Build file specs from toml and substitute them into the generated files."""
    try:
        specs = deployConfigPkg.build_file_specs(deploy_type, toml_data)
        deployConfigPkg.apply_config(output_dir, specs)
    except (OSError, ValueError, TypeError) as exc:
        raise click.ClickException(f"Error substituting config values: {exc}") from exc
    for warning in deployConfigPkg.check_placeholders(output_dir, specs):
        click.echo(warning)


def _create_user_dirs(output_dir, toml_data):
    """Create per-user directories from the [users].add list in dtaas.toml."""
    users = toml_data.get("users", {}) if toml_data else {}
    usernames = users.get("add", []) if isinstance(users, dict) else []
    if not usernames:
        return
    try:
        projectPkg.create_user_dirs(output_dir, usernames)
    except OSError as exc:
        raise click.ClickException(f"Error creating user directories: {exc}") from exc


@admin.group()
def user():
    """user management commands"""
    return


def _run_user_command(action, success_msg, error_prefix):
    try:
        config_obj = configPkg.Config()
    except RuntimeError as exc:
        raise click.ClickException(str(exc)) from exc
    err = action(config_obj)
    if err is not None:
        raise click.ClickException(f"{error_prefix}: {err}")
    click.echo(success_msg)


#### user group commands
@user.command()
def add():
    """
    add a list of users to DTaaS at once\n
    Specify the list in dtaas.toml [users].add\n
    """
    _run_user_command(
        userPkg.add_users, "Users added successfully", "Error while adding users"
    )


@user.command()
def delete():
    """
    removes the USERNAME user from DTaaS\n
    Specify the users in dtaas.toml [users].delete\n
    """
    _run_user_command(
        userPkg.delete_user, "User deleted successfully", "Error while deleting users"
    )
