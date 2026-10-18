"""Tests for the host_dirs module: workspace and logger directories."""

import functools
import subprocess
from unittest.mock import patch
import pytest
from src.pkg.host_dirs import (
    LOGGER_DEPLOY_TYPES,
    create_user_dirs,
    set_files_permissions,
    set_logs_permissions,
)
# pylint: disable=redefined-outer-name

SUDO_FAILURES = [
    FileNotFoundError("no sudo"),
    subprocess.CalledProcessError(1, "sudo"),
]


@pytest.fixture
def mock_run():
    """subprocess.run on a POSIX host, so no test ever calls the real sudo."""
    with patch("src.pkg.host_dirs.IS_POSIX", True), patch(
        "src.pkg.host_dirs.subprocess.run"
    ) as run:
        yield run


@pytest.fixture
def off_posix_run():
    """subprocess.run on a Windows host."""
    with patch("src.pkg.host_dirs.IS_POSIX", False), patch(
        "src.pkg.host_dirs.subprocess.run"
    ) as run:
        yield run


def _commands(run):
    """The argument lists subprocess.run was called with, in order."""
    return [call.args[0] for call in run.call_args_list]


def test_create_user_dirs_copies_template(tmp_path):
    """create_user_dirs copies files/template into files/<username> for each user."""
    template = tmp_path / "files" / "template"
    template.mkdir(parents=True)
    (template / "readme.txt").write_text("hello")

    create_user_dirs(str(tmp_path), ["alice", "bob"])

    assert (tmp_path / "files" / "alice" / "readme.txt").read_text() == "hello"
    assert (tmp_path / "files" / "bob" / "readme.txt").read_text() == "hello"


def test_create_user_dirs_skips_when_no_template(tmp_path):
    """create_user_dirs is a no-op when files/template does not exist."""
    create_user_dirs(str(tmp_path), ["alice"])
    assert not (tmp_path / "files" / "alice").exists()


def test_set_files_permissions_skips_when_no_files_dir(tmp_path, mock_run):
    """set_files_permissions is a no-op when files/ does not exist."""
    set_files_permissions(str(tmp_path))

    mock_run.assert_not_called()


def test_set_files_permissions_chowns_and_chmods_files_dir(tmp_path, mock_run):
    """set_files_permissions sets ownership to 1000:100 then grants rwX on files/."""
    files_dir = tmp_path / "files"
    files_dir.mkdir()

    set_files_permissions(str(tmp_path))

    assert _commands(mock_run) == [
        ["sudo", "chown", "-R", "1000:100", str(files_dir)],
        ["sudo", "chmod", "-R", "u+rwX,go+rwX", str(files_dir)],
    ]


def test_set_files_permissions_is_a_noop_off_posix(tmp_path, off_posix_run):
    """The uid:gid pair means nothing on Windows, where the call would only
    print the host's own "sudo is disabled" notice."""
    (tmp_path / "files").mkdir()

    set_files_permissions(str(tmp_path))

    off_posix_run.assert_not_called()


@pytest.mark.parametrize("deploy_type", sorted(LOGGER_DEPLOY_TYPES))
def test_set_logs_permissions_hands_over_logs_logger_only(
    tmp_path, mock_run, deploy_type
):
    """logs/logger is created and given to uid 1000; logs/ itself, which
    secure-server-gitlab also mounts into GitLab, is never chowned."""
    set_logs_permissions(str(tmp_path), deploy_type)

    logs_dir = tmp_path / "logs" / "logger"
    assert logs_dir.is_dir()
    assert _commands(mock_run) == [["sudo", "chown", "-R", "1000:1000", str(logs_dir)]]


@pytest.mark.parametrize("deploy_type", ["workspace-localhost", "workspace-secure-server"])
def test_set_logs_permissions_skips_types_without_logger(
    tmp_path, mock_run, deploy_type
):
    """The workspace-only types run no logger, so they get no logs/ directory."""
    set_logs_permissions(str(tmp_path), deploy_type)

    assert not (tmp_path / "logs").exists()
    mock_run.assert_not_called()


def test_set_logs_permissions_keeps_existing_logs(tmp_path, mock_run):
    """A second run, after the logger has written events, keeps them."""
    logs_dir = tmp_path / "logs" / "logger"
    logs_dir.mkdir(parents=True)
    (logs_dir / "workflow-logs.jsonl").write_text("{}\n")

    set_logs_permissions(str(tmp_path), "localhost")

    assert (logs_dir / "workflow-logs.jsonl").read_text() == "{}\n"
    assert len(_commands(mock_run)) == 1


def test_set_logs_permissions_only_creates_dir_off_posix(tmp_path, off_posix_run):
    """On Windows the directory is created, and no sudo is tried."""
    set_logs_permissions(str(tmp_path), "localhost")

    assert (tmp_path / "logs" / "logger").is_dir()
    off_posix_run.assert_not_called()


@pytest.fixture(params=SUDO_FAILURES, ids=["no-sudo", "sudo-failed"])
def failing_run(mock_run, request):
    """subprocess.run on a POSIX host where sudo is missing or fails."""
    mock_run.side_effect = request.param
    return mock_run


@pytest.mark.parametrize(
    "case",
    [
        (set_files_permissions, "files/", "sudo chown -R 1000:100"),
        (
            functools.partial(set_logs_permissions, deploy_type="localhost"),
            "logs/logger/",
            "sudo chown -R 1000:1000",
        ),
    ],
    ids=["files", "logs"],
)
def test_permission_helpers_warn_when_sudo_fails(tmp_path, failing_run, capsys, case):
    """A failed chown never stops the command; the warning names the fix."""
    prepare, name, manual = case
    (tmp_path / "files").mkdir()

    prepare(str(tmp_path))

    out = capsys.readouterr().out
    assert failing_run.called
    assert f"Warning: could not set the owner of {name}\n" in out
    assert manual in out


def test_set_logs_permissions_warns_when_logs_is_not_writable(
    tmp_path, mock_run, capsys
):
    """A logs/ left root-owned by an earlier compose run blocks the mkdir;
    the warning names both commands, and no sudo is tried unasked."""
    with patch("src.pkg.host_dirs.Path.mkdir", side_effect=PermissionError("denied")):
        set_logs_permissions(str(tmp_path), "localhost")

    out = capsys.readouterr().out
    assert "Warning: could not set the owner of logs/logger/" in out
    assert "sudo mkdir -p" in out
    assert "sudo chown -R 1000:1000" in out
    mock_run.assert_not_called()
