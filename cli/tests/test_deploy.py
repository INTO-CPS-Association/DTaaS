"""Tests for the deploy module (admin install / uninstall handlers)."""

from unittest.mock import patch, MagicMock
import pytest
from python_on_whales.exceptions import DockerException
from src.pkg import deploy
# pylint: disable=protected-access


def test_require_deployment_missing_toml(tmp_path, monkeypatch):
    """_require_deployment fails when dtaas.toml is absent from dir and cwd."""
    (tmp_path / "docker-compose.yml").write_text("services: {}")
    workdir = tmp_path / "cwd"
    workdir.mkdir()
    monkeypatch.chdir(workdir)  # no dtaas.toml in the cwd either
    with pytest.raises(OSError, match="dtaas.toml"):
        deploy._require_deployment(str(tmp_path))


def test_env_files_empty_when_no_config_env(tmp_path):
    """_env_files is empty for deploy types that keep .env at the root."""
    assert deploy._env_files(str(tmp_path)) == []


def test_client_passes_env_files(tmp_path):
    """_client forwards config/.env to the DockerClient as an env file."""
    (tmp_path / "config").mkdir()
    (tmp_path / "config" / ".env").write_text("OAUTH_URL=https://gitlab.com\n")
    with patch("src.pkg.deploy.DockerClient") as mock_docker:
        deploy._client(str(tmp_path))
    _, kwargs = mock_docker.call_args
    assert kwargs["compose_env_files"] == [str(tmp_path / "config" / ".env")]


def test_install_propagates_docker_exception(tmp_path):
    """A compose failure surfaces as the real DockerException."""
    (tmp_path / "docker-compose.yml").write_text("services: {}")
    (tmp_path / "dtaas.toml").write_text("x = 1")
    with patch("src.pkg.deploy._client") as mock_client:
        mock_client.return_value.compose.up.side_effect = DockerException(
            ["docker", "compose", "up", "-d"], 1, stderr=b"daemon down"
        )
        with pytest.raises(DockerException):
            deploy.install(str(tmp_path))


def test_check_within_base_rejects_symlink(tmp_path):
    """A symlinked files/ pointing elsewhere is rejected (the primary guard)."""
    base = tmp_path / "install"
    base.mkdir()
    outside = tmp_path / "outside"
    outside.mkdir()
    link = base / "files"
    try:
        link.symlink_to(outside, target_is_directory=True)
    except (OSError, NotImplementedError):
        pytest.skip("symlink creation is not permitted on this platform")
    with pytest.raises(OSError, match="symlink"):
        deploy._check_within_base(link, base)


def test_delete_user_files_reports_when_only_scaffolding(tmp_path):
    """With only scaffolding present there are no per-user dirs to remove."""
    (tmp_path / "files" / "common").mkdir(parents=True)
    (tmp_path / "files" / "template").mkdir()

    assert "nothing to remove" in deploy.delete_user_files(str(tmp_path))


def test_delete_user_files_absent(tmp_path):
    """delete_user_files reports when there is no files/ directory at all."""
    assert "nothing to remove" in deploy.delete_user_files(str(tmp_path))


def test_uninstall_removes_user_files(tmp_path):
    """uninstall with remove_user_files deletes per-user directories."""
    (tmp_path / "docker-compose.yml").write_text("services: {}")
    (tmp_path / "files" / "bob").mkdir(parents=True)
    with patch("src.pkg.deploy._client"):
        message = deploy.uninstall(str(tmp_path), remove_user_files=True)
        assert message is not None
        assert "Removed user files" in message
        assert not (tmp_path / "files" / "bob").exists()
        assert (tmp_path / "files").is_dir()


