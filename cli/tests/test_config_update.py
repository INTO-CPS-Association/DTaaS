"""Tests for the config_update module (platform update --config)."""

from unittest.mock import patch
import pytest
from src.pkg import config_update
# pylint: disable=protected-access


def _write_deployment(tmp_path, services, env_text="SERVER_DNS=localhost\n"):
    """Create a minimal installed deployment: compose, dtaas.toml, config/.env."""
    service_block = "".join(f"  {name}:\n    image: x\n" for name in services)
    (tmp_path / "docker-compose.yml").write_text("services:\n" + service_block)
    (tmp_path / "dtaas.toml").write_text(
        'git-repo="https://github.com/into-cps-association/DTaaS.git"\n'
        "[common]\n"
        'server-dns="example.org"\n'
        f'path="{str(tmp_path).replace(chr(92), "/")}"\n'
        "[common.resources]\n"
        "cpus=4\npids_limit=4960\n"
        'mem_limit="4G"\nshm_size="512m"\n'
    )
    config_dir = tmp_path / "config"
    config_dir.mkdir()
    (config_dir / ".env").write_text(env_text)
    return str(tmp_path)


SERVER_SERVICES = ("traefik", "client", "libms", "traefik-forward-auth", "user1")


def test_detect_deploy_type_by_service_markers(tmp_path):
    """A unique service name (dex/keycloak/gitlab) pins the deployment type."""
    base = _write_deployment(tmp_path, ("traefik", "client", "dex"))
    assert config_update.detect_deploy_type(base) == "workspace-localhost"


def test_detect_deploy_type_server_variant_uses_tls(tmp_path):
    """A libms deployment is secure-server when tls.yml is present, else insecure."""
    base = _write_deployment(tmp_path, SERVER_SERVICES)
    assert config_update.detect_deploy_type(base) == "insecure-server"
    (tmp_path / "config" / "tls.yml").write_text("tls: {}\n")
    assert config_update.detect_deploy_type(base) == "secure-server"


def test_detect_deploy_type_falls_back_to_localhost(tmp_path):
    """Without any marker service the deployment is treated as localhost."""
    base = _write_deployment(tmp_path, ("traefik", "client", "user"))
    assert config_update.detect_deploy_type(base) == "localhost"


def test_load_toml_missing_raises(tmp_path):
    """_load_toml raises FileNotFoundError when no dtaas.toml is reachable."""
    workdir = tmp_path / "empty"
    workdir.mkdir()
    with patch("src.pkg.config_update.utils.find_toml", return_value=None):
        with pytest.raises(FileNotFoundError, match="dtaas.toml not found"):
            config_update._load_toml(str(workdir))


def test_load_toml_parse_error_raises(tmp_path):
    """_load_toml raises ValueError when the file cannot be parsed."""
    (tmp_path / "dtaas.toml").write_text("key = = =")
    with pytest.raises(ValueError, match="Error reading dtaas.toml"):
        config_update._load_toml(str(tmp_path))


def test_validate_raises_with_field_messages():
    """_validate surfaces every dtaas.toml problem as a field-level message."""
    with pytest.raises(ValueError) as exc:
        config_update._validate({"common": {}}, "secure-server")
    message = str(exc.value)
    assert "git-repo is missing" in message
    assert "common.server-dns is missing" in message


def test_update_config_dry_run_previews_without_writing(tmp_path):
    """Dry run reports would-be changes and restart but edits nothing."""
    base = _write_deployment(tmp_path, SERVER_SERVICES)
    env_before = (tmp_path / "config" / ".env").read_text()
    with patch("src.pkg.config_update.deploy.restart_all") as mock_restart:
        message = config_update.update_config(base, dry_run=True)
    assert "Would update config/.env" in message
    assert "would restart all services" in message
    mock_restart.assert_not_called()
    assert (tmp_path / "config" / ".env").read_text() == env_before


def test_update_config_applies_and_restarts_all(tmp_path):
    """A real run rewrites the changed file and recreates the whole deployment."""
    base = _write_deployment(tmp_path, SERVER_SERVICES)
    with patch("src.pkg.config_update.deploy.restart_all") as mock_restart:
        message = config_update.update_config(base, dry_run=False)
    assert "SERVER_DNS=example.org" in (tmp_path / "config" / ".env").read_text()
    assert "Updated config/.env; restarted all services." == message
    mock_restart.assert_called_once_with(base)


def test_update_config_idempotent_second_run(tmp_path):
    """Re-running after the values are applied reports no changes and no restart."""
    base = _write_deployment(tmp_path, SERVER_SERVICES)
    with patch("src.pkg.config_update.deploy.restart_all"):
        config_update.update_config(base, dry_run=False)
    with patch("src.pkg.config_update.deploy.restart_all") as mock_restart:
        message = config_update.update_config(base, dry_run=False)
    assert "No configuration changes" in message
    mock_restart.assert_not_called()


GITLAB_SERVICES = ("traefik", "client", "libms", "traefik-forward-auth", "gitlab")
PLACEHOLDER_ENV = "SERVER_DNS=localhost\nOAUTH_CLIENT_SECRET=your_client_secret_here\n"


def test_update_config_warns_about_unfilled_secret(tmp_path):
    """A secret still left as a template placeholder is reported after applying."""
    base = _write_deployment(tmp_path, GITLAB_SERVICES, env_text=PLACEHOLDER_ENV)
    with patch("src.pkg.config_update.deploy.restart_all"):
        message = config_update.update_config(base, dry_run=False)
    assert "your_client_secret_here" in message
    assert "not substituted" in message
    # The user is told where the value comes from and to re-run.
    assert "GitLab/Keycloak" in message
    assert "re-run 'dtaas platform update --config'" in message


def test_update_config_no_warning_once_secret_filled(tmp_path):
    """Filling the secret in dtaas.toml substitutes it and clears the warning."""
    base = _write_deployment(tmp_path, GITLAB_SERVICES, env_text=PLACEHOLDER_ENV)
    with open(tmp_path / "dtaas.toml", "a", encoding="utf-8") as toml:
        toml.write('[secure-server-gitlab]\noauth-client-secret="realsecret"\n')
    with patch("src.pkg.config_update.deploy.restart_all"):
        message = config_update.update_config(base, dry_run=False)
    assert "your_client_secret_here" not in message
    assert "GitLab/Keycloak" not in message  # no leftover secrets, no hint
    env_text = (tmp_path / "config" / ".env").read_text()
    assert "OAUTH_CLIENT_SECRET=realsecret" in env_text


def test_update_config_rejects_invalid_toml(tmp_path):
    """Invalid dtaas.toml is rejected before any file is touched."""
    base = _write_deployment(tmp_path, SERVER_SERVICES)
    (tmp_path / "dtaas.toml").write_text("[common]\nserver-dns=123\n")
    env_before = (tmp_path / "config" / ".env").read_text()
    with pytest.raises(ValueError, match="Invalid dtaas.toml"):
        config_update.update_config(base, dry_run=False)
    assert (tmp_path / "config" / ".env").read_text() == env_before


def test_update_config_requires_deployment(tmp_path):
    """Without a compose file the update fails with a deployment-missing error."""
    with pytest.raises(OSError, match="docker-compose.yml"):
        config_update.update_config(str(tmp_path), dry_run=False)
