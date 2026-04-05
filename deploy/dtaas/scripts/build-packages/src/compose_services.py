"""Compose service block rendering."""

from __future__ import annotations

from .compose_constants import (
    NETWORK_FRONTEND,
    NETWORK_USERS,
    RESTART_UNLESS_STOPPED,
    SERVICE_LABELS,
    SERVICE_NETWORKS,
    SERVICE_VOLUMES,
    TRAEFIK_ENABLE_LABEL,
)
from .compose_helpers import plain_items, quoted_items, router_entrypoint
from .models import Images, Scenario


def _traefik_commands(secure: bool) -> list[str]:
    commands = [
        "--log.level=INFO",
        "--providers.docker=true",
        "--entryPoints.web.address=:80",
    ]
    if secure:
        commands.extend(
            [
                "--entrypoints.web-secure.address=:443",
                "--entrypoints.web.http.redirections.entryPoint.to=web-secure",
                "--entrypoints.web.http.redirections.entryPoint.scheme=https",
                "--entrypoints.web.http.redirections.entrypoint.permanent=true",
                "--providers.file.directory=/etc/traefik/config",
                "--providers.file.watch=true",
            ]
        )
    else:
        commands.extend(
            [
                "--entrypoints.web.forwardedHeaders.insecure=true",
                "--entrypoints.web.proxyProtocol.insecure=true",
            ]
        )
    return commands


def _traefik_ports(secure: bool) -> list[str]:
    ports = ["80:80"]
    if secure:
        ports.append("443:443")
    return ports


def _traefik_volumes(secure: bool) -> list[str]:
    volumes = ["/var/run/docker.sock:/var/run/docker.sock:ro"]
    if secure:
        volumes.extend(
            [
                "./config/traefik/tls.yml:/etc/traefik/config/tls.yml",
                "./certs:/etc/traefik-certs",
            ]
        )
    return volumes


def traefik_lines(secure: bool, images: Images) -> list[str]:
    return [
        "traefik:",
        f"  image: {images.traefik}",
        RESTART_UNLESS_STOPPED,
        "  command:",
        *quoted_items(_traefik_commands(secure)),
        "  ports:",
        *quoted_items(_traefik_ports(secure)),
        SERVICE_VOLUMES,
        *plain_items(_traefik_volumes(secure)),
        SERVICE_NETWORKS,
        NETWORK_FRONTEND,
        NETWORK_USERS,
    ]


def _client_labels(secure: bool, server: bool) -> list[str]:
    labels = [TRAEFIK_ENABLE_LABEL, router_entrypoint("client", secure)]
    if secure:
        labels.append("traefik.http.routers.client.tls=true")
    if server:
        labels.append("traefik.http.routers.client.middlewares=traefik-forward-auth")
        route = "Host(`${SERVER_DNS}`)&&PathPrefix(`/`)"
    else:
        route = "PathPrefix(`/`)"
    labels.extend(
        [
            "traefik.http.services.client.loadbalancer.server.port=4000",
            f"traefik.http.routers.client.rule={route}",
        ]
    )
    return labels


def client_lines(secure: bool, server: bool, images: Images) -> list[str]:
    env_file = "env.server.js" if server else "env.local.js"
    return [
        "client:",
        f"  image: {images.client}",
        RESTART_UNLESS_STOPPED,
        SERVICE_VOLUMES,
        f"    - ./config/client/{env_file}:/dtaas/client/build/env.js",
        SERVICE_LABELS,
        *quoted_items(_client_labels(secure, server)),
        SERVICE_NETWORKS,
        NETWORK_FRONTEND,
    ]


def _user_route(username_var: str, server: bool) -> str:
    if server:
        return f"Host(`${{SERVER_DNS}}`)&&PathPrefix(`/${{{username_var}}}`)"
    return f"PathPrefix(`/${{{username_var}}}`)"


