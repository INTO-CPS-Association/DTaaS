"""Tests for the deploy module (admin install / uninstall handlers)."""

from unittest.mock import patch, MagicMock
import pytest
from python_on_whales.exceptions import DockerException
from src.pkg import deploy
# pylint: disable=protected-access


def test_require_deployment_missing_compose(tmp_path):
    """_require_deployment fails when the compose file is absent."""
    with pytest.raises(OSError, match="docker-compose.yml"):
        deploy._require_deployment(str(tmp_path))


def test_require_deployment_missing_toml(tmp_path, monkeypatch):
    """_require_deployment fails when dtaas.toml is absent from dir and cwd."""
    (tmp_path / "docker-compose.yml").write_text("services: {}")
    workdir = tmp_path / "cwd"
    workdir.mkdir()
    monkeypatch.chdir(workdir)  # no dtaas.toml in the cwd either
    with pytest.raises(OSError, match="dtaas.toml"):
        deploy._require_deployment(str(tmp_path))


def test_require_deployment_toml_falls_back_to_cwd(tmp_path, monkeypatch):
    """dtaas.toml in the cwd satisfies the check when absent from output dir."""
    outdir = tmp_path / "insecure"
    outdir.mkdir()
    (outdir / "docker-compose.yml").write_text("services: {}")
    monkeypatch.chdir(tmp_path)
    (tmp_path / "dtaas.toml").write_text("x = 1")  # toml only in the cwd
    deploy._require_deployment(str(outdir))  # does not raise


def test_env_files_returns_config_env_when_present(tmp_path):
    """_env_files returns config/.env so compose loads it explicitly."""
    (tmp_path / "config").mkdir()
    env_file = tmp_path / "config" / ".env"
    env_file.write_text("OAUTH_URL=https://gitlab.com\n")
    assert deploy._env_files(str(tmp_path)) == [str(env_file)]


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


def test_install_runs_compose_up(tmp_path):
    """install validates inputs and runs 'docker compose up' detached."""
    (tmp_path / "docker-compose.yml").write_text("services: {}")
    (tmp_path / "dtaas.toml").write_text("x = 1")
    with patch("src.pkg.deploy._client") as mock_client:
        deploy.install(str(tmp_path))
        mock_client.return_value.compose.up.assert_called_once_with(detach=True)


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


def test_check_within_base_rejects_escape(tmp_path):
    """A files dir resolving outside the install dir is rejected."""
    base = tmp_path / "install"
    base.mkdir()
    outside = tmp_path / "outside_files"
    outside.mkdir()
    with pytest.raises(OSError, match="resolves outside"):
        deploy._check_within_base(outside, base)


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


def test_user_files_dir_absent(tmp_path):
    """_user_files_dir returns None when files/ does not exist."""
    assert deploy._user_files_dir(str(tmp_path)) is None


def test_delete_user_files_removes_per_user_dir(tmp_path):
    """delete_user_files removes a per-user directory and reports it."""
    (tmp_path / "files" / "alice").mkdir(parents=True)
    message = deploy.delete_user_files(str(tmp_path))
    assert "Removed user files" in message
    assert not (tmp_path / "files" / "alice").exists()
    assert (tmp_path / "files").is_dir()


def test_delete_user_files_keeps_scaffolding(tmp_path):
    """delete_user_files keeps files/common and files/template for reinstall."""
    files = tmp_path / "files"
    (files / "alice").mkdir(parents=True)
    (files / "common").mkdir()
    (files / "template").mkdir()

    deploy.delete_user_files(str(tmp_path))

    assert not (files / "alice").exists()
    assert (files / "common").is_dir()
    assert (files / "template").is_dir()


