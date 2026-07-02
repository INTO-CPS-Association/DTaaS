"""Helper functions shared by the DTaaS CLI command definitions in cmd.py.

This module holds everything that is not a Click command itself: the help-text
formatter, the deployment-config orchestration used by generate-deployment,
the user-command wrapper, and the destructive-action confirmation prompt.
"""

from pathlib import Path
import click
from python_on_whales.exceptions import DockerException
from .pkg import config as configPkg
from .pkg import registry as registryPkg
from .pkg import project as projectPkg
from .pkg import state as statePkg
from .pkg.constants import COMPOSE_USERS_YML
from .pkg.users_utils import validate_usernames
from .pkg import certs as certsPkg
from .pkg import deploy_config as deployConfigPkg
from .pkg import config_update as configUpdatePkg
from .pkg import cert_update as certUpdatePkg
from .pkg import utils as utilsPkg
from .pkg.cert_validate import CertValidationError


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


def _find_toml(output_dir):
    """Return path to dtaas.toml, checking output_dir first then cwd, or None."""
    return utilsPkg.find_toml(output_dir)


def apply_deploy_config(deploy_type, output_dir, force=False):
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
    _copy_deploy_certs(deploy_type, output_dir, toml_data, force)


def _substitute_config(deploy_type, output_dir, toml_data):
    """Build file specs from toml and substitute them into the generated files."""
    try:
        specs = deployConfigPkg.build_file_specs(deploy_type, toml_data)
        deployConfigPkg.apply_config(output_dir, specs)
    except (OSError, ValueError, TypeError) as exc:
        raise click.ClickException(f"Error substituting config values: {exc}") from exc
    for warning in deployConfigPkg.check_placeholders(output_dir, specs):
        click.echo(warning)


def _certs_src(toml_data):
    """Resolve [common.security].certs-src from dtaas.toml, or '' if unset."""
    return utilsPkg.resolve_certs_src(toml_data)


def _copy_deploy_certs(deploy_type, output_dir, toml_data, force):
    """Copy TLS certificates into output_dir/certs for secure deployments."""
    try:
        note = certsPkg.copy_certs(
            deploy_type, output_dir, _certs_src(toml_data), force
        )
    except OSError as exc:
        raise click.ClickException(f"Error copying certificates: {exc}") from exc
    if note:
        click.echo(note)


def _create_user_dirs(output_dir, toml_data):
    """Create per-user directories from the [users].starting list in dtaas.toml."""
    users = toml_data.get("users", {}) if toml_data else {}
    usernames = users.get("starting", []) if isinstance(users, dict) else []
    if not usernames:
        return
    try:
        projectPkg.create_user_dirs(output_dir, usernames)
    except OSError as exc:
        raise click.ClickException(f"Error creating user directories: {exc}") from exc


def provision_user_files(output_dir):
    """Ensure per-user workspace directories exist and are owned 1000:100."""
    toml_path = _find_toml(output_dir)
    if toml_path is None:
        return
    toml_data, err = utilsPkg.import_toml(str(toml_path))
    if err is not None:
        raise click.ClickException(f"Error reading dtaas.toml: {err}")
    _create_user_dirs(output_dir, toml_data)
    projectPkg.set_files_permissions(output_dir)


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


def _users_from_args(username, email, groups, load_balance):
    """Build a one-user {name: details} mapping from CLI arguments.

    Defaults groups to ['additional'] when --group is omitted, matching the CSV
    import path (registry._parse_csv_row) so the two produce identical users.
    """
    if not email:
        raise click.ClickException("Provide --email when adding a single user.")
    return {
        username: {
            "email": email,
            "groups": list(groups) or ["additional"],
            "load_balance": load_balance,
        }
    }


def _users_to_add(username, csv_file, email, groups, load_balance):
    """Collect the users to add from --file or a single USERNAME argument."""
    if csv_file:
        return _read_users_csv(csv_file)
    if username:
        return _users_from_args(username, email, groups, load_balance)
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


def stage_users_for_add(username, csv_file, email, groups, load_balance):
    """Merge CLI/CSV users into the registry before provisioning.

    Rejects malformed usernames and, with a warning, skips any already in
    dtaas.toml's starting list or the registry. Raises ClickException on bad
    input. A bare 'user add' (no USERNAME, no --file) is a no-op here and just
    reprovisions the existing registry.
    """
    if username and csv_file:
        raise click.ClickException("Pass either a USERNAME or --file, not both.")
    new_users = _users_to_add(username, csv_file, email, groups, load_balance)
    if new_users:
        _register_users(new_users)


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


_RECONCILE_LABELS = (
    ("drifted", "config changed since provisioning; re-run 'dtaas admin user add'"),
    ("untracked", "provisioned but not recorded in the state cache"),
    ("orphaned", "in the state cache but no longer provisioned"),
)


def _echo_reconcile(report):
    """Print a drift report, noting when everything is in sync."""
    if not any(report.values()):
        click.echo("In sync: no drift detected.")
        return
    for key, label in _RECONCILE_LABELS:
        for name in report[key]:
            click.echo(f"- {name}: {label}")


def run_reconcile(output_dir):
    """Report drift between .dtaas.state.json and compose.users.yml."""
    state = statePkg.load_state(str(Path(output_dir) / statePkg.STATE_FILE))
    compose, err = utilsPkg.import_yaml(str(Path(output_dir) / COMPOSE_USERS_YML))
    if err is not None:
        raise click.ClickException(f"Error reading {COMPOSE_USERS_YML}: {err}")
    services = compose.get("services", {}) if isinstance(compose, dict) else {}
    _echo_reconcile(statePkg.find_drift(state, services))


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
