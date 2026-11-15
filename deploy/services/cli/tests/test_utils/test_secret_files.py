"""Tests for the secret files under config/ (utils.py): how they are written
(write_secret_file), and the fix a denied access names (permission_hint,
folder_permission_hint, explain_permission_error)."""

import os
import shlex
import stat
from types import SimpleNamespace

import pytest
from dtaas_services.pkg import utils
from dtaas_services.pkg.utils import (
    explain_permission_error,
    folder_permission_hint,
    permission_hint,
    write_secret_file,
)
from tests.conftest import denied

CAUSE = (
    "'dtaas-services service install' runs as root, and so does any command "
    "run with sudo."
)


def _command(hint):
    """The shell command a hint ends with, as the shell splits it."""
    return shlex.split(hint.split("Run: ", 1)[1])


@pytest.mark.parametrize(
    "paths,expected",
    [
        (
            ["/srv/config/gitlab_tokens.json"],
            "Permission denied: /srv/config/gitlab_tokens.json. It probably "
            f"belongs to root: {CAUSE} "
            'Run: sudo chown "$USER": /srv/config/gitlab_tokens.json',
        ),
        (
            ["/srv/config/x.json", "/srv/config/x.json.lock"],
            "Permission denied: /srv/config/x.json, /srv/config/x.json.lock. "
            f"They probably belong to root: {CAUSE} "
            'Run: sudo chown "$USER": /srv/config/x.json /srv/config/x.json.lock',
        ),
    ],
    ids=["one-file", "file-and-lock"],
)
def test_permission_hint_names_the_files_and_one_chown(paths, expected):
    """The hint says whose files they probably are, and one command fixes
    them all."""
    assert permission_hint(*paths) == expected


@pytest.mark.parametrize(
    "path",
    ["/srv/my project/config/x.json", "/srv/it's/x.json", "/srv/$(id)/x.json"],
    ids=["space", "quote", "command"],
)
def test_any_path_stays_one_argument_of_chown(path):
    """A space, a quote or a $ in a path never splits it or runs anything:
    the shell reads back exactly the path."""
    assert _command(permission_hint(path)) == ["sudo", "chown", "$USER:", path]
    assert _command(folder_permission_hint(path)) == ["sudo", "chown", "$USER:", path]


def test_the_folder_hint_names_the_folder():
    """A folder no file can be created in is named as such: a chown of the
    folder alone, so the files in it keep their owners."""
    hint = folder_permission_hint("/srv/config")
    assert hint == (
        "Permission denied: files cannot be created in /srv/config. It "
        f'probably belongs to root: {CAUSE} Run: sudo chown "$USER": /srv/config'
    )


def _raise_inside(exc, path, *related):
    """Raise *exc* inside explain_permission_error(path, *related)."""
    with explain_permission_error(path, *related):
        raise exc


@pytest.mark.usefixtures("posix_hints")
@pytest.mark.parametrize(
    "named,folder",
    [
        ("x.json", False),
        ("x.json.lock", False),
        (None, False),
        (".x.json.k3j2.tmp", True),
        ("missing.lock", True),
    ],
    ids=["the-file", "its-lock", "no-file", "a-temporary-file", "a-file-not-made"],
)
def test_the_fix_names_what_cannot_be_used(tmp_path, named, folder):
    """An error on the file, on a related file such as its lock, or on no
    file names the file and the related ones that exist, in one chown. An
    error on another file next to it (a temporary file), or on a related
    file that does not exist (a lock file not made yet), means the folder
    cannot be written, so the folder is named. The original is the cause."""
    path, lock = tmp_path / "x.json", tmp_path / "x.json.lock"
    path.write_text("{}", encoding="utf-8")
    lock.write_text("", encoding="utf-8")
    filename = None if named is None else str(tmp_path / named)
    original = PermissionError(13, "Permission denied", filename)
    expected = (
        folder_permission_hint(tmp_path) if folder else permission_hint(path, lock)
    )
    with pytest.raises(PermissionError) as caught:
        _raise_inside(original, path, lock, tmp_path / "missing.lock")
    assert str(caught.value) == expected
    assert caught.value.__cause__ is original


