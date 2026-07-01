"""TLS certificate placement for generated secure deployments."""

import os
import shutil
from pathlib import Path

import click

# Deploy types that terminate TLS and reference certificates from certs/.
TLS_DEPLOY_TYPES = {
    "secure-server",
    "secure-server-gitlab",
    "workspace-secure-server",
}

# Certificate files expected by config/tls.yml.
CERT_CHAIN_NAME = "fullchain.pem"
PRIVATE_KEY_NAME = "privkey.pem"
CERT_FILES = (CERT_CHAIN_NAME, PRIVATE_KEY_NAME)


def find_latest_cert(src_dir, prefix):
    """Return the newest '{prefix}.pem' / '{prefix}<N>.pem' file, or None.

    Let's Encrypt/Certbot archive directories hold numbered certificates
    (e.g. fullchain1.pem, fullchain2.pem); the newest by mtime is chosen.
    """
    candidates = [
        p
        for p in src_dir.glob(f"{prefix}*.pem")
        if p.name == f"{prefix}.pem"
        or (p.name.startswith(prefix) and p.name[len(prefix) : -4].isdigit())
    ]
    if not candidates:
        return None
    return max(candidates, key=lambda p: p.stat().st_mtime)


def _restrict_key_mode(key_path):
    """Apply 0600 to the key, ignoring a chmod failure."""
    try:
        key_path.chmod(0o600)
    except OSError:
        pass


def _warn_unenforceable_key():
    """Tell the operator the key's permissions cannot be enforced here."""
    click.echo(
        "Warning: private-key file permissions cannot be enforced on this "
        "platform; restrict access to the deployment directory manually.",
        err=True,
    )


def secure_private_key(key_path, warn=True):
    """Restrict the private key to 0600 on POSIX.

    POSIX file modes do not protect the key on Windows, where a warning is
    emitted instead. *warn* is set False when locking the short-lived staging
    copy, so the operator is warned only once per update.
    """
    if not key_path.exists():
        return
    if os.name == "posix":
        _restrict_key_mode(key_path)
    elif warn:
        _warn_unenforceable_key()


def _cert_copy_message(certs_dir, copied, missing):
    """Build an informative note describing the certificate copy outcome."""
    parts = []
    if copied:
        parts.append(f"TLS certificates copied to {certs_dir}: {', '.join(copied)}.")
    if missing:
        parts.append(
            "Note: certificate(s) not found in certs-src: " + ", ".join(missing) + "."
        )
    if not parts:
        parts.append(f"TLS certificates already present in {certs_dir}; skipping.")
    return "\n".join(parts)


def _copy_cert_pair(src, certs_dir, force):
    """Copy the latest fullchain/privkey from src into certs_dir.

    Existing files are skipped unless force is True. Returns a status note.
    Raises OSError on copy failure.
    """
    copied, missing = [], []
    for name in CERT_FILES:
        latest = find_latest_cert(src, name[: -len(".pem")])
        if latest is None:
            missing.append(name)
            continue
        dest = certs_dir / name
        if dest.exists() and not force:
            continue
        shutil.copy2(latest, dest)
        copied.append(name)
    secure_private_key(certs_dir / PRIVATE_KEY_NAME)
    return _cert_copy_message(certs_dir, copied, missing)


def copy_certs(deploy_type, dest_dir, certs_src, force=False):
    """Copy TLS certificates into dest_dir/certs for a secure deployment.

    Returns an informative note, or None when nothing applies (non-TLS deploy).
    Skips gracefully with a note when no source is configured or the source
    directory is missing. Raises OSError only on an actual copy failure.
    """
    if deploy_type not in TLS_DEPLOY_TYPES:
        return None
    if not certs_src:
        return "Note: certs-src not set in dtaas.toml; TLS certificates not copied."
    src = Path(certs_src)
    if not src.is_dir():
        return f"Note: certs-src not found ({src}); TLS certificates not copied."
    certs_dir = Path(dest_dir) / "certs"
    certs_dir.mkdir(parents=True, exist_ok=True)
    return _copy_cert_pair(src, certs_dir, force)
