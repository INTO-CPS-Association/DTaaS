#!/usr/bin/env python3
"""Build self-contained DTaaS docker installation packages."""

from __future__ import annotations

import argparse
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable
from textwrap import dedent

TRAEFIK_IMAGE = "traefik:v2.10"
FORWARD_AUTH_IMAGE = "thomseddon/traefik-forward-auth:latest"
CLIENT_IMAGE = "intocps/dtaas-web:1.0.1"
LIBMS_IMAGE = "intocps/libms:0.5.9"
WORKSPACE_IMAGE = "intocps/workspace:main-967bc10"


@dataclass(frozen=True)
class Scenario:
    """One output package variant."""

    name: str
    secure: bool
    server: bool
    title: str
    description: str


SCENARIOS: tuple[Scenario, ...] = (
    Scenario(
        name="localhost",
        secure=False,
        server=False,
        title="DTaaS localhost package",
        description="Single-user localhost deployment served over HTTP.",
    ),
    Scenario(
        name="secure-localhost",
        secure=True,
        server=False,
        title="DTaaS secure localhost package",
        description="Single-user localhost deployment served over HTTPS.",
    ),
    Scenario(
        name="server",
        secure=False,
        server=True,
        title="DTaaS server package",
        description="Multi-user server deployment served over HTTP with OAuth.",
    ),
    Scenario(
        name="secure-server",
        secure=True,
        server=True,
        title="DTaaS secure server package",
        description="Multi-user server deployment served over HTTPS with OAuth.",
    ),
)


def parse_args() -> argparse.Namespace:
    """Parse CLI arguments."""
    parser = argparse.ArgumentParser(description="Generate deploy/dtaas/docker packages")
    parser.add_argument(
        "--root",
        type=Path,
        default=Path(__file__).resolve().parents[3],
        help="Repository root",
    )
    parser.add_argument(
        "--clean",
        action="store_true",
        help="Remove existing generated package folders first",
    )
    return parser.parse_args()


def ensure_dir(path: Path) -> None:
    """Create directory if missing."""
    path.mkdir(parents=True, exist_ok=True)


def write_text(path: Path, content: str) -> None:
    """Write text file with trailing newline."""
    ensure_dir(path.parent)
    path.write_text(content.rstrip() + "\n", encoding="utf-8")


def copy_tree(src: Path, dst: Path) -> None:
    """Copy tree replacing destination when present."""
    if dst.exists():
        shutil.rmtree(dst)
    shutil.copytree(src, dst)


def package_root(root: Path) -> Path:
    """Path to generated package root."""
    return root / "deploy" / "dtaas" / "docker"


def source_root(root: Path) -> Path:
    """Path to source-of-truth root."""
    return root / "deploy" / "dtaas" / "src" / "common"


def local_env_example() -> str:
    """Localhost .env.example content."""
    return dedent(
        """
        DTAAS_DIR='/Users/username/DTaaS'
        username1='user1'
        """
    ).strip()


def server_env_example() -> str:
    """Server .env.example content."""
    return dedent(
        """
        DTAAS_DIR='/Users/username/DTaaS'
        SERVER_DNS='foo.com'
        OAUTH_URL='https://gitlab.foo.com'
        OAUTH_CLIENT_ID='xx'
        OAUTH_CLIENT_SECRET='xx'
        OAUTH_SECRET='random-secret-string'
        username1='user1'
        username2='user2'
        """
    ).strip()


def quoted_items(values: Iterable[str], spaces: int = 4) -> list[str]:
    """Render quoted yaml list lines."""
    prefix = " " * spaces
    return [f'{prefix}- "{value}"' for value in values]


def plain_items(values: Iterable[str], spaces: int = 4) -> list[str]:
    """Render unquoted yaml list lines."""
    prefix = " " * spaces
    return [f"{prefix}- {value}" for value in values]


