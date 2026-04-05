"""Package generation orchestrator for build-packages."""

from __future__ import annotations

import shutil
from pathlib import Path

from .filesystem import copy_file, ensure_dir, replace_tree, write_text
from .layout import env_example_name, readme_template_name
from .models import Images, SCENARIOS, Scenario
from .compose_renderer import compose_content


def _copy_localhost_files(src: Path, dst: Path) -> None:
    files_root = dst / "files"
    if files_root.exists():
        shutil.rmtree(files_root)
    ensure_dir(files_root)
    replace_tree(src / "files" / "common", files_root / "common")
    replace_tree(src / "files" / "user1", files_root / "user1")


def _copy_server_files(src: Path, dst: Path) -> None:
    replace_tree(src / "files", dst / "files")


def _copy_files_for_scenario(src: Path, dst: Path, scenario: Scenario) -> None:
    if scenario.server:
        _copy_server_files(src, dst)
        return
    _copy_localhost_files(src, dst)


def _copy_client_config(src: Path, dst: Path, scenario: Scenario) -> None:
    ensure_dir(dst / "config" / "client")
    env_file = "env.server.js" if scenario.server else "env.local.js"
    copy_file(
        src / "config" / "client" / env_file,
        dst / "config" / "client" / env_file,
    )


def _copy_server_only_configs(src: Path, dst: Path, scenario: Scenario) -> None:
    if not scenario.server:
        return
    ensure_dir(dst / "config" / "forward-auth")
    copy_file(
        src / "config" / "forward-auth" / "conf.server",
        dst / "config" / "forward-auth" / "conf.server",
    )
    copy_file(src / "config" / "libms.yaml", dst / "config" / "libms.yaml")
    if scenario.secure:
        copy_file(
            src / "config" / "forward-auth" / "resolv.conf",
            dst / "config" / "forward-auth" / "resolv.conf",
        )


def _copy_tls_config_and_placeholders(
    src: Path,
    dst: Path,
    scenario: Scenario,
) -> None:
    if not scenario.secure:
        return
    tls_source = "tls.server.yml" if scenario.server else "tls.local.yml"
    copy_file(
        src / "config" / "traefik" / tls_source,
        dst / "config" / "traefik" / "tls.yml",
    )
    ensure_dir(dst / "certs")
    write_text(dst / "certs" / ".gitkeep", "")
    write_text(dst / "certs" / "fullchain.pem", "")
    write_text(dst / "certs" / "privkey.pem", "")


def _scenario_asset_name(scenario: Scenario) -> str:
    if scenario.name == "localhost":
        return "localhost.png"
    if scenario.name == "secure-localhost":
        return "localhost-https.png"
    return "server.png"


def _copy_scenario_asset(src: Path, dst: Path, scenario: Scenario) -> None:
    asset = _scenario_asset_name(scenario)
    copy_file(src / "assets" / asset, dst / asset)


def _copy_common_files(src: Path, dst: Path, scenario: Scenario) -> None:
    copy_file(src / "LICENSE.md", dst / "LICENSE.md")
    copy_file(src / env_example_name(scenario), dst / ".env.example")
    copy_file(src / readme_template_name(scenario), dst / "README.md")


def copy_common_content(src: Path, dst: Path, scenario: Scenario) -> None:
    """Copy scenario content into output package directory."""
    _copy_files_for_scenario(src, dst, scenario)
    _copy_common_files(src, dst, scenario)
    _copy_client_config(src, dst, scenario)
    _copy_server_only_configs(src, dst, scenario)
    _copy_tls_config_and_placeholders(src, dst, scenario)
    _copy_scenario_asset(src, dst, scenario)


def write_package(
    output_root: Path,
    source_root: Path,
    scenario: Scenario,
    images: Images,
) -> None:
    """Write one generated package directory."""
    target = output_root / scenario.name
    if target.exists():
        shutil.rmtree(target)
    ensure_dir(target)
    copy_common_content(source_root, target, scenario)
    write_text(target / "docker-compose.yml", compose_content(scenario, images))


def clean_packages(output_root: Path) -> None:
    """Remove generated package directories."""
    for scenario in SCENARIOS:
        target = output_root / scenario.name
        if target.exists():
            shutil.rmtree(target)


def build_packages(source_root: Path, output_root: Path, images: Images) -> None:
    """Generate all package scenarios."""
    ensure_dir(output_root)
    for scenario in SCENARIOS:
        write_package(output_root, source_root, scenario, images)
