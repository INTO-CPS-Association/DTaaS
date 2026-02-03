"""ThingsBoard and PostgreSQL certificate and permission management."""

# pylint: disable=W1203, R0903
import logging
import os
import shutil
import platform
from typing import Tuple
from pathlib import Path
from .config import Config
from .cert import copy_certs, set_service_cert_permissions, CertPermissionContext
from .utils import is_ci


PRIV_KEY_FILENAME = "privkey.pem"
FULLCHAIN_FILENAME = "fullchain.pem"

# Set up logger
logger = logging.getLogger(__name__)


class _ServiceCertConfig:
    """Configuration for service certificate setup."""

    def __init__(self, service_name: str, key_filename: str, cert_filename: str):
        self.service_name = service_name
        self.key_filename = key_filename
        self.cert_filename = cert_filename


class _CertSetupParams:
    """Certificate setup parameters."""

    def __init__(self, certs_dir: Path, uid: int, gid: int):
        self.certs_dir = certs_dir
        self.uid = uid
        self.gid = gid


class _TenantSetupContext:
    """Context for tenant setup operations."""

    def __init__(self, cert_cfg: _ServiceCertConfig, params: _CertSetupParams):
        self.cert_cfg = cert_cfg
        self.certs_dir = params.certs_dir
        self.uid = params.uid
        self.gid = params.gid


def _copy_service_cert_files(setup_ctx: _TenantSetupContext) -> Tuple[tuple, bool, str]:
    """Copy service certificate files and return paths."""
    privkey_path = setup_ctx.certs_dir / PRIV_KEY_FILENAME
    fullchain_path = setup_ctx.certs_dir / FULLCHAIN_FILENAME
    service_key_path = setup_ctx.certs_dir / setup_ctx.cert_cfg.key_filename
    service_cert_path = setup_ctx.certs_dir / setup_ctx.cert_cfg.cert_filename

    shutil.copy2(privkey_path, service_key_path)
    shutil.copy2(fullchain_path, service_cert_path)
    return (service_key_path, service_cert_path), True, ""


