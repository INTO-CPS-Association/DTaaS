"""The Telegraf file of a twin: rendered from one template and checked.

Telegraf reloads the whole agent when a file in its config directory
changes and a malformed file stops it. A file is therefore written into that
directory only after `telegraf config check` passed on exactly that text.
The check uses the local telegraf when installed, else the pinned image
through Docker, and fails closed when neither is available.
"""

import json
import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from string import Template
from ..config import Config
from .names import telegraf_account, telegraf_client_id
from .twin import DEVICE_LEVELS, Twin

TELEGRAF_IMAGE = "telegraf:1.40.2"
TEMPLATE_PATH = Path(__file__).parent.parent.parent / "templates" / "telegraf"
TEMPLATE_FILE = TEMPLATE_PATH / "twin.conf.template"
TWINS_DIR = Path("config") / "telegraf" / "telegraf.d"
DEFAULT_MQTT_SERVER = "ssl://rabbitmq:8883"
POSTGRES_HOST = "postgres"
CHECK_TIMEOUT_SECONDS = 120
TELEGRAF_CONTAINER = "telegraf"


def twin_file(group: str, twin: str) -> Path:
    """Path of a twin's file in the directory Telegraf watches."""
    return Config.get_base_dir() / TWINS_DIR / f"{group}_{twin}.conf"


def subscription(twin: Twin) -> str:
    """The twin's prefix followed by '+' up to the eighth level."""
    return "/".join(twin.prefix + ("+",) * (DEVICE_LEVELS + 1 - len(twin.prefix)))


def render(twin: Twin) -> str:
    """Render the Telegraf file of a twin.

    Every value was validated against the naming convention or the topic
    level pattern, so none holds a quote, a backslash or a glob character.
    """
    config = Config()
    return Template(TEMPLATE_FILE.read_text(encoding="utf-8")).substitute(
        group=twin.group,
        twin=twin.name,
        store=f"{twin.group}_{twin.name}",
        mqtt_server=config.env.get("TELEGRAF_MQTT_SERVER") or DEFAULT_MQTT_SERVER,
        tls_server_name=config.get_value("HOSTNAME"),
        topic=subscription(twin),
        client_id=telegraf_client_id(twin.group, twin.name),
        account=telegraf_account(twin.group),
        route=f"{twin.group}/{twin.name}",
        device_ids=json.dumps([device.device_id for device in twin.devices]),
        postgres_host=POSTGRES_HOST,
    )


def _secret_names(group: str) -> list[str]:
    account = telegraf_account(group)
    return [f"{service}_{account}_password" for service in ("rabbitmq", "postgresql")]


def _check_command(conf: Path) -> list[str] | None:
    """The check command: local telegraf, else Docker, else None.

    In Docker the check runs as the current user, who owns the temporary
    folder, and without a network.
    """
    args = ["config", "check", "--strict-env-handling", "--config"]
    if shutil.which("telegraf"):
        return ["telegraf", *args, str(conf)]
    if not shutil.which("docker"):
        return None
    user = ["--user", f"{os.getuid()}:{os.getgid()}"] if hasattr(os, "getuid") else []
    return ["docker", "run", "--rm", "--network", "none", *user,
            "-e", "TELEGRAF_SECRETS_DIR=/check/secrets",
            "-v", f"{conf.parent}:/check:ro",
            TELEGRAF_IMAGE, "telegraf", *args, f"/check/{conf.name}"]  # fmt: skip


def check(text: str, group: str) -> tuple[bool, str]:
    """Run `telegraf config check` on the text of a twin file.

    The check reads placeholder secrets from a temporary folder, so no real
    password is handed to it.

    Returns:
        Tuple of (passed, error message if any)
    """
    with tempfile.TemporaryDirectory(prefix="dtaas-telegraf-") as tmp:
        conf = Path(tmp) / "twin.conf"
        conf.write_text(text, encoding="utf-8")
        secrets_dir = Path(tmp) / "secrets"
        secrets_dir.mkdir()
        for name in _secret_names(group):
            (secrets_dir / name).write_text("placeholder\n", encoding="utf-8")
        command = _check_command(conf)
        if command is None:
            return False, "Neither telegraf nor docker is installed, nothing written"
        return _run_check(command, secrets_dir)


def _run_check(command: list[str], secrets_dir: Path) -> tuple[bool, str]:
    env = {**os.environ, "TELEGRAF_SECRETS_DIR": str(secrets_dir)}
    try:
        result = subprocess.run(command, capture_output=True, text=True, env=env,
                                check=False, timeout=CHECK_TIMEOUT_SECONDS)  # fmt: skip
    except (OSError, subprocess.TimeoutExpired) as e:
        return False, f"telegraf config check did not run: {type(e).__name__}"
    if result.returncode == 0:
        return True, ""
    # Telegraf logs errors as "<time> E! <message>"
    errors = [line[line.index("E! "):] for line in result.stderr.splitlines()
              if "E! " in line]  # fmt: skip
    return False, "telegraf config check failed: " + (
        errors[-1] if errors else f"exit code {result.returncode}"
    )


def install(text: str, destination: Path) -> None:
    """Move the checked text into place in one rename.

    The temporary file sits next to the config directory, not in it, so
    Telegraf never sees a half-written file.
    """
    destination.parent.mkdir(parents=True, exist_ok=True)
    staging = destination.parent.parent / f".{destination.name}.tmp"
    staging.write_text(text, encoding="utf-8")
    staging.replace(destination)


def reload_telegraf() -> bool:
    """Send SIGHUP to the Telegraf container when it runs under Docker.

    Telegraf reloads on SIGHUP. --watch-config already reloads on Linux, but
    a deleted file on a macOS bind mount sends no event to the container.

    Returns:
        True when the signal was sent
    """
    if not shutil.which("docker"):
        return False
    inspect = ["docker", "inspect", "-f", "{{.State.Running}}", TELEGRAF_CONTAINER]
    kill = ["docker", "kill", "--signal", "HUP", TELEGRAF_CONTAINER]
    try:
        running = subprocess.run(inspect, capture_output=True, text=True,
                                 check=False, timeout=30)  # fmt: skip
        if running.returncode != 0 or running.stdout.strip() != "true":
            return False
        sent = subprocess.run(kill, capture_output=True, check=False, timeout=30)
    except (OSError, subprocess.TimeoutExpired):
        return False
    return sent.returncode == 0
