import platform
import os
import sys
import shutil
import subprocess
from pathlib import Path
from typing import Tuple, Optional
from python_on_whales import DockerClient
from .config import Config


class ServicesSetup:
    """
    Setup and configuration utility for DTaaS platform services.

    This class handles:
        - Managing TLS certificates for services (copying, normalizing, combining)
        - Setting file permissions and ownership for MongoDB, InfluxDB, and RabbitMQ
        - Starting platform services using Docker Compose
        - Supporting Linux/MacOS and Windows environments
    """

    def __init__(self, config: Optional[Config] = None) -> None:
        """
        Initialize service setup.
        
        Args:
            config: Configuration object. If None, creates default Config.
        """
        self.config = config or Config()
        self.base_dir = Path(__file__).parent.parent.parent.parent
        self.host_name = self.config.get_value("HOSTNAME")
        self.os_type = platform.system().lower()
        if self.os_type in ['linux', 'darwin']:
            self.base_dir = Path.cwd().parent
        self.dir_path = {
            "config": self.base_dir / "config",
            "data": self.base_dir / "data",
            "certs": self.base_dir / "certs",
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
            "uid": self.config.get_value("INFLUX_UID"),
            "gid": self.config.get_value("INFLUX_GID"),
            "key": self.certs["influx_key"],
        }
        self.mongo = {
            "uid": self.config.get_value("MONGO_UID"),
            "gid": self.config.get_value("MONGO_GID"),
            "combined": self.certs["combined"],
        }
        self.rabbitmq = {
            "uid": self.config.get_value("RABBIT_UID"),
            "key": self.certs["rabbit_key"],
        }

        self.compose_file = self.base_dir / "compose.services.secure.yml"
        self.docker = DockerClient(compose_files=[self.compose_file])

    def _check_root_unix(self) -> None:
        """Check if script is run as root on Unix systems."""
        try:
            is_root = os.geteuid() == 0
        except AttributeError:
            is_root = False
        if not is_root:
            print("This script must be run as root (Linux/MacOS)." \
            "try sudo -E env PATH=\"$PATH\" dtaas-services setup")
            sys.exit(1)


    def copy_certs(self) -> Tuple[bool, str]:
        """Obtain TLS certificates for services."""
        source_dir = Path(self.config.get_value("CERTS_SRC"))
        if not source_dir.exists():
            return False, f"Source directory for certs not found: {source_dir}"
        self.certs["dir"].mkdir(parents=True, exist_ok=True)
        try:
            for path in source_dir.glob("*"):
                if path.is_file():
                    dest = self.certs["dir"] / path.name
                    if path.resolve() == dest.resolve():
                        continue
                    shutil.copy2(path, dest)
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


    def _create_combined_pem(self) -> None:
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
            self._create_combined_pem()
            if self.os_type in ("linux", "darwin"):
                self.certs["combined"].chmod(0o600)
                shutil.chown(self.certs["combined"], 
                             user=int(self.mongo["uid"]), 
                             group=int(self.mongo["gid"]))
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
                shutil.chown(self.influx["key"], 
                             user=int(self.influx["uid"]), 
                             group=int(self.influx["gid"]))
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
                shutil.chown(self.rabbitmq["key"], user=int(self.rabbitmq["uid"]))            
                return True, (f"{self.rabbitmq['key']} created and ownership set to user "
                f"{self.rabbitmq['uid']}.")
        except OSError as e:
            return False, f"Error setting permissions for RabbitMQ: {e}"
        except subprocess.CalledProcessError as e:
            return False, f"Failed to set ownership: {str(e)}"


    def start_services(self) -> Tuple[bool, str]:
        """Start the platform services using docker compose."""
        if not self.compose_file.exists():
            err = FileNotFoundError(f"Docker Compose file not found: {self.compose_file}")
            return err, str(err)
        try:
            self.docker.compose.up(detach=True)
            return None, "Docker Compose started successfully"
        except Exception as e:
            return e, f"Failed to start Docker Compose: {str(e)}"

    def stop_services(self) -> Tuple[Optional[Exception], str]:
        """
        Stop platform services using Docker Compose.
        
        Returns:
            Tuple of (Exception or None, message)
        """
        if not self.compose_file.exists():
            err = FileNotFoundError(f"Docker Compose file not found: {self.compose_file}")
            return err, str(err)
        
        try:
            self.docker.compose.down()
            return None, "Services stopped successfully"
        except Exception as e:
            return e, f"Failed to stop services: {str(e)}"


    def get_status(self) -> Tuple[Optional[Exception], str]:
        """
        Get status of platform services.
        
        Returns:
            Tuple of (Exception or None, status message)
        """
        if not self.compose_file.exists():
            err = FileNotFoundError(f"Docker Compose file not found: {self.compose_file}")
            return err, str(err)
        
        try:
            result = self.docker.compose.ps()  
            return None, str(result)
        except Exception as e:
            return e, f"Failed to get status: {str(e)}"
