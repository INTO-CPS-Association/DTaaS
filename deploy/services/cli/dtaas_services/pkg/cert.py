"""TLS certificate management for DTaaS services"""

import shutil
import platform
from dataclasses import dataclass
from pathlib import Path
from typing import Tuple
from .config import Config
from .utils import is_ci


@dataclass
class CertPermissionContext:
    """Context for certificate permission operations."""

    service_name: str
    cert_path: Path
    uid: int
    gid: int | None = None
    mode: int = 0o600


def _create_dummy_cert_file(cert_path: Path) -> bool:
    """Create a dummy self-signed certificate for testing/CI (internal use).

    Args:
        cert_path: Path where certificate should be created

    Returns:
        True if successful, False otherwise
    """
    try:
        cert_path.parent.mkdir(parents=True, exist_ok=True)
        # Dummy certificate for testing only, not a real secret
        cert_path.write_text("""-----BEGIN CERTIFICATE-----
MIICpDCCAYwCCQC0kWW3fOkRgzANBgkqhkiG9w0BAQsFADAUMRIwEAYDVQQDDAls
b2NhbGhvc3QwHhcNMjQwMTAxMDAwMDAwWhcNMjUwMTAxMDAwMDAwWjAUMRIwEAYD
VQQDDAlsb2NhbGhvc3QwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDI
-----END CERTIFICATE-----
""")
        return True
    except (IOError, OSError):
        return False


def _find_latest_cert(certs_dir: Path, prefix: str) -> Path | None:
    """Find the latest certificate file for a given prefix.

    Only matches files named exactly '{prefix}.pem'',
    not files like '{prefix}-service.pem'.
    """
    candidates = [
        p
        for p in certs_dir.glob(f"{prefix}*.pem")
        if p.name == f"{prefix}.pem"
        or (p.name.startswith(f"{prefix}") and p.name[len(prefix) : -4].isdigit())
    ]
    if not candidates:
        return None
    return max(candidates, key=lambda p: p.stat().st_mtime)


def _is_target_cert(cert_path: Path, target: Path) -> bool:
    """Check if certificate is the target certificate.

    Args:
        cert_path: Path to check
        target: Target certificate path

    Returns:
        True if cert_path is the target
    """
    return cert_path.resolve() == target.resolve()


def _matches_cert_pattern(cert_name: str, prefix: str) -> bool:
    """Check if certificate name matches the pattern for removal.

    Matches '{prefix}.pem' or '{prefix}[0-9].pem', but not '{prefix}-service.pem'.

    Args:
        cert_name: Certificate filename
        prefix: Certificate prefix

    Returns:
        True if matches pattern
    """
    if cert_name == f"{prefix}.pem":
        return True
    if cert_name.startswith(prefix) and cert_name[len(prefix) : -4].isdigit():
        return True
    return False


def _remove_remaining_certs(certs_dir: Path, prefix: str, target: Path) -> None:
    """Remove all cert files with the given prefix except the target.

    Only matches files named exactly '{prefix}.pem' or '{prefix}[0-9].pem',
    not files like '{prefix}-service.pem'.
    """
    for p in certs_dir.glob(f"{prefix}*.pem"):
        if not _is_target_cert(p, target) and _matches_cert_pattern(p.name, prefix):
            p.unlink(missing_ok=True)


def _rename_and_cleanup_certs(certs_dir: Path, prefix: str) -> None:
    """Rename latest cert to standard name and remove others."""
    latest = _find_latest_cert(certs_dir, prefix)
    if not latest:
        return
    target = certs_dir / f"{prefix}.pem"
    if latest.resolve() != target.resolve():
        target.unlink(missing_ok=True)
        latest.rename(target)
    _remove_remaining_certs(certs_dir, prefix, target)


def normalize_cert_candidates(certs_dir: Path, prefix: str) -> None:
    """Keep only the latest cert file for a given prefix, rename it, and remove others.
    Args:
        certs_dir: Directory containing certificates
        prefix: Certificate prefix (e.g., 'privkey', 'fullchain')
    """
    if not certs_dir.exists():
        return
    _rename_and_cleanup_certs(certs_dir, prefix)


def _create_dummy_certs(certs_dir: Path) -> Tuple[bool, str]:
    """Create dummy certificates for CI testing.
    Args:
        certs_dir: Directory where certificates should be created
    Returns:
        Tuple of (success, message)
    """
    try:
        certs_dir.mkdir(parents=True, exist_ok=True)
        privkey_path = certs_dir / "privkey.pem"
        fullchain_path = certs_dir / "fullchain.pem"
        if not privkey_path.exists():
            _create_dummy_cert_file(privkey_path)
        if not fullchain_path.exists():
            _create_dummy_cert_file(fullchain_path)
        return True, f"\nCreated dummy certificates in {certs_dir} for CI testing"
    except OSError as e:
        return False, f"Source directory error creating dummy certificates: {e}"


def _should_copy_file(source_path: Path, dest_path: Path) -> bool:
    """Check if a file should be copied."""
    return source_path.is_file() and source_path.resolve() != dest_path.resolve()


def _copy_single_file(source_path: Path, dest_path: Path) -> None:
    """Copy a single file to destination."""
    if _should_copy_file(source_path, dest_path):
        shutil.copy2(source_path, dest_path)