def _user_labels(
    service_name: str,
    username_var: str,
    scenario: Scenario,
) -> list[str]:
    labels = [TRAEFIK_ENABLE_LABEL, router_entrypoint(service_name, scenario.secure)]
    labels.append(
        f"traefik.http.routers.{service_name}.rule="
        f"{_user_route(username_var, scenario.server)}"
    )
    if scenario.secure:
        labels.append(f"traefik.http.routers.{service_name}.tls=true")
    if scenario.server:
        labels.append(
            f"traefik.http.routers.{service_name}.middlewares=traefik-forward-auth"
        )
    return labels


def user_lines(
    user: tuple[str, str],
    scenario: Scenario,
    images: Images,
) -> list[str]:
    service_name, username_var = user
    return [
        f"{service_name}:",
        f"  image: {images.workspace}",
        RESTART_UNLESS_STOPPED,
        SERVICE_VOLUMES,
        "    - ./files/common:/workspace/common",
        f"    - ./files/${{{username_var}}}:/workspace",
        "  environment:",
        f"    - MAIN_USER=${{{username_var}}}",
        '  shm_size: "512m"',
        "  cpus: 4",
        '  mem_limit: "4G"',
        "  pids_limit: 4960",
        SERVICE_LABELS,
        *quoted_items(_user_labels(service_name, username_var, scenario)),
        SERVICE_NETWORKS,
        NETWORK_USERS,
    ]


def libms_lines(secure: bool, images: Images) -> list[str]:
    labels = [
        TRAEFIK_ENABLE_LABEL,
        router_entrypoint("libms", secure),
        "traefik.http.services.libms.loadbalancer.server.port=4001",
        "traefik.http.routers.libms.rule=Host(`${SERVER_DNS}`)&&PathPrefix(`/lib`)",
        "traefik.http.routers.libms.middlewares=traefik-forward-auth",
    ]
    if secure:
        labels.append("traefik.http.routers.libms.tls=true")
    return [
        "libms:",
        f"  image: {images.libms}",
        RESTART_UNLESS_STOPPED,
        SERVICE_VOLUMES,
        "    - ./files/common:/dtaas/libms/files",
        SERVICE_LABELS,
        *quoted_items(labels),
        SERVICE_NETWORKS,
        NETWORK_FRONTEND,
    ]


def _forward_auth_environment(secure: bool) -> list[str]:
    env = [
        "LOG_LEVEL=warn",
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
    if not secure:
        env.insert(-1, "INSECURE_COOKIE=true")
    return env


def _forward_auth_labels(secure: bool) -> list[str]:
    entrypoint = "web-secure" if secure else "web"
    return [
        TRAEFIK_ENABLE_LABEL,
        f"traefik.http.routers.redirect.entryPoints={entrypoint}",
        (
            "traefik.http.routers.redirect.rule="
            + "Host(`${SERVER_DNS}`)&&PathPrefix(`/_oauth`)"
        ),
        "traefik.http.routers.redirect.middlewares=traefik-forward-auth",
        "traefik.http.middlewares.traefik-forward-auth.forwardauth."
        "address=http://traefik-forward-auth:4181",
        "traefik.http.middlewares.traefik-forward-auth.forwardauth."
        "authResponseHeaders=X-Forwarded-User",
        "traefik.http.services.traefik-forward-auth.loadbalancer.server.port=4181",
    ]


def _forward_auth_volumes(secure: bool) -> list[str]:
    volumes = ["./config/forward-auth/conf.server:/conf"]
    if secure:
        volumes.append("./config/forward-auth/resolv.conf:/etc/resolv.conf")
    return volumes


def forward_auth_lines(secure: bool, images: Images) -> list[str]:
    return [
        "traefik-forward-auth:",
        f"  image: {images.forward_auth}",
        RESTART_UNLESS_STOPPED,
        SERVICE_VOLUMES,
        *plain_items(_forward_auth_volumes(secure)),
        "  environment:",
        *plain_items(_forward_auth_environment(secure)),
        SERVICE_LABELS,
        *quoted_items(_forward_auth_labels(secure)),
        SERVICE_NETWORKS,
        NETWORK_FRONTEND,
        NETWORK_USERS,
    ]
