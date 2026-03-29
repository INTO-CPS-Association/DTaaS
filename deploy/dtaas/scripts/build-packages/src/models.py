"""Data models for build-packages."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Scenario:
    """One generated deployment package variant."""

    name: str
    secure: bool
    server: bool
    title: str
    description: str


@dataclass(frozen=True)
class Images:
    """Container image references used by generated compose files."""

    traefik: str
    forward_auth: str
    client: str
    libms: str
    workspace: str


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
