"""The 'deployment' noun group: generate the on-disk deployment artifacts.

'deployment generate' produces every generated artifact -- the scenario-
specific compose tree, the user-management overlay templates, and the workspace
skeleton substituting values from dtaas.toml (see DTaaS-CLI-Design.md).
"""

import click
from .pkg import project as projectPkg
from .pkg.project import DEPLOY_TYPES
from .cmd_deploy_utils import VerticalChoicesCommand, apply_deploy_config
from .cmd_options import target_dir_option, force_option


@click.group(name="deployment")
def deployment_group():
    """Generate the deployment files (compose tree, user templates, skeleton).

    Run 'dtaas config generate' and 'dtaas config validate' first: this command
    substitutes values from dtaas.toml into the generated files.
    """


@deployment_group.command(name="generate", cls=VerticalChoicesCommand)
@click.option(
    "--type",
    "deploy_type",
    required=True,
    type=click.Choice(sorted(DEPLOY_TYPES), case_sensitive=False),
    metavar="[...]",
    help="Deployment scenario to generate.",
)
@target_dir_option
@force_option
def generate(deploy_type, output_dir, force):
    """Generate files for a deployment scenario.

    \b
    Examples:
      dtaas deployment generate --type secure-server
      dtaas deployment generate --type localhost --output-dir ./demo
      dtaas deployment generate --type insecure-server --force

    Copies docker-compose.yml and supporting files for the chosen --type, the
    user-management templates, and the workspace skeleton into the target
    directory, substituting values from dtaas.toml when present. dtaas.toml is
    generated separately with 'dtaas config generate'.

    Next: edit generated files if needed, then run 'dtaas platform install'.
    """
    try:
        projectPkg.generate_deploy_project(deploy_type, output_dir, force)
        projectPkg.generate_user_templates(output_dir, force)
    except (ValueError, RuntimeError, OSError) as exc:
        raise click.ClickException(str(exc)) from exc
    apply_deploy_config(deploy_type, output_dir, force)
    projectPkg.set_files_permissions(output_dir)
    click.echo(f"Project files for '{deploy_type}' generated successfully")