def traefik_lines(secure: bool) -> list[str]:
    """Traefik service lines."""
    lines = [
        "traefik:",
        f"  image: {TRAEFIK_IMAGE}",
        "  restart: unless-stopped",
        "  command:",
        '    - "--log.level=DEBUG"',
        '    - "--api.insecure=true"',
        '    - "--providers.docker=true"',
        '    - "--entryPoints.web.address=:80"',
    ]
    if secure:
        lines.extend(
            [
                '    - "--entrypoints.web-secure.address=:443"',
                (
                    '    - "--entrypoints.web.http.redirections.entryPoint.'
                    'to=web-secure"'
                ),
                (
                    '    - "--entrypoints.web.http.redirections.entryPoint.'
                    'scheme=https"'
                ),
                (
                    '    - "--entrypoints.web.http.redirections.entrypoint.'
                    'permanent=true"'
                ),
                '    - "--providers.file.directory=/etc/traefik/dynamic"',
                '    - "--providers.file.watch=true"',
                "  ports:",
                '    - "80:80"',
                '    - "443:443"',
                "  volumes:",
                '    - "/var/run/docker.sock:/var/run/docker.sock:ro"',
                '    - "./dynamic/tls.yml:/etc/traefik/dynamic/tls.yml"',
                '    - "./certs:/etc/traefik-certs"',
            ]
        )
    else:
        lines.extend(
            [
                '    - "--entrypoints.web.forwardedHeaders.insecure=true"',
                '    - "--entrypoints.web.proxyProtocol.insecure=true"',
                "  ports:",
                '    - "80:80"',
                "  volumes:",
                "    - /var/run/docker.sock:/var/run/docker.sock",
            ]
        )
    lines.extend(["  networks:", "    - frontend", "    - users"])
    return lines


def client_lines(secure: bool, server: bool) -> list[str]:
    """Client service lines."""
    labels = ["traefik.enable=true"]
    if server:
        labels.extend(
            [
                "traefik.http.routers.client.entryPoints=web",
                "traefik.http.routers.client.middlewares=traefik-forward-auth",
            ]
        )
        rule = "Host(`${SERVER_DNS}`)&&PathPrefix(`/`)"
    else:
        labels.append("traefik.http.routers.client.entryPoints=web")
        rule = "PathPrefix(`/`)"

    if secure:
        labels = [x for x in labels if x != "traefik.http.routers.client.entryPoints=web"]
        labels.append("traefik.http.routers.client.tls=true")

    labels.extend(
        [
            "traefik.http.services.client.loadbalancer.server.port=4000",
            f"traefik.http.routers.client.rule={rule}",
        ]
    )

    env_file = "env.server.js" if server else "env.local.js"
    lines = [
        "client:",
        f"  image: {CLIENT_IMAGE}",
        "  restart: unless-stopped",
        "  volumes:",
        f"    - ./config/client/{env_file}:/dtaas/client/build/env.js",
        "  labels:",
        *quoted_items(labels),
        "  networks:",
        "    - frontend",
    ]
    return lines


def user_lines(
    *,
    service_name: str,
    username_var: str,
    secure: bool,
    server: bool,
) -> list[str]:
    """Workspace service lines."""
    labels = ["traefik.enable=true"]
    if server:
        labels.extend(
            [
                f"traefik.http.routers.{service_name}.entryPoints=web",
                (
                    f"traefik.http.routers.{service_name}.rule="
                    f"Host(`${{SERVER_DNS}}`)&&PathPrefix(`/${{{username_var}}}`)"
                ),
                f"traefik.http.routers.{service_name}.middlewares=traefik-forward-auth",
            ]
        )
    else:
        labels.extend(
            [
                f"traefik.http.routers.{service_name}.entryPoints=web",
                f"traefik.http.routers.{service_name}.rule=PathPrefix(`/${{{username_var}}}`)",
            ]
        )

    if secure:
        labels = [
            x for x in labels if x != f"traefik.http.routers.{service_name}.entryPoints=web"
        ]
        labels.append(f"traefik.http.routers.{service_name}.tls=true")

    return [
        f"{service_name}:",
        f"  image: {WORKSPACE_IMAGE}",
        "  restart: unless-stopped",
        "  volumes:",
        "    - ./files/common:/workspace/common",
        f"    - ./files/${{{username_var}}}:/workspace",
        "  environment:",
        f"    - MAIN_USER=${{{username_var}}}",
        '  shm_size: "512m"',
        "  cpus: 4",
        '  mem_limit: "4G"',
        "  pids_limit: 4960",
        "  labels:",
        *quoted_items(labels),
        "  networks:",
        "    - users",
    ]


