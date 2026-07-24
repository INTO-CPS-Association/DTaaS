"""Helper functions shared by the DTaaS CLI command definitions in cmd.py.

This module holds the uninstall/reconcile/update orchestration. See
cmd_deploy_utils.py for the deployment-generation helpers and
cmd_user_utils.py for the user-input resolution/validation shared by
cmd_user.py's 'user add'/'delete'/'pause'/'stop'/'resume' command bodies.
"""

from dataclasses import dataclass
from pathlib import Path
import click
from python_on_whales.exceptions import DockerException
from .pkg import config as configPkg
from .pkg import registry as registryPkg
from .pkg import state as statePkg
from .pkg import deploy as deployPkg
from .pkg import users as userPkg
from .pkg import users_lifecycle as usersLifecyclePkg
from .pkg.constants import COMPOSE_USERS_YML, REGISTRY_FILE, STATE_FILE
from .pkg import config_update as configUpdatePkg
from .pkg import cert_update as certUpdatePkg
from .pkg import utils as utilsPkg
from .pkg.cert_validate import CertValidationError

NO_INSTALLATION_MESSAGE = "There is no existing DTaaS / Workspace installation"


def run_user_command(action, success_msg, error_prefix):
    """Run a user-management action against a fresh Config, mapping errors."""
    try:
        config_obj = configPkg.Config()
    except RuntimeError as exc:
        raise click.ClickException(str(exc)) from exc
    err = action(config_obj)
    if err is not None:
        raise click.ClickException(f"{error_prefix}: {err}")
    click.echo(success_msg)


def confirm_remove_user_files(remove_user_files, yes):
    """Prompt before destructive file removal unless --yes is given."""
    if remove_user_files and not yes:
        click.confirm(
            "This permanently deletes all per-user workspace files. Continue?",
            abort=True,
        )


def _uninstall_existing(output_dir, remove_user_files):
    """Tear down a present installation and report what happened."""
    message = deployPkg.uninstall(output_dir, remove_user_files)
    if message:
        click.echo(message)
    click.echo("Deployment uninstalled successfully")


def _uninstall_absent(output_dir, remove_user_files):
    """Report a missing installation, still clearing user files if asked."""
    click.echo(NO_INSTALLATION_MESSAGE)
    if remove_user_files:
        deployPkg.require_compose_file(output_dir)
        click.echo(deployPkg.delete_user_files(output_dir))


def run_uninstall(output_dir, remove_user_files):
    """Tear the deployment down with 'docker compose down', or report it absent."""
    try:
        if deployPkg.installation_present(output_dir):
            _uninstall_existing(output_dir, remove_user_files)
        else:
            _uninstall_absent(output_dir, remove_user_files)
    except (OSError, DockerException) as exc:
        raise click.ClickException(str(exc)) from exc


_RECONCILE_LABELS = (
    ("missing", "registered but not provisioned; re-run 'dtaas user add'"),
    ("unexpected", "provisioned but not in the registry; investigate"),
    ("drifted", "config changed since provisioning; re-run 'dtaas user add'"),
)


def _echo_membership_drift(report):
    """Print each missing/unexpected/drifted username with its explanation."""
    for key, label in _RECONCILE_LABELS:
        for name in report[key]:
            click.echo(f"- {name}: {label}")


def _echo_status_drift(status_drift):
    """Print each (user, desired, actual) desired-status mismatch."""
    for name, desired, actual in status_drift:
        click.echo(f"- {name}: desired '{desired}' but container is '{actual}'")


def _echo_reconcile(report, status_drift):
    """Print membership + desired-status drift, noting when everything is in sync."""
    if not any(report.values()) and not status_drift:
        click.echo("In sync: no drift detected.")
        return
    _echo_membership_drift(report)
    _echo_status_drift(status_drift)


def _reprovision_missing():
    """Reprovision missing/drifted registry users (equivalent to 'user add')."""
    run_user_command(
        userPkg.add_users,
        "Reprovisioned missing/drifted users.",
        "Error while fixing drift",
    )


def _fix_reconcile(report, status_drift):
    """Reprovision missing/drifted users, then enforce each user's desired_status."""
    if report["missing"] or report["drifted"]:
        _reprovision_missing()
    if status_drift:
        usersLifecyclePkg.enforce_desired_status()
        click.echo("Enforced desired status on drifted users.")


def run_reconcile(output_dir, fix=False):
    """Report drift between dtaas.users.registry.json (desired) and what is
    actually running, then optionally fix it.

    Two kinds of drift are reported: membership drift (registry vs the live
    compose.users.yml services) and desired-status drift (a provisioned user
    whose live container state does not match its registry desired_status).
    With fix, missing/drifted users are reprovisioned and every provisioned
    user is paused/stopped/started to match its desired_status.
    """
    registry_users = registryPkg.load_registry(str(Path(output_dir) / REGISTRY_FILE))
    state = statePkg.load_state(str(Path(output_dir) / STATE_FILE))
    compose, err = utilsPkg.import_yaml(str(Path(output_dir) / COMPOSE_USERS_YML))
    if err is not None:
        raise click.ClickException(f"Error reading {COMPOSE_USERS_YML}: {err}")
    services = compose.get("services", {}) if isinstance(compose, dict) else {}
    report = statePkg.find_drift(registry_users, state, services)
    status_drift = usersLifecyclePkg.desired_status_drift()
    _echo_reconcile(report, status_drift)
    if fix:
        _fix_reconcile(report, status_drift)


def run_config_update(output_dir, dry_run):
    """Re-apply dtaas.toml config to the installed deployment and report changes."""
    try:
        message = configUpdatePkg.update_config(output_dir, dry_run)
    except (OSError, ValueError, DockerException) as exc:
        raise click.ClickException(str(exc)) from exc
    click.echo(message)


def require_update_flag(certs, config_):
    """Reject a 'platform update' invocation that selects no assets to update."""
    if not (certs or config_):
        raise click.ClickException("Nothing to update; pass --certs or --config.")


def run_cert_update(output_dir):
    """Refresh and reload the deployment's TLS certificates."""
    try:
        message = certUpdatePkg.update_certs(output_dir)
    except (CertValidationError, OSError, DockerException, RuntimeError) as exc:
        raise click.ClickException(str(exc)) from exc
    click.echo(message)


@dataclass
class UpdateOptions:
    """CLI inputs for 'platform update': which assets to refresh and where."""

    certs: bool
    config_: bool
    dry_run: bool
    output_dir: str


def run_update(options):
    """Refresh certs and/or re-apply config, per the requested UpdateOptions."""
    require_update_flag(options.certs, options.config_)
    if options.certs:
        run_cert_update(options.output_dir)
    if options.config_:
        run_config_update(options.output_dir, options.dry_run)
