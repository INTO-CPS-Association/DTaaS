"""In-place TLS certificate refresh for an installed deployment."""

import os
import shutil
import time
from pathlib import Path
from . import utils
from . import deploy
from .certs import (
    find_latest_cert,
    secure_private_key,
    CERT_FILES,
    CERT_CHAIN_NAME,
    PRIVATE_KEY_NAME,
)
from .cert_validate import validate_cert_pair, CertValidationError

CERTS_DIR = "certs"
TRAEFIK_SERVICE = "traefik"
STAGE_SUFFIX = ".new"
BACKUP_SUFFIX = ".bak"
LIVENESS_RETRIES = 10
LIVENESS_DELAY_S = 0.5


def _read_toml(output_dir):
    """Load dtaas.toml near *output_dir*, raising OSError when unusable."""
    toml_path = utils.find_toml(output_dir)
    if toml_path is None:
        raise OSError("No 'dtaas.toml' found; cannot resolve certs-src.")
    toml_data, err = utils.import_toml(str(toml_path))
    if err is not None:
        raise OSError(f"Error reading dtaas.toml: {err}")
    return toml_data


def _resolve_source(output_dir):
    """Return the certs-src directory from dtaas.toml, raising on misconfig."""
    certs_src = utils.resolve_certs_src(_read_toml(output_dir))
    if not certs_src:
        raise OSError("'[common.security].certs-src' is not set in dtaas.toml.")
    source = Path(certs_src)
    if not source.is_dir():
        raise OSError(f"certs-src directory not found: {source}")
    return source


def _discard(staged):
    """Delete any staged certificate files (cleanup on failure)."""
    for path in staged.values():
        path.unlink(missing_ok=True)


def _stage_pair(source, certs_dir):
    """Copy the newest fullchain/privkey from *source* into staged files.

    Returns a {filename: staged_path} mapping. Raises OSError (after removing
    anything already staged) when either certificate is missing from *source*.
    """
    staged = {}
    for name in CERT_FILES:
        latest = find_latest_cert(source, name[: -len(".pem")])
        if latest is None:
            _discard(staged)
            raise OSError(f"'{name}' not found in certs-src ({source}).")
        dest = certs_dir / (name + STAGE_SUFFIX)
        shutil.copy2(latest, dest)
        if name == PRIVATE_KEY_NAME:
            secure_private_key(dest, warn=False)
        staged[name] = dest
    return staged


def _validate_staged(staged):
    """Validate the staged pair, discarding it and re-raising on failure."""
    try:
        validate_cert_pair(staged[CERT_CHAIN_NAME], staged[PRIVATE_KEY_NAME])
    except CertValidationError:
        _discard(staged)
        raise


def _backup_live(staged, certs_dir):
    """Copy any existing live certificates aside so a failed swap can be undone."""
    backups = {}
    for name in staged:
        live = certs_dir / name
        if live.exists():
            backup = certs_dir / (name + BACKUP_SUFFIX)
            shutil.copy2(live, backup)
            backups[name] = backup
    return backups


def _restore_backups(backups, certs_dir):
    """Move the backed-up certificates back over the live files."""
    for name, backup in backups.items():
        os.replace(backup, certs_dir / name)


def _drop_backups(backups):
    """Delete the backup copies once the swap has fully succeeded."""
    for backup in backups.values():
        backup.unlink(missing_ok=True)


def _activate(staged, certs_dir):
    """Swap the staged pair in, rolling back if either file cannot be replaced.

    The two files cannot be replaced in a single atomic step, so the live pair
    is backed up first. If any replace fails (for example a file is still
    locked on Windows), the originals are restored, so the deployment is never
    left with a mismatched fullchain/privkey pair.
    """
    backups = _backup_live(staged, certs_dir)
    try:
        for name, staged_path in staged.items():
            os.replace(staged_path, certs_dir / name)
    except OSError:
        _restore_backups(backups, certs_dir)
        _discard(staged)
        raise
    _drop_backups(backups)
    secure_private_key(certs_dir / PRIVATE_KEY_NAME)


def _wait_until_running(output_dir, service):
    """Poll until *service* reports running, raising if it never comes up.

    'docker compose up -d' returns as soon as a container is started, so a
    container that exits immediately (Traefik rejecting the new certificates)
    would otherwise be reported as a successful update.
    """
    for _ in range(LIVENESS_RETRIES):
        if deploy.service_running(output_dir, service):
            return
        time.sleep(LIVENESS_DELAY_S)
    raise RuntimeError(
        f"'{service}' is not running after the certificate update; the new "
        "certificates may have been rejected. Check the service logs."
    )


def _swap_and_reload(output_dir, staged, certs_dir):
    """Stop Traefik, swap the validated pair in, then bring Traefik back up.

    Traefik is stopped first so nothing holds the certificate files open while
    they are replaced. It is always restarted, even when activation fails, so
    the deployment is not left down; the restart is then checked for liveness.
    """
    deploy.stop_service(output_dir, TRAEFIK_SERVICE)
    try:
        _activate(staged, certs_dir)
    finally:
        deploy.restart_service(output_dir, TRAEFIK_SERVICE)
    _wait_until_running(output_dir, TRAEFIK_SERVICE)


def update_certs(output_dir):
    """Validate and swap in the newest certificates, then reload Traefik.

    Returns a status message. On any failure it raises OSError,
    CertValidationError, DockerException, or RuntimeError without leaving the
    deployment with a mismatched certificate pair.
    """
    deploy.require_compose_file(output_dir)
    source = _resolve_source(output_dir)
    certs_dir = Path(output_dir) / CERTS_DIR
    certs_dir.mkdir(parents=True, exist_ok=True)
    staged = _stage_pair(source, certs_dir)
    _validate_staged(staged)
    _swap_and_reload(output_dir, staged, certs_dir)
    return f"TLS certificates updated in {certs_dir}; '{TRAEFIK_SERVICE}' reloaded."
