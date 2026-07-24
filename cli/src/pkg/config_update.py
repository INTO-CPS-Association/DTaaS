"""Re-apply dtaas.toml configuration to an installed deployment in place."""

from pathlib import Path
from . import utils
from . import deploy
from . import deploy_config
from . import config_validate


_SERVICE_MARKERS = (
    ("dex", "workspace-localhost"),
    ("keycloak", "workspace-secure-server"),
    ("gitlab", "secure-server-gitlab"),
)


def _server_variant(output_dir):
    """secure-server when tls.yml is present, otherwise insecure-server."""
    tls = Path(output_dir) / "config" / "tls.yml"
    return "secure-server" if tls.is_file() else "insecure-server"


def detect_deploy_type(output_dir):
    """Infer the installed deployment type from its compose service names.

    Raises OSError when no compose file is present.
    """
    services = deploy.compose_services(output_dir)
    for marker, deploy_type in _SERVICE_MARKERS:
        if marker in services:
            return deploy_type
    if "libms" in services:
        return _server_variant(output_dir)
    return "localhost"


def _load_toml(output_dir):
    """Load dtaas.toml near *output_dir*, raising on absence or parse error."""
    toml_path = utils.find_toml(output_dir)
    if toml_path is None:
        raise FileNotFoundError(
            f"dtaas.toml not found in '{output_dir}' or the current directory"
        )
    data, err = utils.import_toml(str(toml_path))
    if err is not None:
        raise ValueError(f"Error reading dtaas.toml: {err}")
    return data


def _validate(data, deploy_type):
    """Raise ValueError listing every dtaas.toml problem for *deploy_type*, if any.

    Scoped to the installed deployment type so an unrelated leftover section
    (e.g. a [workspace-secure-server] block in a secure-server deployment)
    does not block the update.
    """
    errors = config_validate.collect_errors(data, deploy_type)
    if errors:
        listed = "\n".join(f"- {err}" for err in errors)
        raise ValueError(f"Invalid dtaas.toml:\n{listed}")


_SECRETS_HINT = (
    "Some secrets are still unset. Create the OAuth/OIDC application in your "
    "GitLab/Keycloak, copy the client id and secret into the matching dtaas.toml "
    "section, then re-run 'dtaas platform update --config'."
)


def _summary(deploy_type, changed, dry_run):
    """Build the human-readable result or dry-run preview."""
    if not changed:
        return f"No configuration changes for '{deploy_type}'; nothing to update."
    if dry_run:
        return f"Would update {', '.join(changed)}; would restart all services."
    return f"Updated {', '.join(changed)}; restarted all services."


def update_config(output_dir, dry_run=False):
    """Re-apply dtaas.toml config in place and restart the whole deployment.

    A config change can affect any service (shared .env, routing, mounted
    files), so when anything changes every compose service is recreated rather
    than guessing which ones are affected. After applying, any secrets still
    left as template placeholders (e.g. an OIDC client id not yet filled in) are
    reported, since those need a second pass once the OIDC app exists.

    Returns a status (or, with dry_run, a preview) message. Raises
    FileNotFoundError/ValueError for missing or invalid configuration, OSError
    for a missing deployment, and DockerException if the restart fails.
    """
    deploy_type = detect_deploy_type(output_dir)
    data = _load_toml(output_dir)
    _validate(data, deploy_type)
    specs = deploy_config.build_file_specs(deploy_type, data)
    changed = deploy_config.diff_specs(output_dir, specs)
    if dry_run:
        return _summary(deploy_type, changed, dry_run=True)
    deploy_config.apply_config(output_dir, specs)
    if changed:
        deploy.restart_all(output_dir)
    warnings = deploy_config.check_placeholders(output_dir, specs)
    base = _summary(deploy_type, changed, dry_run=False)
    if warnings:
        return "\n".join([base, *warnings, _SECRETS_HINT])
    return base