def libms_lines(secure: bool) -> list[str]:
    """Libms service lines."""
    labels = [
        "traefik.enable=true",
        "traefik.http.services.libms.loadbalancer.server.port=4001",
        "traefik.http.routers.libms.rule=Host(`${SERVER_DNS}`)&&PathPrefix(`/lib`)",
    ]
    if secure:
        labels.append("traefik.http.routers.libms.tls=true")
    else:
        labels.append("traefik.http.routers.libms.entryPoints=web")
    labels.append("traefik.http.routers.libms.middlewares=traefik-forward-auth")

    return [
        "libms:",
        f"  image: {LIBMS_IMAGE}",
        "  restart: unless-stopped",
        "  volumes:",
        "    - ./files:/dtaas/libms/files",
        "  labels:",
        *quoted_items(labels),
        "  networks:",
        "    - frontend",
    ]


def forward_auth_lines(secure: bool) -> list[str]:
    """Forward-auth service lines."""
    entry = "web-secure" if secure else "web"
    volumes = ["./config/forward-auth/conf.server:/conf"]
    env = [
        "LOG_LEVEL=trace",
        "DEFAULT_PROVIDER=generic-oauth",
        "PROVIDERS_GENERIC_OAUTH_AUTH_URL=${OAUTH_URL}/oauth/authorize",
        "PROVIDERS_GENERIC_OAUTH_TOKEN_URL=${OAUTH_URL}/oauth/token",
        "PROVIDERS_GENERIC_OAUTH_USER_URL=${OAUTH_URL}/api/v4/user",
        "PROVIDERS_GENERIC_OAUTH_CLIENT_ID=${OAUTH_CLIENT_ID}",
        "PROVIDERS_GENERIC_OAUTH_CLIENT_SECRET=${OAUTH_CLIENT_SECRET}",
        "PROVIDERS_GENERIC_OAUTH_SCOPE=read_user",
        "SECRET=${OAUTH_SECRET}",
        "CONFIG=/conf",
    ]
    if secure:
        volumes.append("./config/forward-auth/resolv.conf:/etc/resolv.conf")
    else:
        env.insert(-1, "INSECURE_COOKIE=true")

    return [
        "traefik-forward-auth:",
        f"  image: {FORWARD_AUTH_IMAGE}",
        "  restart: unless-stopped",
        "  volumes:",
        *plain_items(volumes),
        "  environment:",
        *plain_items(env),
        "  labels:",
        '    - "traefik.enable=true"',
        f'    - "traefik.http.routers.redirect.entryPoints={entry}"',
        (
            '    - "traefik.http.routers.redirect.rule='
            'Host(`${SERVER_DNS}`)&&PathPrefix(`/_oauth`)"'
        ),
        '    - "traefik.http.routers.redirect.middlewares=traefik-forward-auth"',
        (
            '    - "traefik.http.middlewares.traefik-forward-auth.forwardauth.'
            'address=http://traefik-forward-auth:4181"'
        ),
        (
            '    - "traefik.http.middlewares.traefik-forward-auth.forwardauth.'
            'authResponseHeaders=X-Forwarded-User"'
        ),
        (
            '    - "traefik.http.services.traefik-forward-auth.loadbalancer.'
            'server.port=4181"'
        ),
        "  networks:",
        "    - frontend",
        "    - users",
    ]


