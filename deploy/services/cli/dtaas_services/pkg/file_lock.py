"""Serialises the commands that change a file under config/.

A file that a command reads, changes and writes back (the GitLab JSON files
and password.env.current) is changed while its lock is held: <file>.lock,
next to it, locked with filelock. Two commands that change the same file at
once take turns, so neither loses the other's entries. A command waits up
to LOCK_TIMEOUT_SECONDS for the lock, then fails naming the file. The lock
file stays in place on Linux and macOS: removing it while another command
waits would let the two lock different files of the same name.
"""

from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

from filelock import FileLock, Timeout

from .utils import explain_permission_error

LOCK_TIMEOUT_SECONDS = 30


def lock_path(path: Path) -> Path:
    """The lock file of *path*: <path>.lock, next to it."""
    return path.with_name(f"{path.name}.lock")


@contextmanager
def locked(path: Path) -> Iterator[None]:
    """Hold the lock of *path* for the block.

    Raises:
        TimeoutError: When another command held it for LOCK_TIMEOUT_SECONDS.
        PermissionError: When the lock file cannot be opened (one a root run
            made belongs to root), with one chown for it and *path*.
    """
    lock = FileLock(lock_path(path), timeout=LOCK_TIMEOUT_SECONDS)
    with explain_permission_error(lock_path(path), path):
        try:
            lock.acquire()
        except Timeout as exc:
            raise TimeoutError(
                f"{path} is being changed by another dtaas-services command: "
                f"its lock {lock_path(path)} was not released within "
                f"{LOCK_TIMEOUT_SECONDS} seconds."
            ) from exc
    try:
        yield
    finally:
        lock.release()
