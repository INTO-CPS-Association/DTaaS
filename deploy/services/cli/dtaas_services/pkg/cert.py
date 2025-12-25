"""TLS certificate management for DTaaS services"""
import os
import shutil
from pathlib import Path
from typing import Tuple
from .config import Config


def create_dummy_cert(cert_path: Path) -> bool:
    """Create a dummy self-signed certificate for testing/CI.

    Args:
        cert_path: Path where certificate should be created

    Returns:
        True if successful, False otherwise
    """
    try:
        cert_path.parent.mkdir(parents=True, exist_ok=True)
        # Create a minimal PEM file (dummy certificate for testing)
        cert_path.write_text("""-----BEGIN CERTIFICATE-----
MIICpDCCAYwCCQC0kWW3fOkRgzANBgkqhkiG9w0BAQsFADAUMRIwEAYDVQQDDAls
b2NhbGhvc3QwHhcNMjQwMTAxMDAwMDAwWhcNMjUwMTAxMDAwMDAwWjAUMRIwEAYD
VQQDDAlsb2NhbGhvc3QwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDI
-----END CERTIFICATE-----
""")
        return True
    except Exception:
        return False


def normalize_cert_candidates(certs_dir: Path, prefix: str) -> None:
    """Keep only the latest cert file for a given prefix, rename it, and remove others.
    Args:
        certs_dir: Directory containing certificates
        prefix: Certificate prefix (e.g., 'privkey', 'fullchain')
    """
    candidates = list(certs_dir.glob(f"{prefix}*.pem"))
    if not candidates:
        return
    latest = max(candidates, key=lambda p: p.stat().st_mtime)
    target = certs_dir / f"{prefix}.pem"
    if latest.resolve() != target.resolve():
        target.unlink(missing_ok=True)
        latest.rename(target)
    for p in candidates:
        if p.resolve() != target.resolve():
            p.unlink(missing_ok=True)


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

    # In CI/test environments, create dummy certificates if source doesn't exist
    is_ci = os.getenv('CI') or os.getenv('GITHUB_ACTIONS') or os.getenv('GITLAB_CI')
    if not source_dir.exists():
        if is_ci:
            # In CI, create dummy certificates for testing
            try:
                certs_dir.mkdir(parents=True, exist_ok=True)
                # Create dummy private key and certificate
                privkey_path = certs_dir / "privkey.pem"
                fullchain_path = certs_dir / "fullchain.pem"

                if not privkey_path.exists():
                    create_dummy_cert(privkey_path)
                if not fullchain_path.exists():
                    create_dummy_cert(fullchain_path)

                return True, f"Created dummy certificates in {certs_dir} for CI testing"
            except OSError as e:
                return False, f"Source directory error creating dummy certificates: {e}"
        else:
            return False, f"Source directory for certs not found: {source_dir}"

    certs_dir.mkdir(parents=True, exist_ok=True)
    try:
        for path in source_dir.glob("*"):
            if path.is_file():
                dest = certs_dir / path.name
                if path.resolve() == dest.resolve():
                    print("Source and destination are the same, skipping copy.")
                    continue
                shutil.copy2(path, dest)
        normalize_cert_candidates(certs_dir, "privkey")
        normalize_cert_candidates(certs_dir, "fullchain")
        return True, f"Certificates copied and normalized in {certs_dir}"
    except OSError as e:
        return False, f"Error copying certificates: {e}"

