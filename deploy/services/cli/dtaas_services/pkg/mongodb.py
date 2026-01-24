"""MongoDB installation, service and user management."""

from typing import Tuple
from .config import Config
from .cert import (
    create_combined_cert,
    set_service_cert_permissions,
    CertPermissionContext,
)


def permissions_mongodb() -> Tuple[bool, str]:
    """Creates combined.pem and sets permissions for MongoDB.

    Skips permission changes in CI environments (GITHUB_ACTIONS, GITLAB_CI, CI env vars).

    Returns:
        Tuple of (success, message)
    """
    try:
        config = Config()
        base_dir = Config.get_base_dir()
        host_name = config.get_value("HOSTNAME")
        certs_dir = base_dir / "certs" / host_name
        privkey_path = certs_dir / "privkey.pem"
        fullchain_path = certs_dir / "fullchain.pem"
        combined_path = certs_dir / "combined.pem"
        mongo_uid = int(config.get_value("MONGO_UID"))
        mongo_gid = int(config.get_value("MONGO_GID"))

        certs_dir.mkdir(parents=True, exist_ok=True)

        # Create combined certificate
        success, msg = create_combined_cert(privkey_path, fullchain_path, combined_path)
        if not success:
            return False, msg

        # Set permissions on combined certificate
        ctx = CertPermissionContext(
            "MongoDB", combined_path, mongo_uid, mongo_gid, 0o600
        )
        success, perm_msg = set_service_cert_permissions(ctx)
        return success, perm_msg
    except OSError as e:
        return False, f"Error setting permissions for MongoDB: {e}"
