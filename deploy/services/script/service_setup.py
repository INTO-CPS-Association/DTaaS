import platform 
import os
from pathlib import Path
import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Tuple
from dotenv import load_dotenv

env_path = Path(__file__).parent.parent / "config" / "services.env"
load_dotenv(dotenv_path=env_path)

HOSTNAME = os.environ["HOSTNAME"]
INFLUX_UID = os.environ["INFLUX_UID"]
INFLUX_GID = os.environ["INFLUX_GID"]
MONGO_UID = os.environ["MONGO_UID"]
MONGO_GID = os.environ["MONGO_GID"]
RABBIT_UID = os.environ["RABBIT_UID"]

class ServicesConfig:
    def __init__(self) -> None:
        """" initialize configuration paths and files"""
        self.base_dir = Path(__file__).parent.resolve()
        self.host_name = HOSTNAME
        self.config_dir = self.base_dir / "config"
        self.data_dir = self.base_dir / "data"
        self.certs_dir = self.base_dir / "certs"
        self.script_dir = self.base_dir / "script"
        self.env_file = self.config_dir / "services.env"
        self.env_template = self.config_dir / "services.env.template"
        self.compose_file = self.base_dir / "compose.services.secure.yml"

        self.cert_dir = self.certs_dir / self.host_name
        self.privkey = self.cert_dir / "privkey.pem"
        self.fullchain = self.cert_dir / "fullchain.pem"
        self.combined = self.cert_dir / "combined.pem"

        self.influx_key = self.cert_dir / "privkey-influxdb.pem"
        self.rabbit_key = self.cert_dir / "privkey-rabbitmq.pem"


        if platform.system():
            self.os_type = platform.system().lower()
        else:
            raise RuntimeError("Unable to determine operating system type.")


    def copy_letsencrypt_certs(self) -> Tuple[bool, str]:
        """
        Obtain TLS certificates for services.
        
        Returns:
            (success: bool, message: str)
        """
        # Target directory for certs
        certs_target = self.certs_dir / self.host_name

        if self.os_type in ("linux", "darwin"):  
            source_dir = Path(f"/etc/letsencrypt/archive/{self.host_name}")
            if not source_dir.exists():
                return False, f"Source directory for certs not found: {source_dir}"
            
            certs_target.mkdir(parents=True, exist_ok=True)
            try:
                for files in source_dir.glob("*"):
                    shutil.copy2(files, certs_target / files.name)
                # Copy/rename the latest certificates, and delete older versions.
                priv_candidates = list(certs_target.glob("privkey*.pem"))
                full_candidates = list(certs_target.glob("fullchain*.pem"))

                if priv_candidates:
                    latest_priv = max(priv_candidates, key=lambda p: p.name)
                    target_priv = certs_target / "privkey.pem"
                    if target_priv.exists():
                        target_priv.unlink()
                    latest_priv.rename(target_priv)
                    for p in priv_candidates:
                        if p != target_priv and p.exists():
                            p.unlink()

                if full_candidates:
                    latest_full = max(full_candidates, key=lambda p: p.name)
                    target_full = certs_target / "fullchain.pem"
                    if target_full.exists():
                        target_full.unlink()
                    latest_full.rename(target_full)
                    for p in full_candidates:
                        if p != target_full and p.exists():
                            p.unlink()

                return True, f"Certificates copied and normalized in {certs_target}"

            except Exception as e:
                return False, f"Error copying/normalizing certificates: {e}"

        elif self.os_type == "windows":
            return False, "Windows: Not implemented."
        else:
            return False, f"Unsupported OS: {self.os_type}" 
        
  
    def permissions__mongoDB(self) -> Tuple[bool, str]:
        """
        Combine privkey.pem + fullchain.pem -> combined.pem and set permissions for MongoDB.
        """

        if self.os_type in ("linux", "darwin"):
            try:
                is_root = (os.geteuid() == 0)
            except AttributeError:
                is_root = False
            if not is_root:
                return False, ("This operation requires root privileges, run with sudo.")

        try:
            self.cert_dir.mkdir(parents=True, exist_ok=True)  
            with open(self.combined, "wb") as out_f: 
                with open(self.privkey, "rb") as pk:
                    out_f.write(pk.read())
                with open(self.fullchain, "rb") as fc:
                    out_f.write(fc.read())

            self.combined.chmod(0o600)
            if self.os_type in ("linux", "darwin"):
                subprocess.run(["chown", f"{MONGO_UID}:{MONGO_GID}", str(self.combined)], check=True)
            return True, f"combined.pem created at {self.combined} with mode 600 and ownership set to {MONGO_UID}:{MONGO_GID}."
        except Exception as e:
            return False, f"Error creating combined.pem: {e}"


    def permissions__influxDB(self) -> Tuple[bool, str]:
        """
        Copy privkey.pem -> privkey-influxdb.pem and change owner.
        """
        cert_dir = self.certs_dir / self.host_name
        source_priv = cert_dir / "privkey.pem"
        influx_key = cert_dir / "privkey-influxdb.pem"

        if not source_priv.exists():
            return False, f"Missing {source_priv}; run obtain_tls_certs first."

        if self.os_type in ("linux", "darwin"):
            try:
                is_root = (os.geteuid() == 0)
            except AttributeError:
                is_root = False
            if not is_root:
                return False, ("This operation requires root privileges, run with sudo.")
        try:

            shutil.copy2(source_priv, influx_key)
            if self.os_type in ("linux", "darwin"):
                subprocess.run(["chown", f"{INFLUX_UID}:{INFLUX_GID}", str(influx_key)], check=True)
            return True, f"{influx_key} created and ownership set to {INFLUX_UID}:{INFLUX_GID}."
        except subprocess.CalledProcessError as cpe:
            return False, f"chown failed while setting ownership for {influx_key}: {cpe}"
        except Exception as e:
            return False, f"Error creating {influx_key}: {e}"

    def permissions__rabbitMQ(self) -> Tuple[bool, str]:
        """
        Copy privkey.pem -> privkey-rabbitmq.pem and set owner to 999 (user-only).
        """
        if not self.privkey.exists():
            return False, f"Missing {self.privkey}; run copy_letsencrypt_certs first."

        if self.os_type in ("linux", "darwin"):
            try:
                is_root = (os.geteuid() == 0)
            except AttributeError:
                is_root = False
            if not is_root:
                return False, ("This operation requires root privileges, run with sudo.")
        try:
            # Copy to a new file.
            shutil.copy2(self.privkey, self.rabbit_key)
            if self.os_type in ("linux", "darwin"):
                subprocess.run(["chown", f"{RABBIT_UID}", str(self.rabbit_key)], check=True)
            return True, f"{self.rabbit_key} created and ownership set to user {RABBIT_UID}."
        except Exception as e:
            return False, f"Error creating {self.rabbit_key}: {e}"
        

if __name__ == "__main__":
    cfg = ServicesConfig()
    steps = [
        #cfg.copy_letsencrypt_certs,
        cfg.permissions__mongoDB,
        cfg.permissions__influxDB,
        cfg.permissions__rabbitMQ,
    ]
    for step in steps:
        ok, msg = step()
        if not ok:
            print(f"ERROR: {msg}", file=sys.stderr)
            sys.exit(3)
        else:
            print(f"OK: {msg}")
    sys.exit(0)
