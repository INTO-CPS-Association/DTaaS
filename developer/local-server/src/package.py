"""Prepare a copy of the integrated GitLab package for local testing."""

import re
import shutil

from settings import TOOL_DIR, PACKAGE_SOURCE, USERS
from shell import run, step

EXAMPLE_HOST = "intocps.org"
FORWARD_AUTH_IMAGE = "traefik-forward-auth-local:latest"
CONFIG_FILES = (".env", "conf.server", "client.js")


def set_env_value(text, key, value):
    """Set key=value in the text of a .env file, appending it if missing."""
    pattern = re.compile(rf"^{re.escape(key)}=.*$", re.MULTILINE)
    if pattern.search(text):
        return pattern.sub(lambda _: f"{key}={value}", text)
    return text.rstrip("\n") + f"\n{key}={value}\n"


def check_hostname(settings):
    """Refuse a working directory prepared for another hostname.

    client.js and the certificate keep the hostname of the first run, so a
    different hostname needs its own working directory.
    """
    marker = settings.workdir / "hostname"
    if marker.exists():
        previous = marker.read_text(encoding="utf-8").strip()
        if previous != settings.hostname:
            raise RuntimeError(
                f"{settings.workdir} was prepared for {previous}; "
                "use another --workdir for a different hostname")
        return
    settings.workdir.mkdir(parents=True, exist_ok=True)
    marker.write_text(settings.hostname + "\n", encoding="utf-8")


def copy_package(settings):
    """Copy the package, refreshing its compose file on every run.

    The compose file always comes from deploy/, so the test runs what
    ships. Configuration files are copied from their examples only once.
    """
    target = settings.package_dir
    if not target.exists():
        step(f"Copying the integrated GitLab package to {target}")
        shutil.copytree(PACKAGE_SOURCE, target)
    shutil.copyfile(PACKAGE_SOURCE / "docker-compose.yml",
                    target / "docker-compose.yml")
    for name in CONFIG_FILES:
        config = target / "config" / name
        if not config.exists():
            shutil.copyfile(target / "config" / f"{name}.example", config)


def configure_package(settings):
    """Point the package's configuration at the test hostname."""
    config = settings.package_dir / "config"
    env = (config / ".env").read_text(encoding="utf-8")
    for key, value in (
        ("SERVER_DNS", settings.hostname),
        ("OAUTH_URL", settings.gitlab_url),
        ("REGISTRY_PORT", str(settings.registry_port)),
    ):
        env = set_env_value(env, key, value)
    (config / ".env").write_text(env, encoding="utf-8")
    client = (config / "client.js").read_text(encoding="utf-8")
    client = client.replace(EXAMPLE_HOST, settings.hostname)
    (config / "client.js").write_text(client, encoding="utf-8")


def create_directories(settings):
    """Create the bind-mounted directories that Docker cannot create on sshfs."""
    (settings.package_dir / "logs" / "logger").mkdir(parents=True, exist_ok=True)
    files = settings.package_dir / "files"
    for user in USERS:
        if not (files / user).exists():
            shutil.copytree(files / "template", files / user)


def create_certificates(settings):
    """Create the TLS certificate for the test hostname with mkcert."""
    certs = settings.package_dir / "certs"
    if (certs / "fullchain.pem").exists():
        return
    step(f"Creating a TLS certificate for {settings.hostname}")
    run(["mkcert", "-cert-file", str(certs / "fullchain.pem"),
         "-key-file", str(certs / "privkey.pem"),
         settings.hostname, "localhost", "127.0.0.1", "::1"])


def build_forward_auth_image(settings):
    """Build a traefik-forward-auth image that trusts the mkcert CA."""
    context = settings.workdir / "forward-auth"
    context.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(settings.ca_file, context / "rootCA.crt")
    shutil.copyfile(TOOL_DIR / "forward-auth" / "Dockerfile", context / "Dockerfile")
    step(f"Building {FORWARD_AUTH_IMAGE}")
    run(["docker", "build", "-q", "-t", FORWARD_AUTH_IMAGE, str(context)])


def prepare_package(settings):
    """Copy, configure and complete the package so that it can start."""
    check_hostname(settings)
    copy_package(settings)
    configure_package(settings)
    create_directories(settings)
    create_certificates(settings)
    shutil.copyfile(TOOL_DIR / "compose.local.yml",
                    settings.package_dir / "compose.local.yml")
    build_forward_auth_image(settings)
