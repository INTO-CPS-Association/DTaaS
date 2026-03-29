"""Small compose helper utilities."""

from __future__ import annotations


def quoted_items(values: list[str], spaces: int = 4) -> list[str]:
    """Render quoted yaml list lines."""
    prefix = " " * spaces
    return [f'{prefix}- "{value}"' for value in values]


def plain_items(values: list[str], spaces: int = 4) -> list[str]:
    """Render yaml list lines."""
    prefix = " " * spaces
    return [f"{prefix}- {value}" for value in values]


def router_entrypoint(service_name: str, secure: bool) -> str:
    """Render router entrypoint label."""
    entrypoint = "web-secure" if secure else "web"
    return f"traefik.http.routers.{service_name}.entryPoints={entrypoint}"