def test_uninstall_downs_user_containers_then_main(tmp_path):
    """uninstall tears down user-added containers before the main project."""
    (tmp_path / "docker-compose.yml").write_text("services: {}")
    with patch("src.pkg.deploy._down_user_containers") as mock_down_users, patch(
        "src.pkg.deploy._client"
    ) as mock_client:
        deploy.uninstall(str(tmp_path))
    mock_down_users.assert_called_once_with(str(tmp_path))
    mock_client.return_value.compose.down.assert_called_once_with()


def test_down_user_containers_tears_down_user_compose(tmp_path):
    """_down_user_containers downs compose.users.yml with --remove-orphans."""
    (tmp_path / "compose.users.yml").write_text("services: {}")
    with patch("src.pkg.deploy.DockerClient") as mock_docker:
        deploy._down_user_containers(str(tmp_path))
    mock_docker.return_value.compose.down.assert_called_once_with(remove_orphans=True)


def test_installation_present_true_when_main_has_containers(tmp_path):
    """installation_present is True when the main project has any container."""
    (tmp_path / "docker-compose.yml").write_text("services: {}")
    with patch("src.pkg.deploy._client") as mock_client:
        mock_client.return_value.compose.ps.return_value = [MagicMock()]
        assert deploy.installation_present(str(tmp_path)) is True


def test_installation_present_false_when_nothing_exists(tmp_path):
    """installation_present is False when neither main nor user containers exist."""
    (tmp_path / "docker-compose.yml").write_text("services: {}")
    with patch("src.pkg.deploy._client") as mock_client:
        mock_client.return_value.compose.ps.return_value = []
        assert deploy.installation_present(str(tmp_path)) is False


def test_installation_present_false_without_compose_file(tmp_path):
    """installation_present is False when no deployment has been generated."""
    assert deploy.installation_present(str(tmp_path)) is False


def test_restart_service_force_recreates(tmp_path):
    """restart_service force-recreates only the named service, detached."""
    (tmp_path / "docker-compose.yml").write_text("services: {}")
    with patch("src.pkg.deploy._client") as mock_client:
        deploy.restart_service(str(tmp_path), "traefik")
        mock_client.return_value.compose.up.assert_called_once_with(
            services=["traefik"], force_recreate=True, detach=True
        )


def test_restart_all_force_recreates_whole_project(tmp_path):
    """restart_all recreates every service (no services filter), detached."""
    (tmp_path / "docker-compose.yml").write_text("services: {}")
    with patch("src.pkg.deploy._client") as mock_client:
        deploy.restart_all(str(tmp_path))
        mock_client.return_value.compose.up.assert_called_once_with(
            force_recreate=True, detach=True
        )


def test_restart_all_requires_compose_file(tmp_path):
    """restart_all refuses to act without a generated deployment."""
    with pytest.raises(OSError, match="docker-compose.yml"):
        deploy.restart_all(str(tmp_path))


def test_stop_service_stops_named_service(tmp_path):
    """stop_service stops only the named compose service."""
    (tmp_path / "docker-compose.yml").write_text("services: {}")
    with patch("src.pkg.deploy._client") as mock_client:
        deploy.stop_service(str(tmp_path), "traefik")
        mock_client.return_value.compose.stop.assert_called_once_with(
            services=["traefik"]
        )


def test_service_running_false_when_no_container(tmp_path):
    """service_running returns False when no running container is listed."""
    (tmp_path / "docker-compose.yml").write_text("services: {}")
    with patch("src.pkg.deploy._client") as mock_client:
        mock_client.return_value.compose.ps.return_value = []
        assert deploy.service_running(str(tmp_path), "traefik") is False


def test_compose_services_empty_when_no_services_key(tmp_path):
    """compose_services tolerates a compose file with no services mapping."""
    (tmp_path / "docker-compose.yml").write_text("networks:\n  frontend: {}\n")
    assert deploy.compose_services(str(tmp_path)) == set()


def test_compose_services_requires_compose_file(tmp_path):
    """compose_services refuses to act without a generated deployment."""
    with pytest.raises(OSError, match="docker-compose.yml"):
        deploy.compose_services(str(tmp_path))
