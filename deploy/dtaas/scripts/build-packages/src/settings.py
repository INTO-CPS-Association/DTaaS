"""Configuration loading for build-packages."""

from __future__ import annotations

import tomllib
from pathlib import Path

from .models import Images


def _required_string(table: dict[str, object], key: str) -> str:
    value = table.get(key)
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"Missing or invalid images.{key} in dtaas.toml")
    return value.strip()


def load_images(config_path: Path) -> Images:
    """Load image references from dtaas.toml."""
    with config_path.open("rb") as fp:
        data = tomllib.load(fp)
    images = data.get("images")
    if not isinstance(images, dict):
        raise ValueError("Missing [images] section in dtaas.toml")
    return Images(
        traefik=_required_string(images, "traefik"),
        forward_auth=_required_string(images, "forward_auth"),
        client=_required_string(images, "client"),
        libms=_required_string(images, "libms"),
        workspace=_required_string(images, "workspace"),
    )
