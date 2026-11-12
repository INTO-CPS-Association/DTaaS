"""Tests for the lock that serialises changes to a file under config/
(file_lock.py)."""

from pathlib import Path

import pytest
from filelock import FileLock
from dtaas_services.pkg import file_lock
from dtaas_services.pkg.file_lock import lock_path, locked
from dtaas_services.pkg.utils import permission_hint
from tests.conftest import denied


def test_the_lock_file_sits_next_to_the_file():
    """config/x.json is locked through config/x.json.lock."""
    assert lock_path(Path("/srv/config/x.json")) == Path("/srv/config/x.json.lock")


def test_the_lock_is_held_for_the_block_only(tmp_path):
    """Inside the block another command cannot take the lock, after it it
    can at once."""
    path = tmp_path / "x.json"
    other = FileLock(lock_path(path), timeout=0)
    with locked(path):
        assert not _can_take(other)
    assert _can_take(other)


def _can_take(lock):
    """True when *lock* could be taken (and is released again)."""
    try:
        lock.acquire()
    except TimeoutError:
        return False
    lock.release()
    return True


def _enter(path):
    """Take and release the lock of *path*."""
    with locked(path):
        pass


def test_a_lock_held_too_long_fails_naming_the_file(tmp_path, monkeypatch):
    """A command that waited LOCK_TIMEOUT_SECONDS gives up, naming the file
    and its lock, and changes nothing."""
    monkeypatch.setattr(file_lock, "LOCK_TIMEOUT_SECONDS", 0.1)
    path = tmp_path / "x.json"
    holder = FileLock(lock_path(path))
    holder.acquire()
    try:
        with pytest.raises(TimeoutError) as caught:
            _enter(path)
    finally:
        holder.release()
    assert str(caught.value) == (
        f"{path} is being changed by another dtaas-services command: its lock "
        f"{lock_path(path)} was not released within 0.1 seconds."
    )


@pytest.mark.usefixtures("posix_hints")
def test_a_lock_file_owned_by_root_names_it_and_the_file(tmp_path, mocker):
    """A lock file a root run made cannot be opened by the admin: one chown
    names it and the file."""
    path = tmp_path / "x.json"
    path.write_text("{}", encoding="utf-8")
    mocker.patch.object(FileLock, "acquire", side_effect=denied(lock_path(path)))
    with pytest.raises(PermissionError) as caught:
        _enter(path)
    assert str(caught.value) == permission_hint(lock_path(path), path)
