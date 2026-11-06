"""Secret files of the program accounts that dtaas-services makes.

Each secret is a file named <service>_<account>_password, with mode 600, in a
folder per consumer under secrets/, so a container mounts only the secrets of
its own accounts. A password is made once and read back on later runs, so
running a command again keeps the password the service already has.
"""

import secrets
from pathlib import Path
from .config import Config
from .utils import write_secret_file

SECRETS_DIR = "secrets"
# 32 random bytes, URL-safe, so the value needs no quoting in a connection
# string and has no '$' that Grafana would expand
PASSWORD_BYTES = 32


def secret_path(consumer: str, service: str, account: str) -> Path:
    """Return the path of the secret file of one account."""
    name = f"{service}_{account}_password"
    return Config.get_base_dir() / SECRETS_DIR / consumer / name


def ensure_password(consumer: str, service: str, account: str) -> str:
    """Read the password of an account, or make one and write it.

    Returns:
        The password, which the caller must never print
    """
    path = secret_path(consumer, service, account)
    if path.exists():
        return path.read_text(encoding="utf-8").strip()
    password = secrets.token_urlsafe(PASSWORD_BYTES)
    # No trailing newline: Telegraf's Docker secret store reads the file as
    # it is, so a newline would become part of the password
    write_secret_file(path, password)
    return password
