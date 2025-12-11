"""MongoDB user management for DTaaS services"""
import shutil
import platform
from pathlib import Path
from typing import Tuple
from .config import Config


def create_combined_pem(privkey_path: Path, fullchain_path: Path, combined_path: Path) -> None:
    """Create combined.pem from privkey.pem and fullchain.pem.
    
    Args:
        privkey_path: Path to privkey.pem
        fullchain_path: Path to fullchain.pem
        combined_path: Path where combined.pem should be created
    """
    if not privkey_path.exists():
        raise FileNotFoundError(f"Missing privkey.pem at {privkey_path}.")
    if not fullchain_path.exists():
        raise FileNotFoundError(f"Missing fullchain.pem at {fullchain_path}.")
    with open(combined_path, "wb") as out_f:
        with open(privkey_path, "rb") as pk:
            out_f.write(pk.read())
        with open(fullchain_path, "rb") as fc:
            out_f.write(fc.read())


def permissions_mongodb() -> Tuple[bool, str]:
    """Creates combined.pem and sets permissions for MongoDB.
    
    Returns:
        Tuple of (success, message)
    """
    try:
        config = Config()
        base_dir = Config.get_base_dir()
        os_type = platform.system().lower()
        
        host_name = config.get_value("HOSTNAME")
        certs_dir = base_dir / "certs" / host_name
        privkey_path = certs_dir / "privkey.pem"
        fullchain_path = certs_dir / "fullchain.pem"
        combined_path = certs_dir / "combined.pem"
        mongo_uid = int(config.get_value("MONGO_UID"))
        mongo_gid = int(config.get_value("MONGO_GID"))
        
        certs_dir.mkdir(parents=True, exist_ok=True)
        create_combined_pem(privkey_path, fullchain_path, combined_path)
        if os_type in ("linux", "darwin"):
            combined_path.chmod(0o600)
            shutil.chown(
                combined_path,
                user=mongo_uid,
                group=mongo_gid
            )
        msg = (
            f"combined.pem created with mode 600 and ownership set to "
            f"{mongo_uid}:{mongo_gid}."
        )
        return True, msg
    except OSError as e:
        return False, f"Error setting permissions for MongoDB: {e}"
