"""Compose file rendering entrypoint."""

from __future__ import annotations

from .compose_services import (
    client_lines,
    forward_auth_lines,
    libms_lines,
    traefik_lines,
    user_lines,
)
from .models import Images, Scenario


def _scenario_service_blocks(scenario: Scenario, images: Images) -> list[list[str]]:
    blocks = [traefik_lines(scenario.secure, images)]
    if scenario.server:
        blocks.append(libms_lines(scenario.secure, images))
    blocks.extend(
        [
            client_lines(scenario.secure, scenario.server, images),
            user_lines("user1", "username1", scenario, images),
        ]
    )
    if scenario.server:
        blocks.extend(
            [
                user_lines("user2", "username2", scenario, images),
                forward_auth_lines(scenario.secure, images),
            ]
        )
    return blocks


def compose_content(scenario: Scenario, images: Images) -> str:
    lines = ["services:"]
    for block in _scenario_service_blocks(scenario, images):
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
