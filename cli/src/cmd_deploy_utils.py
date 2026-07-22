"""Deployment-generation helpers used by cmd.py.

This module holds the help-text formatter and the dtaas.toml substitution/
certificate-copy orchestration used by 'deployment generate' and provisioning
user workspace files ahead of 'platform install'.
"""

import inspect as _inspect
import click
from .pkg import project as projectPkg
from .pkg import certs as certsPkg
from .pkg import deploy_config as deployConfigPkg
from .pkg import utils as utilsPkg
from .pkg.users_utils import is_valid_username


class VerticalChoicesCommand(click.Command):
    """Format Choice options as a vertical list in help text."""

    def format_help_text(self, ctx, formatter):
        if self.help:
            text = _inspect.cleandoc(self.help).partition("\f")[0]
            formatter.write_paragraph()
            with formatter.indentation():
                formatter.write_text(text)

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
    spec = certsPkg.CertsCopySpec(deploy_type, _certs_src(toml_data), force)
    _copy_deploy_certs(output_dir, spec)


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


def _copy_deploy_certs(output_dir, spec):
    """Copy TLS certificates into output_dir/certs for secure deployments."""
    try:
        note = certsPkg.copy_certs(output_dir, spec)
    except OSError as exc:
        raise click.ClickException(f"Error copying certificates: {exc}") from exc
    if note:
        click.echo(note)


def _valid_usernames(users):
    """Safe usernames from a [[users]] list, dropping malformed/unsafe records.

    Filtering through is_valid_username keeps a hand-edited dtaas.toml from
    steering directory creation outside files/ (e.g. a '..' username).
    """
    if not isinstance(users, list):
        return []
    candidates = [u.get("username") for u in users if isinstance(u, dict)]
    return [name for name in candidates if is_valid_username(name)]


def _create_user_dirs(output_dir, toml_data):
    """Create per-user directories from the [[users]] records in dtaas.toml."""
    usernames = _valid_usernames((toml_data or {}).get("users", []))
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
