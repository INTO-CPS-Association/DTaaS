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


_FILE_SERVICES = {
    "config/.env": ("traefik", "client", "libms", "traefik-forward-auth"),
    ".env": ("traefik", "client", "libms", "traefik-forward-auth", "dex"),
    "config/client.js": ("client",),
    "config/env.local.js": ("client",),
    "config/conf.server": ("traefik-forward-auth",),
    "config/dex-config.yaml": ("dex",),
}


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


def _validate(data):
    """Raise ValueError listing every dtaas.toml problem, if any."""
    errors = config_validate.collect_errors(data)
    if errors:
        listed = "\n".join(f"- {err}" for err in errors)
        raise ValueError(f"Invalid dtaas.toml:\n{listed}")


def _services_to_restart(output_dir, changed):
    """Return the present services backed by any changed config file."""
    wanted = set()
    for rel_path in changed:
        wanted.update(_FILE_SERVICES.get(rel_path, ()))
    return sorted(wanted & deploy.compose_services(output_dir))


def _summary(deploy_type, changed, services, head, tail):
    """Build the human-readable result or dry-run preview line."""
    if not changed:
        return f"No configuration changes for '{deploy_type}'; nothing to update."
    parts = [f"{head} {', '.join(changed)}"]
    if services:
        parts.append(f"{tail} {', '.join(services)}")
    return "; ".join(parts) + "."


def update_config(output_dir, dry_run=False):
    """Re-apply dtaas.toml config in place and restart affected services.

    Returns a status (or, with dry_run, a preview) message. Raises
    FileNotFoundError/ValueError for missing or invalid configuration, OSError
    for a missing deployment, and DockerException if a restart fails.
    """
    deploy_type = detect_deploy_type(output_dir)
    data = _load_toml(output_dir)
    _validate(data)
    specs = deploy_config.build_file_specs(deploy_type, data)
    changed = deploy_config.diff_specs(output_dir, specs)
    services = _services_to_restart(output_dir, changed)
    if dry_run:
        return _summary(deploy_type, changed, services, "Would update", "would restart")
    deploy_config.apply_config(output_dir, specs)
    for service in services:
        deploy.restart_service(output_dir, service)
    return _summary(deploy_type, changed, services, "Updated", "restarted")