def _set_service_cert_file_permissions(
    setup_ctx: _TenantSetupContext, service_key_path: Path, service_cert_path: Path
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


def _setup_service_certs(setup_ctx: _TenantSetupContext) -> Tuple[bool, str]:
    """Set up service certificates with proper permissions."""
    try:
        (service_key_path, service_cert_path), _, _ = _copy_service_cert_files(
            setup_ctx
        )
        return _set_service_cert_file_permissions(
            setup_ctx, service_key_path, service_cert_path
        )
    except OSError as e:
        return (
            False,
            f"Error setting up {setup_ctx.cert_cfg.service_name} certificates: {e}",
        )


def _setup_postgres_certs(certs_dir: Path, uid: int, gid: int) -> Tuple[bool, str]:
    """Set up PostgreSQL certificates with proper permissions."""
    cfg = _ServiceCertConfig("PostgreSQL", "postgres.key", "postgres.crt")
    params = _CertSetupParams(certs_dir, uid, gid)
    setup_ctx = _TenantSetupContext(cfg, params)
    return _setup_service_certs(setup_ctx)


def _setup_thingsboard_certs(certs_dir: Path, uid: int, gid: int) -> Tuple[bool, str]:
    """Set up ThingsBoard certificates with proper permissions."""
    cfg = _ServiceCertConfig(
        "ThingsBoard", "thingsboard-privkey.pem", "thingsboard-fullchain.pem"
    )
    params = _CertSetupParams(certs_dir, uid, gid)
    setup_ctx = _TenantSetupContext(cfg, params)
    return _setup_service_certs(setup_ctx)


class _SetupConfig:
    """Configuration container for ThingsBoard setup."""

    def __init__(self):
        self.config = Config()
        self.base_dir = Config.get_base_dir()
        self.os_type = platform.system().lower()
        self.host_name = self.config.get_value("HOSTNAME")
        self.certs_dir = self.base_dir / "certs" / self.host_name
        self.postgres_uid = int(self.config.get_value("POSTGRES_UID"))
        self.postgres_gid = int(self.config.get_value("POSTGRES_GID"))
        self.thingsboard_uid = int(self.config.get_value("THINGSBOARD_UID"))
        self.thingsboard_gid = int(self.config.get_value("THINGSBOARD_GID"))


def _chown_path(path: Path, uid: int, gid: int) -> None:
    """Change ownership of a single path."""
    shutil.chown(path, user=uid, group=gid)


def _change_ownership_recursive(root: str, uid: int, gid: int) -> None:
    for root_dir, dirs, files in os.walk(root):
        for name in (*dirs, *files):
            _chown_path(Path(root_dir) / name, uid, gid)


def _set_directory_ownership(directory: Path, uid: int, gid: int) -> None:
    """Set ownership for directory and all its contents."""
    _chown_path(directory, uid, gid)
    _change_ownership_recursive(str(directory), uid, gid)


def _apply_directory_ownership_if_needed(
    cfg: _SetupConfig, data_dir: Path, log_dir: Path
) -> str:
    """Apply directory ownership if running on POSIX system outside CI."""
    if cfg.os_type in ("linux", "darwin") and not is_ci():
        _set_directory_ownership(data_dir, cfg.thingsboard_uid, cfg.thingsboard_gid)
        _set_directory_ownership(log_dir, cfg.thingsboard_uid, cfg.thingsboard_gid)
        return (
            f"ThingsBoard data and log directories ownership set "
            f"to {cfg.thingsboard_uid}:{cfg.thingsboard_gid}"
        )
    return "\nThingsBoard data and log directories created (ownership skipped)"


def _setup_thingsboard_directories(cfg: _SetupConfig) -> Tuple[bool, str]:
    """Set up ThingsBoard data and log directories with proper ownership."""
    try:
        data_dir = cfg.base_dir / "data" / "thingsboard"
        log_dir = cfg.base_dir / "log" / "thingsboard"
        data_dir.mkdir(parents=True, exist_ok=True)
        log_dir.mkdir(parents=True, exist_ok=True)
        data_dir.chmod(0o777)
        log_dir.chmod(0o777)

        msg = _apply_directory_ownership_if_needed(cfg, data_dir, log_dir)
        return True, msg
    except OSError as e:
        return False, f"Error setting up ThingsBoard directories: {e}"


def _verify_certificates_exist(certs_dir: Path) -> Tuple[bool, str]:
    """Verify normalized certificates exist."""
    privkey_path = certs_dir / PRIV_KEY_FILENAME
    fullchain_path = certs_dir / FULLCHAIN_FILENAME

    if not privkey_path.exists() or not fullchain_path.exists():
        return False, f"Normalized certificates not found in {certs_dir}"
    return True, ""


def _execute_setup_operations(cfg: _SetupConfig) -> Tuple[bool, list]:
    """Execute all setup operations.

    Args:
        cfg: Setup configuration object

    Returns:
        Tuple indicating success and list of messages
    """
    messages = []
    operations = [
        (_setup_postgres_certs, cfg.certs_dir, cfg.postgres_uid, cfg.postgres_gid),
        (
            _setup_thingsboard_certs,
            cfg.certs_dir,
            cfg.thingsboard_uid,
            cfg.thingsboard_gid,
        ),
        (_setup_thingsboard_directories, cfg),
    ]

    for operation_func, *args in operations:
        success, msg = operation_func(*args)
        if not success:
            return False, [msg]
        messages.append(msg)

    return True, messages


def _prepare_certificates_and_setup(cfg: _SetupConfig) -> Tuple[bool, list]:
    """Helper to prepare certificates and execute setup operations."""
    success, error_msg = _verify_certificates_exist(cfg.certs_dir)
    if not success:
        return False, [error_msg]
    return _execute_setup_operations(cfg)


def permissions_thingsboard() -> Tuple[bool, str]:
    """Set up certificates and permissions for ThingsBoard and PostgreSQL."""
    try:
        success, msg = copy_certs()
        if not success:
            return False, f"Failed to copy certificates: {msg}"

        messages = [msg]
        cfg = _SetupConfig()
        success, setup_messages = _prepare_certificates_and_setup(cfg)
        if success:
            messages.extend(setup_messages)
            return True, "; ".join(messages)
        raise RuntimeError(setup_messages[0])
    except Exception as e:
        logger.error(f"Error setting up ThingsBoard: {e}")
        return False, str(e)