def test_remove_user_dirs_skips_symlinks_and_files(tmp_path):
    """_remove_user_dirs leaves symlinked dirs and plain files untouched."""
    files = tmp_path / "files"
    (files / "alice").mkdir(parents=True)
    (files / "loose.txt").write_text("x")
    outside = tmp_path / "outside"
    outside.mkdir()
    try:
        (files / "link").symlink_to(outside, target_is_directory=True)
    except (OSError, NotImplementedError):
        pytest.skip("symlink creation is not permitted on this platform")

    removed = deploy._remove_user_dirs(files)

    assert removed == ["alice"]
    assert (files / "link").exists()
    assert (files / "loose.txt").exists()
    assert outside.is_dir()


def test_delete_user_files_reports_when_only_scaffolding(tmp_path):
    """With only scaffolding present there are no per-user dirs to remove."""
    (tmp_path / "files" / "common").mkdir(parents=True)
    (tmp_path / "files" / "template").mkdir()

    assert "nothing to remove" in deploy.delete_user_files(str(tmp_path))


def test_delete_user_files_absent(tmp_path):
    """delete_user_files reports when there is no files/ directory at all."""
    assert "nothing to remove" in deploy.delete_user_files(str(tmp_path))


def test_uninstall_runs_compose_down(tmp_path):
    """uninstall runs 'docker compose down' and preserves files by default."""
    (tmp_path / "docker-compose.yml").write_text("services: {}")
    with patch("src.pkg.deploy._client") as mock_client:
        assert deploy.uninstall(str(tmp_path)) is None
        mock_client.return_value.compose.down.assert_called_once_with()


def test_uninstall_requires_compose_file(tmp_path):
    """uninstall refuses to act when no deployment exists in the directory."""
    with patch("src.pkg.deploy._client") as mock_client:
        with pytest.raises(OSError, match="docker-compose.yml"):
            deploy.uninstall(str(tmp_path), remove_user_files=True)
        mock_client.assert_not_called()


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


def test_down_user_containers_noop_without_user_compose(tmp_path):
    """_down_user_containers does nothing when no user compose file exists."""
    with patch("src.pkg.deploy.DockerClient") as mock_docker:
        deploy._down_user_containers(str(tmp_path))
    mock_docker.assert_not_called()


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


def test_restart_service_requires_compose_file(tmp_path):
    """restart_service refuses to act without a generated deployment."""
    with patch("src.pkg.deploy._client") as mock_client:
        with pytest.raises(OSError, match="docker-compose.yml"):
            deploy.restart_service(str(tmp_path), "traefik")
        mock_client.assert_not_called()


def test_stop_service_stops_named_service(tmp_path):
    """stop_service stops only the named compose service."""
    (tmp_path / "docker-compose.yml").write_text("services: {}")
    with patch("src.pkg.deploy._client") as mock_client:
        deploy.stop_service(str(tmp_path), "traefik")
        mock_client.return_value.compose.stop.assert_called_once_with(
            services=["traefik"]
        )


def test_stop_service_requires_compose_file(tmp_path):
    """stop_service refuses to act without a generated deployment."""
    with patch("src.pkg.deploy._client") as mock_client:
        with pytest.raises(OSError, match="docker-compose.yml"):
            deploy.stop_service(str(tmp_path), "traefik")
        mock_client.assert_not_called()


def test_service_running_true_when_container_up(tmp_path):
    """service_running returns True when the service's container is running."""
    (tmp_path / "docker-compose.yml").write_text("services: {}")
    container = MagicMock()
    container.state.running = True
    with patch("src.pkg.deploy._client") as mock_client:
        mock_client.return_value.compose.ps.return_value = [container]
        assert deploy.service_running(str(tmp_path), "traefik") is True
        mock_client.return_value.compose.ps.assert_called_once_with(
            services=["traefik"]
        )


def test_service_running_false_when_no_container(tmp_path):
    """service_running returns False when no running container is listed."""
    (tmp_path / "docker-compose.yml").write_text("services: {}")
    with patch("src.pkg.deploy._client") as mock_client:
        mock_client.return_value.compose.ps.return_value = []
        assert deploy.service_running(str(tmp_path), "traefik") is False
