"""Host changes that need root: hosts entry, port limit, CA trust."""

import shutil
from pathlib import Path

from shell import run, step, sudo

HOSTS_FILE = Path("/etc/hosts")
PORT_LIMIT_FILE = Path("/proc/sys/net/ipv4/ip_unprivileged_port_start")
SYSCTL_CONF = Path("/etc/sysctl.d/99-dtaas-local-server.conf")
PORT_LIMIT_SETTING = "net.ipv4.ip_unprivileged_port_start=80"


def hosts_line(hostname):
    """Return the /etc/hosts line that maps hostname to the local machine."""
    return f"127.0.0.1 {hostname}"


def has_hosts_entry(hosts_text, hostname):
    """Tell whether the hosts file text already maps hostname."""
    for line in hosts_text.splitlines():
        fields = line.split("#", 1)[0].split()
        if hostname in fields[1:]:
            return True
    return False


def add_hosts_entry(hostname):
    """Map hostname to 127.0.0.1 in /etc/hosts unless it is mapped already."""
    if has_hosts_entry(HOSTS_FILE.read_text(encoding="utf-8"), hostname):
        return
    step(f"Adding {hostname} to {HOSTS_FILE}")
    sudo(["tee", "-a", str(HOSTS_FILE)], input_text=hosts_line(hostname) + "\n")


def remove_hosts_entry(hostname):
    """Remove the line that add_hosts_entry wrote."""
    lines = HOSTS_FILE.read_text(encoding="utf-8").splitlines(keepends=True)
    kept = [line for line in lines if line.strip() != hosts_line(hostname)]
    if len(kept) != len(lines):
        step(f"Removing {hostname} from {HOSTS_FILE}")
        sudo(["tee", str(HOSTS_FILE)], input_text="".join(kept))


def detect_runtime():
    """Return 'rancher', 'desktop' or 'engine' for the active Docker daemon.

    Docker Desktop's WSL integration uses the 'default' context, so the
    daemon's operating system name is checked as well.
    """
    context = run(["docker", "context", "show"], capture=True)
    if context == "rancher-desktop":
        return "rancher"
    system = run(["docker", "info", "--format", "{{.OperatingSystem}}"],
                 capture=True)
    if context.startswith("desktop-") or system == "Docker Desktop":
        return "desktop"
    return "engine"


def allow_low_ports(runtime):
    """Let Rancher Desktop forward ports 80 and 443 as a normal user."""
    if runtime != "rancher" or int(PORT_LIMIT_FILE.read_text(encoding="utf-8")) <= 80:
        return
    step("Allowing unprivileged processes to bind ports 80 and above")
    sudo(["sysctl", "-w", PORT_LIMIT_SETTING])
    sudo(["tee", str(SYSCTL_CONF)], input_text=PORT_LIMIT_SETTING + "\n")


def install_mkcert():
    """Install mkcert and the NSS tools with apt unless mkcert is present."""
    if shutil.which("mkcert"):
        return
    if not shutil.which("apt-get"):
        raise RuntimeError("Install mkcert: https://github.com/FiloSottile/mkcert")
    step("Installing mkcert and libnss3-tools")
    sudo(["apt-get", "update"])
    sudo(["apt-get", "install", "-y", "mkcert", "libnss3-tools"])


def install_local_ca(ca_copy):
    """Create the mkcert root CA, trust it, and keep a copy at ca_copy."""
    step("Installing the mkcert root CA in the system and browser stores")
    run(["mkcert", "-install"])
    ca_root = Path(run(["mkcert", "-CAROOT"], capture=True))
    ca_copy.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(ca_root / "rootCA.pem", ca_copy)


def registry_ca_dir(runtime, registry):
    """Return the directory where the Docker daemon looks for a registry CA."""
    if runtime == "engine":
        return Path("/etc/docker/certs.d") / registry
    return Path.home() / ".docker" / "certs.d" / registry


def trust_registry_ca(runtime, registry, ca_file):
    """Make the Docker daemon trust the registry's certificate."""
    target = registry_ca_dir(runtime, registry)
    step(f"Trusting the CA for {registry} in {target}")
    if runtime == "engine":
        sudo(["mkdir", "-p", str(target)])
        sudo(["cp", str(ca_file), str(target / "ca.crt")])
        return
    target.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(ca_file, target / "ca.crt")
    if runtime == "desktop":
        print("Restart Docker Desktop so that it reads the new CA. On Windows,"
              " also add the CA to the Windows certificate store.")


def prepare_host(settings):
    """Run every host change the local server test needs."""
    runtime = detect_runtime()
    add_hosts_entry(settings.hostname)
    allow_low_ports(runtime)
    install_mkcert()
    install_local_ca(settings.ca_file)
    trust_registry_ca(runtime, settings.registry, settings.ca_file)
