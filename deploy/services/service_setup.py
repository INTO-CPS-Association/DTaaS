import platform 
import os
from pathlib import Path
import argparse
import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Tuple

class ServicesConfig:
    def __init__(self, host_name : str = "services.foo.com") -> None:
        """" initialize configuration paths and files"""
        self.base_dir = Path(__file__).parent.resolve()
        self.host_name = host_name
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


    def obtain_tls_certs(self) -> Tuple[bool, str]:
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
                # TODO: Will we have only 1 key (one privkey and one fullchain)?
                # Then we do not need to pick the latest files.
                priv_candidates = list(certs_target.glob("privkey*.pem"))
                full_candidates = list(certs_target.glob("fullchain*.pem"))

                if priv_candidates:
                    latest_priv = max(priv_candidates, key=lambda p: p.name)
                    target_priv = certs_target / "privkey.pem"
                    if target_priv.exists():
                        target_priv.unlink()
                    latest_priv.rename(target_priv)

                if full_candidates:
                    latest_full = max(full_candidates, key=lambda p: p.name)
                    target_full = certs_target / "fullchain.pem"
                    if target_full.exists():
                        target_full.unlink()
                    latest_full.rename(target_full)

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
            with open(self.combined, "wb") as out_f: 
                # cat privkey.pem fullchain.pem > combined.pem
                with open(self.privkey, "rb") as pk:
                    out_f.write(pk.read())
                with open(self.fullchain, "rb") as fc:
                    out_f.write(fc.read())

            # Set permission mode 600 (owner read/write only)
            self.combined.chmod(0o600)
            # Set ownership to mongodb's UID:GID inside container (999:999)
            if self.os_type in ("linux", "darwin"):
                subprocess.run(["chown", "999:999", str(self.combined)], check=True)
            return True, f"combined.pem created at {self.combined} with mode 600 and ownership set."
        except Exception as e:
            return False, f"Error creating combined.pem: {e}"



    def permissions__rabbitMQ(self) -> Tuple[bool, str]:
        """
        Copy privkey.pem -> privkey-rabbitmq.pem and set owner to 999 (user-only).
        """
        if not self.privkey.exists():
            return False, f"Missing {self.privkey}; run obtain_tls_certs first."

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
                subprocess.run(["chown", "999", str(self.rabbit_key)], check=True)
            return True, f"{self.rabbit_key} created and ownership set to user 999."
        except Exception as e:
            return False, f"Error creating {self.rabbit_key}: {e}"
        

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("host")
    parser.add_argument(
        "action",
        choices=["copy-certs", "fix-perms-mongo", "fix-perms-influx", "fix-perms-rabbit",],
    )
    args = parser.parse_args()

    cfg = ServicesConfig(args.host)

    if args.action == "copy-certs":
        ok, msg = cfg.obtain_tls_certs()
    elif args.action == "fix-perms-mongo":
        ok, msg = cfg.permissions__mongoDB()
    elif args.action == "fix-perms-influx":
        ok, msg = cfg.permissions__influxDB()
    elif args.action == "fix-perms-rabbit":
        ok, msg = cfg.permissions__rabbitMQ()
    else:
        ok, msg = False, "Unknown action"

    sys.exit(0 if ok else 3)
