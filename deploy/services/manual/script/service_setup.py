import platform
import os
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Tuple
from dotenv import load_dotenv

class ServicesConfig:
    """
    Configuration and setup utility for DTaaS platform services.

    This class handles:
        - Loading environment variables and service configuration.
        - Managing TLS certificates for services (copying, normalizing, combining).
        - Setting file permissions and ownership for MongoDB, InfluxDB, and RabbitMQ.
        - Starting platform services using Docker Compose.
        - Supporting Linux/MacOS and Windows environments.
    """

    def __init__(self) -> None:

        """Initialize configuration paths and files, grouped by service."""
        self.base_dir = Path(__file__).parent.resolve()
        self.env_file = self.base_dir.parent / "config" / "services.env"
        self.env = self._load_env(self.env_file)

        self.host_name = self.get_required_env("HOSTNAME")
        self.os_type = platform.system().lower()

        self.dir_path = {
            "config": self.base_dir.parent / "config",
            "data": self.base_dir.parent / "data",
            "certs": self.base_dir.parent / "certs",
        }

        self.certs = {
            "dir": self.dir_path["certs"] / self.host_name,
            "privkey": self.dir_path["certs"] / self.host_name / "privkey.pem",
            "fullchain": self.dir_path["certs"] / self.host_name / "fullchain.pem",
            "combined": self.dir_path["certs"] / self.host_name / "combined.pem",
            "influx_key": self.dir_path["certs"] / self.host_name / "privkey-influxdb.pem",
            "rabbit_key": self.dir_path["certs"] / self.host_name / "privkey-rabbitmq.pem",
        }

        self.influx = {
            "uid": self.get_required_env("INFLUX_UID"),
            "gid": self.get_required_env("INFLUX_GID"),
            "key": self.certs["influx_key"],
        }
        self.mongo = {
            "uid": self.get_required_env("MONGO_UID"),
            "gid": self.get_required_env("MONGO_GID"),
            "combined": self.certs["combined"],
        }
        self.rabbitmq = {
            "uid": self.get_required_env("RABBIT_UID"),
            "key": self.certs["rabbit_key"],
        }

        self.env_template = self.dir_path["config"] / "services.env.template"
        self.compose_file = self.base_dir.parent / "compose.services.secure.yml"

        if self.os_type in ("linux", "darwin"):
            self.check_root_unix()


    def check_root_unix(self) -> None:
        """Check if script is run as root on Unix systems."""
        try:
            is_root = os.geteuid() == 0
        except AttributeError:
            is_root = False
        if not is_root:
            print("This script must be run as root (Linux/MacOS).")
            sys.exit(1)


    def _load_env(self, env_path: Path) -> dict:
        """Load environment variables from a file into a dictionary."""
        if not env_path.exists():
            raise FileNotFoundError(f"Environment (config/services.env) file not found: {env_path}")
        load_dotenv(dotenv_path=env_path, override=True)
        return dict(os.environ)


    def get_required_env(self, var_name: str) -> str:
        """Retrieve a required environment variable from the loaded env dict."""
        value = self.env.get(var_name)
        if value is None:
            raise RuntimeError(
                f"Required environment variable '{var_name}' is not set. "
                f"Please ensure it is defined in the services.env file.")
        return value


    def copy_certs(self) -> Tuple[bool, str]:
        """Obtain TLS certificates for services."""
        source_dir = Path(self.get_required_env("CERTS_SRC"))
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
        """Keep only the latest cert file for a given prefix, rename it, and remove others."""
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


    def _create_combined_cert(self) -> None:
        """Create combined.pem from privkey.pem and fullchain.pem."""
        privkey_path = self.certs["privkey"]
        fullchain_path = self.certs["fullchain"]
        if not privkey_path.exists():
            raise FileNotFoundError(f"Missing privkey.pem at {privkey_path}.")
        if not fullchain_path.exists():
            raise FileNotFoundError(f"Missing fullchain.pem at {fullchain_path}.")
        with open(self.certs["combined"], "wb") as out_f:
            with open(privkey_path, "rb") as pk:
                out_f.write(pk.read())
            with open(fullchain_path, "rb") as fc:
                out_f.write(fc.read())


    def permissions_mongodb(self) -> Tuple[bool, str]:
        """Creates combined.pem and sets permissions for MongoDB."""
        try:
            self.certs["dir"].mkdir(parents=True, exist_ok=True)
            self._create_combined_cert()
            if self.os_type in ("linux", "darwin"):
                self.certs["combined"].chmod(0o600)
                chown_args = ["chown", f"{self.mongo['uid']}:{self.mongo['gid']}", str(self.certs["combined"])]
                subprocess.run(chown_args, check=True)
            return True, (f"combined.pem created with mode 600 and ownership set to "
                f"{self.mongo['uid']}:{self.mongo['gid']}.")
        except OSError as e:
            return False, f"Error setting permissions for MongoDB: {e}"
        except subprocess.CalledProcessError as e:
            return False, f"Failed to set ownership: {str(e)}"


    def permissions_influxdb(self) -> Tuple[bool, str]:
        """Copy privkey.pem -> privkey-influxdb.pem and change owner."""
        try:
            shutil.copy2(self.certs["privkey"], self.influx["key"])
            if self.os_type in ("linux", "darwin"):
                chown_args = ["chown", f"{self.influx['uid']}:{self.influx['gid']}", str(self.influx["key"])]
                subprocess.run(chown_args, check=True)
            return True, (
                f"{self.influx['key']} created and ownership set to "
                f"{self.influx['uid']}:{self.influx['gid']}.")
        except OSError as e:
            return False, f"Error setting permissions for InfluxDB: {e}"
        except subprocess.CalledProcessError as e:
            return False, f"Failed to set ownership: {str(e)}"


    def permissions_rabbitmq(self) -> Tuple[bool, str]:
        """Copy privkey.pem -> privkey-rabbitmq.pem and sets owner."""
        try:
            shutil.copy2(self.certs["privkey"], self.rabbitmq["key"])
            if self.os_type in ("linux", "darwin"):
                chown_args = ["chown", f"{self.rabbitmq['uid']}", str(self.rabbitmq["key"])]
                subprocess.run(chown_args, check=True)
            return True, (f"{self.rabbitmq['key']} created and ownership set to user "
                f"{self.rabbitmq['uid']}.")
        except OSError as e:
            return False, f"Error setting permissions for RabbitMQ: {e}"
        except subprocess.CalledProcessError as e:
            return False, f"Failed to set ownership: {str(e)}"


    def start_docker_compose(self) -> Tuple[bool, str]:
        """Start the platform services using docker compose."""
        try:
            result = subprocess.run(
                ["docker", "compose", "-f", str(self.compose_file), "up", "-d"],
                check=True,
                capture_output=True,
                text=True)
            return True, f"Docker Compose started successfully:\n{result.stdout}"
        except OSError as e:
            return False, f"Error starting Docker Compose: {e}"
        except subprocess.CalledProcessError as e:
            return False, f"Failed to start Docker Compose: {str(e)}"


if __name__ == "__main__":
    cfg = ServicesConfig()
    steps = [
        cfg.copy_certs,
        cfg.permissions_mongodb,
        cfg.permissions_influxdb,
        cfg.permissions_rabbitmq,
        cfg.start_docker_compose,
    ]
    for step in steps:
        ok, msg = step()
        if not ok:
            print(f"ERROR: {msg}", file=sys.stderr)
            sys.exit(1)
        else:
            print(f"OK: {msg}")
    sys.exit(0)
