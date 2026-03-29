"""Path helpers for build-packages."""

from __future__ import annotations

from pathlib import Path

from .models import Scenario


def package_root(repo_root: Path) -> Path:
    """Path to generated package root."""
    return repo_root / "deploy" / "dtaas" / "docker"


def source_root(repo_root: Path) -> Path:
    """Path to package source templates."""
    return repo_root / "deploy" / "dtaas" / "src" / "common"


def env_example_name(scenario: Scenario) -> str:
    """Source env example name for scenario."""
    return ".env.server.example" if scenario.server else ".env.local.example"


def build_packages_root(repo_root: Path) -> Path:
    """Directory containing build-packages scripts and config."""
    return repo_root / "deploy" / "dtaas" / "scripts" / "build-packages"
