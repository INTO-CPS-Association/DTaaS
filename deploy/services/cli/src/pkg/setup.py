"""Service setup and management for DTaaS platform services"""
import platform
import shutil
import subprocess
from pathlib import Path

from .config import Config


class ServiceSetup:
    """Service setup and management for DTaaS platform services"""

    def __init__(self, config: Config) -> None:
        """
        Initialize service setup.

        Args:
            config: Configuration object
        """
        self.config = config
        self.host_name = config.get_required_env("HOSTNAME")
        self.os_type = platform.system().lower()

        # Directory paths
        self.dir_path = {
            "config": config.base_dir / "config",
            "data": config.base_dir / "data",
            "certs": config.base_dir / "certs",
        }

        # Certificate paths
        self.certs = {
            "dir": self.dir_path["certs"] / self.host_name,
            "privkey": self.dir_path["certs"] / self.host_name / "privkey.pem",
            "fullchain": (
                self.dir_path["certs"] / self.host_name / "fullchain.pem"
            ),
            "combined": (
                self.dir_path["certs"] / self.host_name / "combined.pem"
            ),
            "influx_key": (
                self.dir_path["certs"] / self.host_name / "privkey-influxdb.pem"
            ),
            "rabbit_key": (
                self.dir_path["certs"] / self.host_name / "privkey-rabbitmq.pem"
            ),
        }

        # Service configurations
        self.influx = {
            "uid": config.get_required_env("INFLUX_UID"),
            "gid": config.get_required_env("INFLUX_GID"),
            "key": self.certs["influx_key"],
        }
        self.mongo = {
            "uid": config.get_required_env("MONGO_UID"),
            "gid": config.get_required_env("MONGO_GID"),
            "combined": self.certs["combined"],
        }
        self.rabbitmq = {
            "uid": config.get_required_env("RABBIT_UID"),
            "key": self.certs["rabbit_key"],
        }

        self.compose_file = config.base_dir / "compose.services.secure.yml"

    def copy_certs(self) -> tuple[bool, str]:
        """
        Copy TLS certificates from source to destination.

        Returns:
            Tuple of (success, message)
        """
        source_dir = Path(self.config.get_required_env("CERTS_SRC"))
        if not source_dir.exists():
            return False, f"Source directory for certs not found: {source_dir}"

        self.certs["dir"].mkdir(parents=True, exist_ok=True)

        try:
            for path in source_dir.glob("*"):
                if path.is_file():
                    shutil.copy2(path, self.certs["dir"] / path.name)
            self._normalize_cert_candidates("privkey")
            self._normalize_cert_candidates("fullchain")
            return True, f"Certificates copied and normalized in {self.certs['dir']}"
        except OSError as e:
            return False, f"Error copying certificates: {e}"

    def _normalize_cert_candidates(self, prefix: str) -> None:
        """
        Keep only the latest cert file for a given prefix, rename it, and remove others.

        Args:
            prefix: Certificate prefix (e.g., 'privkey', 'fullchain')
        """
        candidates = list(self.certs["dir"].glob(f"{prefix}*.pem"))
        if not candidates:
            return

        latest = max(candidates, key=lambda p: p.stat().st_mtime)
        target = self.certs["dir"] / f"{prefix}.pem"

        if latest.resolve() != target.resolve():
            target.unlink(missing_ok=True)
            latest.rename(target)

        for p in candidates:
            if p.resolve() != target.resolve():
                p.unlink(missing_ok=True)

    def _create_combined_pem(self) -> None:
        """Create combined.pem from privkey.pem and fullchain.pem"""
        privkey_path = self.certs["privkey"]
        fullchain_path = self.certs["fullchain"]

        if not privkey_path.exists():
            msg = f"Missing privkey.pem at {privkey_path}"
            raise FileNotFoundError(msg)
        if not fullchain_path.exists():
            msg = f"Missing fullchain.pem at {fullchain_path}"
            raise FileNotFoundError(msg)

        with self.certs["combined"].open("wb") as out_f:
            with privkey_path.open("rb") as pk:
                out_f.write(pk.read())
            with fullchain_path.open("rb") as fc:
                out_f.write(fc.read())

    def setup_mongodb(self) -> tuple[bool, str]:
        """
        Set up MongoDB certificates and permissions.

        Returns:
            Tuple of (success, message)
        """
        try:
            self.certs["dir"].mkdir(parents=True, exist_ok=True)
            self._create_combined_pem()

            if self.os_type in ("linux", "darwin"):
                self.certs["combined"].chmod(0o600)
                chown_args = [
                    "chown",
                    f"{self.mongo['uid']}:{self.mongo['gid']}",
                    str(self.certs["combined"])
                ]
                subprocess.run(chown_args, check=True)  # noqa: S603

            return True, (
                f"combined.pem created with mode 600 and ownership set to "
                f"{self.mongo['uid']}:{self.mongo['gid']}"
            )
        except (OSError, subprocess.CalledProcessError) as e:
            return False, f"Error setting up MongoDB: {e}"

    def setup_influxdb(self) -> tuple[bool, str]:
        """
        Set up InfluxDB certificates and permissions.

        Returns:
            Tuple of (success, message)
        """
        try:
            shutil.copy2(self.certs["privkey"], self.influx["key"])

            if self.os_type in ("linux", "darwin"):
                chown_args = [
                    "chown",
                    f"{self.influx['uid']}:{self.influx['gid']}",
                    str(self.influx["key"])
                ]
                subprocess.run(chown_args, check=True)  # noqa: S603

            return True, (
                f"{self.influx['key']} created and ownership set to "
                f"{self.influx['uid']}:{self.influx['gid']}"
            )
        except (OSError, subprocess.CalledProcessError) as e:
            return False, f"Error setting up InfluxDB: {e}"

    def setup_rabbitmq(self) -> tuple[bool, str]:
        """
        Set up RabbitMQ certificates and permissions.

        Returns:
            Tuple of (success, message)
        """
        try:
            shutil.copy2(self.certs["privkey"], self.rabbitmq["key"])

            if self.os_type in ("linux", "darwin"):
                chown_args = [
                    "chown",
                    f"{self.rabbitmq['uid']}",
                    str(self.rabbitmq["key"])
                ]
                subprocess.run(chown_args, check=True)  # noqa: S603

            return True, (
                f"{self.rabbitmq['key']} created and ownership set to user "
                f"{self.rabbitmq['uid']}"
            )
        except (OSError, subprocess.CalledProcessError) as e:
            return False, f"Error setting up RabbitMQ: {e}"

    def start_services(self) -> tuple[bool, str]:
        """
        Start the platform services using Docker Compose.

        Returns:
            Tuple of (success, message)
        """
        try:
            result = subprocess.run(
                ["docker", "compose", "-f", str(self.compose_file), "up", "-d"],
                check=True,
                capture_output=True,
                text=True,
                cwd=self.config.base_dir
            )
            return True, f"Docker Compose started successfully:\n{result.stdout}"
        except (OSError, subprocess.CalledProcessError) as e:
            return False, f"Error starting Docker Compose: {e}"
