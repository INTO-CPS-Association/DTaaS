"""Project commands, project generate."""

from pathlib import Path
import click
import dtaas_services
from ..pkg.template import generate_project_structure


@click.command()
@click.option(
    "--path",
    default=None,
    help="Directory to generate project structure (defaults to current directory)",
)
@click.option(
    "--force",
    is_flag=True,
    default=False,
    help=(
        "Overwrite existing compose files and package files under config/. "
        "services.env, credentials.csv and gitlab_oauth.json are never overwritten."
    ),
)
def generate(path, force):
    """
    Generate project structure with template config, data directories, and compose file.
    This creates the necessary directory structure and copies template files
    from the installed package so you can run dtaas-services commands.
    Example:
        dtaas-services project generate
        dtaas-services project generate --path /path/to/project
        dtaas-services project generate --force
    """
    if path is None:
        target_dir = Path.cwd()
    else:
        target_dir = Path(path).resolve()

    package_root = Path(dtaas_services.__file__).parent

    success, message = generate_project_structure(target_dir, package_root, force)

    if not success:
        raise click.ClickException(message)

    click.echo(message)
