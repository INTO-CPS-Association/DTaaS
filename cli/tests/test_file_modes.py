"""Tests for file_modes: the modes of the config files the CLI writes."""

from pathlib import Path
from unittest.mock import patch

import pytest
import yaml
from src.pkg.constants import DEPLOY_TYPES, GITLAB_USER_TOKENS_FILE
from src.pkg.file_modes import config_mode, set_config_mode
from src.pkg.project import DEPLOY_TEMPLATES_DIR

NAMES_AND_MODES = [
    (".env", 0o600),
    ("conf.server", 0o600),
    ("dtaas.toml", 0o600),
    ("users.csv", 0o600),
    (GITLAB_USER_TOKENS_FILE, 0o600),
    ("client.js", 0o644),
    ("tls.yml", None),
    ("env.local.js", None),
]


def _client_mounts():
    """(deploy type, file name) for each host file the client service mounts."""
    for compose in sorted(DEPLOY_TEMPLATES_DIR.glob("*/docker-compose.yml")):
        services = yaml.safe_load(compose.read_text(encoding="utf-8"))["services"]
        for volume in services["client"].get("volumes", []):
            yield compose.parent.name, Path(volume.split(":")[0]).name


CLIENT_MOUNTS = list(_client_mounts())


@pytest.mark.parametrize("name, mode", NAMES_AND_MODES)
def test_config_mode(name, mode):
    """Secrets are owner only, client.js stays readable, others are left."""
    assert config_mode(name) == mode


@pytest.mark.parametrize("name, mode", NAMES_AND_MODES)
def test_set_config_mode_chmods_by_name(tmp_path, name, mode):
    """set_config_mode chmods to config_mode, and leaves an unknown file.

    Windows chmod() can't be asserted via st_mode (only the read-only flag
    is tracked), so this asserts the call itself, the portable signal.
    """
    with patch.object(Path, "chmod") as mock_chmod:
        set_config_mode(tmp_path / name)
    if mode is None:
        mock_chmod.assert_not_called()
    else:
        mock_chmod.assert_called_once_with(mode)


def test_every_deploy_template_mounts_files_into_the_client():
    """Guards the next test from passing on an empty or partial list."""
    assert {deploy_type for deploy_type, _ in CLIENT_MOUNTS} == set(DEPLOY_TYPES)


@pytest.mark.parametrize("deploy_type, name", CLIENT_MOUNTS)
def test_client_mounted_files_are_never_owner_only(deploy_type, name):
    """dtaas-web runs as uid 1000 (1.7.2 on), so a file it mounts at 0600 and
    owned by the admin (root under sudo) crashes the website (#1861)."""
    assert config_mode(name) != 0o600, deploy_type
