"""Shared certificate utilities for service setup."""

# pylint: disable=W1203, R0903
import shutil
import os
from typing import Tuple
from pathlib import Path
from dataclasses import dataclass
import httpx
from ...cert import set_service_cert_permissions, CertPermissionContext


PRIV_KEY_FILENAME = "privkey.pem"
FULLCHAIN_FILENAME = "fullchain.pem"


class CredentialProcessContext:
    """Context for processing credentials."""

    def __init__(self, base_url: str, session: httpx.Client):
        self.base_url = base_url
        self.session = session
        self.seen_emails = set()


class ServiceCertConfig:
    """Configuration for service certificate setup."""

    def __init__(self, service_name: str, key_filename: str, cert_filename: str):
        self.service_name = service_name
        self.key_filename = key_filename
        self.cert_filename = cert_filename


class CertSetupParams:
    """Certificate setup parameters."""

    def __init__(self, certs_dir: Path, uid: int, gid: int):
        self.certs_dir = certs_dir
        self.uid = uid
        self.gid = gid


class ServiceSetupContext:
    """Context for service certificate setup operations."""

    def __init__(self, cert_cfg: ServiceCertConfig, params: CertSetupParams):
        self.cert_cfg = cert_cfg
        self.certs_dir = params.certs_dir
        self.uid = params.uid
        self.gid = params.gid


def copy_service_cert_files(setup_ctx: ServiceSetupContext) -> Tuple[tuple, bool, str]:
    """Copy service certificate files and return paths."""
    privkey_path = setup_ctx.certs_dir / PRIV_KEY_FILENAME
    fullchain_path = setup_ctx.certs_dir / FULLCHAIN_FILENAME
    service_key_path = setup_ctx.certs_dir / setup_ctx.cert_cfg.key_filename
    service_cert_path = setup_ctx.certs_dir / setup_ctx.cert_cfg.cert_filename

    shutil.copy2(privkey_path, service_key_path)
    shutil.copy2(fullchain_path, service_cert_path)
    return (service_key_path, service_cert_path), True, ""


def set_service_cert_file_permissions(
    setup_ctx: ServiceSetupContext, service_key_path: Path, service_cert_path: Path
) -> Tuple[bool, str]:
    """Set permissions on service certificate files."""
    # Set permissions on private key
    ctx = CertPermissionContext(
        setup_ctx.cert_cfg.service_name,
        service_key_path,
        setup_ctx.uid,
        setup_ctx.gid,
        0o600,
    )
    success, msg = set_service_cert_permissions(ctx)
    if not success:
        return False, msg

    # Set permissions on certificate (readable)
    ctx = CertPermissionContext(
        setup_ctx.cert_cfg.service_name,
        service_cert_path,
        setup_ctx.uid,
        setup_ctx.gid,
        0o644,
    )
    return set_service_cert_permissions(ctx)


def setup_service_certs(setup_ctx: ServiceSetupContext) -> Tuple[bool, str]:
    """Set up service certificates with proper permissions."""
    try:
        (service_key_path, service_cert_path), _, _ = copy_service_cert_files(setup_ctx)
        return set_service_cert_file_permissions(
            setup_ctx, service_key_path, service_cert_path
        )
    except OSError as e:
        return (
            False,
            f"Error setting up {setup_ctx.cert_cfg.service_name} certificates: {e}",
        )


def validate_credential_row(
    credential: dict, username: str, seen_emails: set
) -> Tuple[bool, str]:
    """Validate a credential row and check for duplicates."""
    email = credential.get("email", "").strip()

    if not email:
        return False, f"Email field is required for user {username}"
    if email in seen_emails:
        return False, f"Duplicate email '{email}' found for user {username}"
    return True, email


def build_base_url() -> str:
    """
    Build ThingsBoard base URL from environment variables.
    Uses HOSTNAME from environment (must match certificate domain name).
    """
    hostname = os.getenv("HOSTNAME", "localhost")
    port = os.getenv("THINGSBOARD_PORT", "8080")
    scheme = os.getenv("THINGSBOARD_SCHEME", "https")
    return f"{scheme}://{hostname}:{port}".rstrip("/")


@dataclass
class CertificateSetupConfig:
    """Configuration for setting up service certificates."""

    service_name: str
    cert_filename: str
    key_filename: str
    certs_dir: Path
    uid: int
    gid: int


def setup_service_certificates(config: CertificateSetupConfig) -> Tuple[bool, str]:
    """Abstract helper for setting up service certificates.

    Args:
        config: Certificate setup configuration object

    Returns:
        Tuple of (success, message)
    """
    try:
        cert_cfg = ServiceCertConfig(
            config.service_name, config.key_filename, config.cert_filename
        )
        params = CertSetupParams(config.certs_dir, config.uid, config.gid)
        return setup_service_certs(ServiceSetupContext(cert_cfg, params))
    except OSError as e:
        return False, f"Error setting up {config.service_name} certificates: {e}"
