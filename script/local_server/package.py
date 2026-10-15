"""Prepare a copy of the integrated GitLab package for local testing."""

import re
import shutil
from string import Template

from settings import PACKAGE_SOURCE, USERS
from shell import run, step

EXAMPLE_HOST = "intocps.org"
FORWARD_AUTH_IMAGE = "traefik-forward-auth-local:latest"
FORWARD_AUTH_DOCKERFILE = """\
FROM alpine:latest AS cert-builder
RUN apk add --no-cache ca-certificates
COPY rootCA.crt /usr/local/share/ca-certificates/
RUN update-ca-certificates

FROM thomseddon/traefik-forward-auth:latest
COPY --from=cert-builder /etc/ssl/certs/ca-certificates.crt \\
     /etc/ssl/certs/ca-certificates.crt
CMD ["traefik-forward-auth"]
"""
CONFIG_FILES = (".env", "conf.server", "client.js")
# The alias makes the hostname resolve to Traefik inside the frontend network.
# GitLab gets another hostname because Docker also publishes a container's
# hostname on its networks. Named volumes keep GitLab's data off bind mounts.
COMPOSE_OVERRIDE = Template("""services:
  traefik:
    networks:
      frontend:
        aliases:
          - $hostname
      users: {}
  traefik-forward-auth:
    image: $image
  gitlab:
    hostname: gitlab
    volumes:
      - gitlab-config:/etc/gitlab
      - gitlab-logs:/var/log/gitlab
      - gitlab-data:/var/opt/gitlab

volumes:
  gitlab-config:
  gitlab-logs:
  gitlab-data:
""")


def set_env_value(text, key, value):
    """Set key=value in the text of a .env file, appending it if missing."""
    pattern = re.compile(rf"^{re.escape(key)}=.*$", re.MULTILINE)
    if pattern.search(text):
        return pattern.sub(lambda _: f"{key}={value}", text)
    return text.rstrip("\n") + f"\n{key}={value}\n"


def compose_override(hostname):
    """Return the compose override that adapts the package to one machine."""
    return COMPOSE_OVERRIDE.substitute(hostname=hostname, image=FORWARD_AUTH_IMAGE)


def copy_package(settings):
    """Copy the package and its example configuration files once."""
    target = settings.package_dir
    if not target.exists():
        step(f"Copying the integrated GitLab package to {target}")
        shutil.copytree(PACKAGE_SOURCE, target)
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
    (context / "Dockerfile").write_text(FORWARD_AUTH_DOCKERFILE, encoding="utf-8")
    step(f"Building {FORWARD_AUTH_IMAGE}")
    run(["docker", "build", "-q", "-t", FORWARD_AUTH_IMAGE, str(context)])


def prepare_package(settings):
    """Copy, configure and complete the package so that it can start."""
    copy_package(settings)
    configure_package(settings)
    create_directories(settings)
    create_certificates(settings)
    (settings.package_dir / "compose.local.yml").write_text(
        compose_override(settings.hostname), encoding="utf-8")
    build_forward_auth_image(settings)
