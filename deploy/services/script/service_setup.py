import platform 
import os
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Tuple
from dotenv import load_dotenv

class ServicesConfig:

    def __init__(self) -> None:
        """Initialize configuration paths and files, grouped by service."""
        self.base_dir = Path(__file__).parent.resolve()
        self.env_file = self.base_dir.parent / "config" / "services.env"
        self.env = self._load_env(self.env_file)

        self.host_name = self.get_required_env("HOSTNAME")

        self.dir_path = {
            "config": self.base_dir / "config",
            "data": self.base_dir / "data",
            "certs": self.base_dir / "certs",
            "script": self.base_dir / "script",
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

        if platform.system():
            self.os_type = platform.system().lower()
            if self.os_type in ("linux", "darwin"):
                try:
                    is_root = (os.geteuid() == 0)
                except AttributeError:
                    is_root = False
                if not is_root:
                    print("This script must be run as root (Linux/MacOS).")
                    exit(1)


    def _load_env(self, env_path: Path) -> dict:
        """Load environment variables from a file into a dictionary."""
        load_dotenv(dotenv_path=env_path, override=True)
        return dict(os.environ)


    def get_required_env(self, var_name: str) -> str:
        """Retrieve a required environment variable from the loaded env dict."""
        value = self.env.get(var_name)
        if value is None:
            raise RuntimeError(
                f"Required environment variable '{var_name}' is not set. "
                f"Please ensure it is defined in the services.env file."
            )
        return value
    

    def copy_letsencrypt_certs(self) -> Tuple[bool, str]:
        """
        Obtain TLS certificates for services.
        Returns: (success: bool, message: str)
        """
        source_dir = Path(f"/etc/letsencrypt/archive/{self.host_name}")
        if not source_dir.exists():
            return False, f"Source directory for certs not found: {source_dir}"
        self.certs["dir"].mkdir(parents=True, exist_ok=True)
        try:
            for files in source_dir.glob("*"):
                shutil.copy2(files, self.certs["dir"]  / files.name)
            self._normalize_cert_candidates("privkey")
            self._normalize_cert_candidates("fullchain")
            return True, f"Certificates copied and normalized in {self.certs['dir']}"
        except Exception as e:
            return False, f"Error copying/normalizing certificates: {e}"


    def _normalize_cert_candidates(self, prefix: str) -> None:
        """
        Keep only the latest cert file for a given prefix, rename it, and remove others.
        """
        candidates = list(self.certs["dir"].glob(f"{prefix}*.pem"))
        if candidates:
            latest = max(candidates, key=lambda p: p.stat().st_mtime)
            target = self.certs["dir"] / f"{prefix}.pem"
            target.unlink(missing_ok=True)
            latest.rename(target)
            for p in candidates:
                if p != target:
                    p.unlink(missing_ok=True)
    

    def permissions__mongodb(self) -> Tuple[bool, str]:
        """
        Combine privkey.pem + fullchain.pem -> combined.pem and set permissions for Mongodb.
        """
        try:
            self.certs["dir"].mkdir(parents=True, exist_ok=True)
            with open(self.certs["combined"], "wb") as out_f:
                with open(self.certs["privkey"], "rb") as pk:
                    out_f.write(pk.read())
                with open(self.certs["fullchain"], "rb") as fc:
                    out_f.write(fc.read())

            self.certs["combined"].chmod(0o600)
            subprocess.run(["chown", f"{self.mongo['uid']}:{self.mongo['gid']}", str(self.certs["combined"])] , check=True)
            return True, f"combined.pem created at {self.certs['combined']} with mode 600 and ownership set to {self.mongo['uid']}:{self.mongo['gid']}."
        except Exception as e:
            return False, f"Error creating combined.pem: {e}"


    def permissions__influxdb(self) -> Tuple[bool, str]:
        """
        Copy privkey.pem -> privkey-influxdb.pem and change owner.
        """  
        try:
            shutil.copy2(self.certs["privkey"], self.influx["key"])
            subprocess.run(["chown", f"{self.influx['uid']}:{self.influx['gid']}", str(self.influx["key"])] , check=True)
            return True, f"{self.influx['key']} created and ownership set to {self.influx['uid']}:{self.influx['gid']}."
        except subprocess.CalledProcessError as cpe:
            return False, f"chown failed while setting ownership for {self.influx['key']}: {cpe}"
        except Exception as e:
            return False, f"Error creating {self.influx['key']}: {e}"
    

    def permissions__rabbitmq(self) -> Tuple[bool, str]:
        """
        Copy privkey.pem -> privkey-rabbitmq.pem and set owner to 999 (user-only).
        """
        try:
            shutil.copy2(self.certs["privkey"], self.rabbitmq["key"])
            subprocess.run(["chown", f"{self.rabbitmq['uid']}", str(self.rabbitmq["key"])] , check=True)
            return True, f"{self.rabbitmq['key']} created and ownership set to user {self.rabbitmq['uid']}."
        except Exception as e:
            return False, f"Error creating {self.rabbitmq['key']}: {e}"
    

    def start_docker_compose(self) -> Tuple[bool, str]:
        """
        Start the platform services using docker compose.
        """
        try:
            result = subprocess.run(
                ["docker", "compose", "-f", str(self.compose_file), "up", "-d"],
                check=True,
                capture_output=True,
                text=True
            )
            return True, f"Docker Compose started successfully:\n{result.stdout}"
        except subprocess.CalledProcessError as e:
            return False, f"Failed to start Docker Compose:\n{e.stderr}"
        

if __name__ == "__main__":
    cfg = ServicesConfig()
    steps = [
        #cfg.copy_letsencrypt_certs,
        cfg.permissions__mongodb,
        cfg.permissions__influxdb,
        cfg.permissions__rabbitmq,
        cfg.start_docker_compose,
    ]
    for step in steps:
        ok, msg = step()
        if not ok:
            print(f"ERROR: {msg}", file=sys.stderr)
            sys.exit(3)
        else:
            print(f"OK: {msg}")
    sys.exit(0)
