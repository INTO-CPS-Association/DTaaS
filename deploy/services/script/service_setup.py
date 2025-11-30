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

class ServicesConfig:

    def __init__(self) -> None:
        """" initialize configuration paths and files"""
        self.base_dir = Path(__file__).parent.resolve()
        self.host_name = self.get_required_env("HOSTNAME")
        self.INFLUX_UID = self.get_required_env("INFLUX_UID")
        self.INFLUX_GID = self.get_required_env("INFLUX_GID")
        self.MONGO_UID = self.get_required_env("MONGO_UID")
        self.MONGO_GID = self.get_required_env("MONGO_GID")
        self.RABBIT_UID = self.get_required_env("RABBIT_UID")
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
            if self.os_type in ("linux", "darwin"):
                try:
                    is_root = (os.geteuid() == 0)
                except AttributeError:
                    is_root = False
                if not is_root:
                    print("This script must be run as root (Linux/MacOS).") 
                    exit(1)


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

  
    def permissions__mongodb(self) -> Tuple[bool, str]:
        """
        Combine privkey.pem + fullchain.pem -> combined.pem and set permissions for Mongodb.
        """
        if self.os_type in ("linux", "darwin"):  
            try:
                self.cert_dir.mkdir(parents=True, exist_ok=True)  
                with open(self.combined, "wb") as out_f: 
                    with open(self.privkey, "rb") as pk:
                        out_f.write(pk.read())
                    with open(self.fullchain, "rb") as fc:
                        out_f.write(fc.read())

                self.combined.chmod(0o600)
                subprocess.run(["chown", f"{self.MONGO_UID}:{self.MONGO_GID}", str(self.combined)], check=True)
                return True, f"combined.pem created at {self.combined} with mode 600 and ownership set to {self.MONGO_UID}:{self.MONGO_GID}."
            except Exception as e:
                return False, f"Error creating combined.pem: {e}"
            
        elif self.os_type == "windows":
            return False, "Windows: Not implemented."


    def permissions__influxdb(self) -> Tuple[bool, str]:
        """
        Copy privkey.pem -> privkey-influxdb.pem and change owner.
        """  
        if self.os_type in ("linux", "darwin"):
            try:
                shutil.copy2(self.privkey, self.influx_key)
                subprocess.run(["chown", f"{self.INFLUX_UID}:{self.INFLUX_GID}", str(self.influx_key)], check=True)
                return True, f"{self.influx_key} created and ownership set to {self.INFLUX_UID}:{self.INFLUX_GID}."
            except subprocess.CalledProcessError as cpe:
                return False, f"chown failed while setting ownership for {self.influx_key}: {cpe}"
            except Exception as e:
                return False, f"Error creating {self.influx_key}: {e}"
        
        elif self.os_type == "windows":
            return False, "Windows: Not implemented."

    def permissions__rabbitmq(self) -> Tuple[bool, str]:
        """
        Copy privkey.pem -> privkey-rabbitmq.pem and set owner to 999 (user-only).
        """
        if self.os_type in ("linux", "darwin"):
            try:
                # Copy to a new file.
                shutil.copy2(self.privkey, self.rabbit_key)
                subprocess.run(["chown", f"{self.RABBIT_UID}", str(self.rabbit_key)], check=True)
                return True, f"{self.rabbit_key} created and ownership set to user {self.RABBIT_UID}."
            except Exception as e:
                return False, f"Error creating {self.rabbit_key}: {e}"
            
        elif self.os_type == "windows":
            return False, "Windows: Not implemented."
            

    def get_required_env(self, var_name: str) -> str:
        """Retrieve a required environment variable from services.env."""
        env_path = Path(__file__).parent.parent / "config" / "services.env"
        load_dotenv(dotenv_path=env_path)
        value = os.getenv(var_name)
        if value is None:
            raise RuntimeError(
                f"Required environment variable '{var_name}' is not set. "
                f"Please ensure it is defined in the services.env file."
            )
        return value
    
    
if __name__ == "__main__":
    cfg = ServicesConfig()
    steps = [
        #cfg.copy_letsencrypt_certs,
        cfg.permissions__mongodb,
        cfg.permissions__influxdb,
        cfg.permissions__rabbitmq,
    ]
    for step in steps:
        ok, msg = step()
        if not ok:
            print(f"ERROR: {msg}", file=sys.stderr)
            sys.exit(3)
        else:
            print(f"OK: {msg}")
    sys.exit(0)