def compose_content(scenario: Scenario) -> str:
    """Render docker-compose content."""
    blocks: list[list[str]] = [traefik_lines(scenario.secure)]
    if scenario.server:
        blocks.append(libms_lines(scenario.secure))
    blocks.append(client_lines(scenario.secure, scenario.server))
    blocks.append(
        user_lines(
            service_name="user1",
            username_var="username1",
            secure=scenario.secure,
            server=scenario.server,
        )
    )
    if scenario.server:
        blocks.append(
            user_lines(
                service_name="user2",
                username_var="username2",
                secure=scenario.secure,
                server=scenario.server,
            )
        )
        blocks.append(forward_auth_lines(scenario.secure))

    lines = ["services:"]
    for block in blocks:
        lines.extend(f"  {line}" if line else "" for line in block)
        lines.append("")
    lines.extend(
        [
            "networks:",
            "  frontend:",
            "    name: dtaas-frontend",
            "  users:",
            "    name: dtaas-users",
        ]
    )
    return "\n".join(lines)


def package_readme(scenario: Scenario) -> str:
    """Render README for each package."""
    protocol = "HTTPS" if scenario.secure else "HTTP"
    return dedent(
        f"""
        # {scenario.title}

        {scenario.description}

        ## Contents

        - `docker-compose.yml`
        - `.env.example`
        - `config/`
        - `files/`

        ## Configure

        1. Copy `.env.example` to `.env`.
        2. Update values for your installation.
        3. For secure scenarios, place TLS files under `certs/`.

        ## Run

        ```bash
        podman-compose up -d
        ```

        ## Stop

        ```bash
        podman-compose down
        ```

        ## Notes

        This package serves DTaaS over {protocol}.
        """
    ).strip()


def copy_common(src: Path, dst: Path, scenario: Scenario) -> None:
    """Copy shared content into one output scenario."""
    copy_tree(src / "files", dst / "files")

    ensure_dir(dst / "config" / "client")
    ensure_dir(dst / "config" / "forward-auth")
    client_file = "env.server.js" if scenario.server else "env.local.js"
    shutil.copy2(src / "config" / "client" / client_file, dst / "config" / "client" / client_file)

    if scenario.server:
        shutil.copy2(
            src / "config" / "forward-auth" / "conf.server",
            dst / "config" / "forward-auth" / "conf.server",
        )
        if scenario.secure:
            shutil.copy2(
                src / "config" / "forward-auth" / "resolv.conf",
                dst / "config" / "forward-auth" / "resolv.conf",
            )

    if scenario.secure:
        ensure_dir(dst / "dynamic")
        tls_src = "tls.server.yml" if scenario.server else "tls.local.yml"
        shutil.copy2(src / "config" / "traefik" / tls_src, dst / "dynamic" / "tls.yml")
        ensure_dir(dst / "certs")
        ensure_dir(dst / "certs" / "localhost")
        write_text(dst / "certs" / ".gitkeep", "")
        write_text(dst / "certs" / "localhost" / ".gitkeep", "")

    for asset in ("localhost.png", "localhost-https.png", "server.png", "traefik-forward-auth.png"):
        source = src / "assets" / asset
        if source.exists():
            shutil.copy2(source, dst / asset)


def write_package(root: Path, src: Path, scenario: Scenario) -> None:
    """Create one package folder."""
    target = root / scenario.name
    if target.exists():
        shutil.rmtree(target)
    ensure_dir(target)

    copy_common(src, target, scenario)
    write_text(target / "docker-compose.yml", compose_content(scenario))
    env_text = server_env_example() if scenario.server else local_env_example()
    write_text(target / ".env.example", env_text)
    write_text(target / "README.md", package_readme(scenario))


def clean_packages(root: Path) -> None:
    """Delete generated package folders."""
    for scenario in SCENARIOS:
        target = root / scenario.name
        if target.exists():
            shutil.rmtree(target)


def build_packages(root: Path, clean: bool = False) -> None:
    """Generate all four package variants."""
    src = source_root(root)
    out = package_root(root)
    ensure_dir(out)
    if clean:
        clean_packages(out)
    for scenario in SCENARIOS:
        write_package(out, src, scenario)


def main() -> None:
    """Script entrypoint."""
    args = parse_args()
    build_packages(args.root, clean=args.clean)


if __name__ == "__main__":
    main()
