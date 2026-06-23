"""Tests for the deploy module (admin install / uninstall handlers)."""

from unittest.mock import patch
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


def test_delete_user_files_removes_dir(tmp_path):
    """delete_user_files removes the files/ directory and reports it."""
    (tmp_path / "files" / "alice").mkdir(parents=True)
    message = deploy.delete_user_files(str(tmp_path))
    assert "Removed user files" in message
    assert not (tmp_path / "files").exists()


def test_delete_user_files_absent(tmp_path):
    """delete_user_files reports when there is nothing to remove."""
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
    """uninstall with remove_user_files deletes the files/ directory."""
    (tmp_path / "docker-compose.yml").write_text("services: {}")
    (tmp_path / "files" / "bob").mkdir(parents=True)
    with patch("src.pkg.deploy._client"):
        message = deploy.uninstall(str(tmp_path), remove_user_files=True)
        assert message is not None
        assert "Removed user files" in message
        assert not (tmp_path / "files").exists()
