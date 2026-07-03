"""Helper functions shared by the DTaaS CLI command definitions in cmd.py.

This module holds the user-registry staging logic and the uninstall/
reconcile/update orchestration. See cmd_deploy_utils.py for the
deployment-generation helpers and cmd_user.py for the 'user add'/'user
delete' command bodies.
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
from .pkg.constants import COMPOSE_USERS_YML, REGISTRY_FILE, STATE_FILE
from .pkg.users_utils import validate_usernames
from .pkg import config_update as configUpdatePkg
from .pkg import cert_update as certUpdatePkg
from .pkg import utils as utilsPkg
from .pkg.cert_validate import CertValidationError

NO_INSTALLATION_MESSAGE = "There is no existing DTaaS / Workspace installation"


def _starting_usernames():
    """The [users].starting list from dtaas.toml, or [] when unavailable."""
    try:
        config_obj = configPkg.Config()
    except RuntimeError:
        return []
    users, _ = config_obj.get_users()
    starting = users.get("starting", []) if isinstance(users, dict) else []
    return [str(x) for x in starting] if isinstance(starting, list) else []


def _read_users_csv(csv_file):
    """Parse a users CSV, mapping parse errors to ClickException."""
    try:
        return registryPkg.read_csv_users(csv_file)
    except (OSError, KeyError, ValueError) as exc:
        raise click.ClickException(f"Error importing users file: {exc}") from exc


@dataclass
class UserAddInput:
    """CLI inputs for 'user add': a single USERNAME or a --file import, not both."""

    username: str | None
    csv_file: str | None
    email: str | None
    groups: tuple
    load_balance: bool


def _users_from_args(user_input):
    """Build a one-user {name: details} mapping from CLI arguments.

    Defaults groups to ['additional'] when --group is omitted, matching the CSV
    import path (registry._parse_csv_row) so the two produce identical users.
    """
    if not user_input.email:
        raise click.ClickException("Provide --email when adding a single user.")
    return {
        user_input.username: {
            "email": user_input.email,
            "groups": list(user_input.groups) or ["additional"],
            "load_balance": user_input.load_balance,
        }
    }


def _users_to_add(user_input):
    """Collect the users to add from --file or a single USERNAME argument."""
    if user_input.csv_file:
        return _read_users_csv(user_input.csv_file)
    if user_input.username:
        return _users_from_args(user_input)
    return {}


def _register_users(new_users):
    """Validate and register new users, warning about skipped duplicates."""
    try:
        validate_usernames(new_users)
    except ValueError as exc:
        raise click.ClickException(str(exc)) from exc
    _, skipped = registryPkg.register_new_users(new_users, _starting_usernames())
    for name in skipped:
        click.echo(f"'{name}' already exists, skipping")


def stage_users_for_add(user_input):
    """Merge CLI/CSV users into the registry before provisioning.

    Rejects malformed usernames and, with a warning, skips any already in
    dtaas.toml's starting list or the registry. Raises ClickException on bad
    or missing input: a USERNAME or --file is required, and not both.
    """
    if user_input.username and user_input.csv_file:
        raise click.ClickException("Pass either a USERNAME or --file, not both.")
    if not user_input.username and not user_input.csv_file:
        raise click.ClickException(
            "Provide a USERNAME (e.g. 'dtaas admin user add alice --email "
            "a@x.io') or --file <users.csv> to add users."
        )
    _register_users(_users_to_add(user_input))


def resolve_delete_usernames(usernames, csv_file):
    """Resolve the usernames to delete from positional USERNAMES or --file.

    Only the username column of the CSV is used; email/groups/load_balance are
    ignored for delete. Raises ClickException if both or neither are given.
    """
    if usernames and csv_file:
        raise click.ClickException("Pass either USERNAMES or --file, not both.")
    if csv_file:
        return list(_read_users_csv(csv_file))
    if usernames:
        return list(usernames)
    raise click.ClickException(
        "Provide one or more USERNAMES or --file <users.csv> to delete users."
    )


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
    ("missing", "registered but not provisioned; re-run 'dtaas admin user add'"),
    ("unexpected", "provisioned but not in the registry; investigate"),
    ("drifted", "config changed since provisioning; re-run 'dtaas admin user add'"),
)


def _echo_reconcile(report):
    """Print a drift report, noting when everything is in sync."""
    if not any(report.values()):
        click.echo("In sync: no drift detected.")
        return
    for key, label in _RECONCILE_LABELS:
        for name in report[key]:
            click.echo(f"- {name}: {label}")


def _fix_reconcile():
    """Reprovision missing/drifted registry users (equivalent to 'user add')."""
    run_user_command(
        userPkg.add_users,
        "Reprovisioned missing/drifted users.",
        "Error while fixing drift",
    )


def run_reconcile(output_dir, fix=False):
    """Report drift between dtaas.users.registry.json (desired) and the live
    compose.users.yml services (actual)"""
    registry_users = registryPkg.load_registry(str(Path(output_dir) / REGISTRY_FILE))
    state = statePkg.load_state(str(Path(output_dir) / STATE_FILE))
    compose, err = utilsPkg.import_yaml(str(Path(output_dir) / COMPOSE_USERS_YML))
    if err is not None:
        raise click.ClickException(f"Error reading {COMPOSE_USERS_YML}: {err}")
    services = compose.get("services", {}) if isinstance(compose, dict) else {}
    report = statePkg.find_drift(registry_users, state, services)
    _echo_reconcile(report)
    if fix and (report["missing"] or report["drifted"]):
        _fix_reconcile()


def run_config_update(output_dir, dry_run):
    """Re-apply dtaas.toml config to the installed deployment and report changes."""
    try:
        message = configUpdatePkg.update_config(output_dir, dry_run)
    except (OSError, ValueError, DockerException) as exc:
        raise click.ClickException(str(exc)) from exc
    click.echo(message)


def require_update_flag(certs, config_):
    """Reject an 'admin update' invocation that selects no assets to update."""
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
    """CLI inputs for 'admin update': which assets to refresh and where."""

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