def test_windows_gets_the_error_as_it_is(tmp_path, mocker):
    """Windows has no root, so no chown is suggested: the error passes
    through unchanged."""
    mocker.patch("dtaas_services.pkg.utils._hints_apply", return_value=False)
    original = denied(tmp_path / "x.json")
    with pytest.raises(PermissionError) as caught:
        _raise_inside(original, tmp_path / "x.json")
    assert caught.value is original


@pytest.mark.parametrize("name,applies", [("posix", True), ("nt", False)])
def test_hints_apply_where_there_is_root(monkeypatch, name, applies):
    """Linux and macOS (posix) get the hints, Windows does not."""
    monkeypatch.setattr(utils, "os", SimpleNamespace(name=name))
    assert utils._hints_apply() is applies  # pylint: disable=protected-access


def test_explain_permission_error_keeps_other_errors(tmp_path):
    """Any other error passes through unchanged"""
    original = FileNotFoundError("gone")
    with pytest.raises(FileNotFoundError) as caught:
        _raise_inside(original, tmp_path)
    assert caught.value is original


def test_write_secret_file_replaces_the_file(tmp_path):
    """The content lands in the file and no temporary file is left"""
    path = tmp_path / "config" / "gitlab_user_tokens.json"
    write_secret_file(path, "{}")
    write_secret_file(path, '{"a": 1}')
    assert path.read_text(encoding="utf-8") == '{"a": 1}'
    assert [p.name for p in path.parent.iterdir()] == [path.name]


def test_a_leftover_temporary_file_never_gets_in_the_way(tmp_path):
    """A temporary file a killed run left behind is neither in the way nor
    reused: each write makes a new one."""
    path = tmp_path / "x.json"
    leftover = tmp_path / "x.json.tmp"
    leftover.write_text("old", encoding="utf-8")
    write_secret_file(path, "{}")
    assert path.read_text(encoding="utf-8") == "{}"
    assert leftover.read_text(encoding="utf-8") == "old"


@pytest.mark.skipif(os.name != "posix", reason="file modes are POSIX")
def test_the_temporary_file_is_private_from_its_first_byte(tmp_path, mocker):
    """Even under a umask that lets everyone read new files, the temporary
    file already is 0600 when the content is in it, and so is the file."""
    path = tmp_path / "x.json"
    modes = []
    real_replace = os.replace

    def replace(src, dst):
        modes.append(stat.S_IMODE(os.stat(src).st_mode))
        real_replace(src, dst)

    mocker.patch("dtaas_services.pkg.utils.os.replace", side_effect=replace)
    old_umask = os.umask(0)
    try:
        write_secret_file(path, "{}")
    finally:
        os.umask(old_umask)
    assert modes == [0o600]
    assert stat.S_IMODE(path.stat().st_mode) == 0o600


@pytest.mark.usefixtures("posix_hints")
def test_a_folder_that_cannot_be_written_is_named(tmp_path, mocker):
    """No temporary file can be made in a folder the admin cannot write:
    the fix names the folder, since a chown of the file would not help,
    and nothing is left behind."""
    path = tmp_path / "config" / "x.json"
    path.parent.mkdir()
    refused = denied(path.parent / ".x.json.k3j2.tmp")
    mocker.patch("dtaas_services.pkg.utils.tempfile.mkstemp", side_effect=refused)
    with pytest.raises(PermissionError) as caught:
        write_secret_file(path, "{}")
    assert str(caught.value) == folder_permission_hint(path.parent)
    assert not list(path.parent.iterdir())


@pytest.mark.parametrize(
    "failure", [OSError("disk full"), KeyboardInterrupt()], ids=["error", "interrupt"]
)
def test_a_failed_write_leaves_the_file_and_no_temp_file(tmp_path, mocker, failure):
    """A write that fails or is interrupted before the rename leaves the
    file as it was, and no temporary file."""
    path = tmp_path / "x.json"
    path.write_text("old", encoding="utf-8")
    mocker.patch("dtaas_services.pkg.utils.os.replace", side_effect=failure)
    with pytest.raises(type(failure)):
        write_secret_file(path, "{}")
    assert [p.name for p in tmp_path.iterdir()] == ["x.json"]
    assert path.read_text(encoding="utf-8") == "old"
