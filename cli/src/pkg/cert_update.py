"""In-place TLS certificate refresh for an installed deployment."""

import os
import shutil
from pathlib import Path
from . import utils
from . import deploy
from .certs import _find_latest_cert, _secure_private_key, CERT_FILES, PRIVATE_KEY_NAME
from .cert_validate import validate_cert_pair, CertValidationError

CERTS_DIR = "certs"
TRAEFIK_SERVICE = "traefik"
STAGE_SUFFIX = ".new"


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
        latest = _find_latest_cert(source, name[: -len(".pem")])
        if latest is None:
            _discard(staged)
            raise OSError(f"'{name}' not found in certs-src ({source}).")
        dest = certs_dir / (name + STAGE_SUFFIX)
        shutil.copy2(latest, dest)
        staged[name] = dest
    return staged


def _validate_staged(staged):
    """Validate the staged pair, discarding it and re-raising on failure."""
    try:
        validate_cert_pair(staged["fullchain.pem"], staged["privkey.pem"])
    except CertValidationError:
        _discard(staged)
        raise


def _activate(staged, certs_dir):
    """Atomically move staged files into place and lock down the private key."""
    for name, staged_path in staged.items():
        os.replace(staged_path, certs_dir / name)
    _secure_private_key(certs_dir / PRIVATE_KEY_NAME)


def update_certs(output_dir):
    """Validate and swap in the newest certificates, then reload Traefik.

    Returns a status message. On any failure it raises OSError,
    CertValidationError, or DockerException without replacing the live
    certificates.
    """
    deploy.require_compose_file(output_dir)
    source = _resolve_source(output_dir)
    certs_dir = Path(output_dir) / CERTS_DIR
    certs_dir.mkdir(parents=True, exist_ok=True)
    staged = _stage_pair(source, certs_dir)
    _validate_staged(staged)
    _activate(staged, certs_dir)
    deploy.restart_service(output_dir, TRAEFIK_SERVICE)
    return f"TLS certificates updated in {certs_dir}; '{TRAEFIK_SERVICE}' reloaded."