def _copy_files(source_dir: Path, certs_dir: Path) -> None:
    """Helper to copy files from source to destination directory.
    Args:
        source_dir: Source directory
        certs_dir: Destination directory
    """
    certs_dir.mkdir(parents=True, exist_ok=True)
    for path in source_dir.glob("*"):
        _copy_single_file(path, certs_dir / path.name)


def _copy_cert_files(source_dir: Path, certs_dir: Path) -> Tuple[bool, str]:
    """Copy certificate files from source to destination directory.
    Args:
        source_dir: Source directory containing certificates
        certs_dir: Destination directory
    Returns:
        Tuple of (success, message)
    """
    try:
        _copy_files(source_dir, certs_dir)
        # Normalize all Let's Encrypt/Certbot certificate types
        normalize_cert_candidates(certs_dir, "privkey")
        normalize_cert_candidates(certs_dir, "fullchain")
        normalize_cert_candidates(certs_dir, "cert")
        normalize_cert_candidates(certs_dir, "chain")
        return True, f"Certificates copied and normalized in {certs_dir}"
    except OSError as e:
        return False, f"Error copying certificates: {e}"


def create_combined_cert(
    privkey_path: Path, fullchain_path: Path, combined_path: Path
) -> Tuple[bool, str]:
    """Create combined.pem from privkey.pem and fullchain.pem.
    Args:
        privkey_path: Path to privkey.pem
        fullchain_path: Path to fullchain.pem
        combined_path: Path where combined.pem should be created
    Returns:
        Tuple of (success, message)
    """
    try:
        if not privkey_path.exists():
            raise FileNotFoundError(f"Missing privkey.pem at {privkey_path}.")
        if not fullchain_path.exists():
            raise FileNotFoundError(f"Missing fullchain.pem at {fullchain_path}.")
        with open(combined_path, "wb") as out_f:
            with open(privkey_path, "rb") as pk:
                out_f.write(pk.read())
            with open(fullchain_path, "rb") as fc:
                out_f.write(fc.read())
        return True, f"Combined certificate created at {combined_path}"
    except OSError as e:
        return False, f"Error creating combined certificate: {e}"


def _is_posix_not_ci() -> bool:
    """Check if running on POSIX system outside of CI environment."""
    os_type = platform.system().lower()
    return os_type in ("linux", "darwin") and not is_ci()


def _apply_cert_permissions(ctx: CertPermissionContext) -> None:
    """Apply file permissions to certificate (internal use)."""
    ctx.cert_path.chmod(ctx.mode)
    if ctx.gid is not None:
        shutil.chown(ctx.cert_path, user=ctx.uid, group=ctx.gid)
    else:
        shutil.chown(ctx.cert_path, user=ctx.uid)


def _get_permission_message(ctx: CertPermissionContext) -> str:
    """Generate message describing permission changes (internal use)."""
    if ctx.gid is not None:
        return (
            f"{ctx.cert_path.name} created with mode {oct(ctx.mode)} "
            f"and ownership set to {ctx.uid}:{ctx.gid}."
        )
    return (
        f"{ctx.cert_path.name} created with mode {oct(ctx.mode)} "
        f"and ownership set to user {ctx.uid}."
    )


def _get_skip_permission_message(cert_name: str) -> str:
    """Get message for when permissions are skipped.

    Args:
        cert_name: Certificate filename

    Returns:
        Appropriate skip message
    """
    if is_ci():
        return f"\n{cert_name} created (permission changes skipped in CI)."
    if platform.system().lower() == "windows":
        return (
            f"\n{cert_name} created" "\n(POSIX permissions not applicable on Windows)."
        )
    return f"\n{cert_name} created (permission changes skipped)."


def set_service_cert_permissions(
    ctx: CertPermissionContext,
) -> Tuple[bool, str]:
    """Set certificate file ownership and permissions for a service.

    Automatically skips permission changes in CI environments and Windows.

    Args:
        ctx: Context containing service name, cert path, uid, gid, and mode

    Returns:
        Tuple of (success, message)
    """
    try:
        if _is_posix_not_ci():
            _apply_cert_permissions(ctx)
            msg = _get_permission_message(ctx)
        else:
            msg = _get_skip_permission_message(ctx.cert_path.name)
        return True, msg
    except OSError as e:
        return False, f"Error setting permissions for {ctx.service_name}: {e}"


def copy_certs() -> Tuple[bool, str]:
    """Obtain TLS certificates for services.

    In CI/test environments (when CI, GITHUB_ACTIONS, or GITLAB_CI env vars are set),
    creates dummy self-signed certificates if the source directory doesn't exist.

    Returns:
        Tuple of (success, message)
    """
    config = Config()
    base_dir = Config.get_base_dir()
    host_name = config.get_value("HOSTNAME")
    certs_dir = base_dir / "certs" / host_name
    source_dir = Path(config.get_value("CERTS_SRC"))

    # Handle missing source directory
    if not source_dir.exists():
        if is_ci():
            return _create_dummy_certs(certs_dir)
        return False, f"Source directory for certs not found: {source_dir}"

    # Copy certificates from source
    return _copy_cert_files(source_dir, certs_dir)
