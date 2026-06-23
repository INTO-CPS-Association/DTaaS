"""Handlers for the 'dtaas admin install and uninstall' commands.

Installation brings the generated deployment up with 'docker compose'.
Uninstallation tears it down and can optionally remove per-user workspace
files. Compose is driven through python-on-whales, which wraps the docker
CLI and raises python_on_whales.exceptions.DockerException carrying the real
command output (return code and stderr) when a compose operation fails.
"""

import shutil
from pathlib import Path
from python_on_whales import DockerClient

COMPOSE_FILE = "docker-compose.yml"
USER_FILES_DIR = "files"


def _client(directory):
    """Return a DockerClient bound to the deployment's compose file."""
    return DockerClient(compose_files=[str(Path(directory) / COMPOSE_FILE)])


def _toml_present(directory):
    """True if dtaas.toml exists in *directory* or the current directory."""
    return (Path(directory) / "dtaas.toml").is_file() or Path("dtaas.toml").is_file()


def _require_compose_file(directory):
    """Raise OSError if the generated compose file is missing from *directory*."""
    if not (Path(directory) / COMPOSE_FILE).is_file():
        raise OSError(
            f"No '{COMPOSE_FILE}' found in '{directory}'. "
            "Run 'dtaas generate-deployment' first."
        )


def _require_deployment(directory):
    """Raise OSError if the generated deployment files are missing.

    The compose file must live in *directory*; dtaas.toml may live either in
    *directory* or in the current working directory, matching the lookup used
    by generate-deployment.
    """
    _require_compose_file(directory)
    if not _toml_present(directory):
        raise OSError(
            f"No 'dtaas.toml' found in '{directory}' or the current "
            "directory. Run 'dtaas generate-project' first."
        )


def install(directory="."):
    """Bring the generated deployment up with 'docker compose up -d'.

    Raises OSError if the deployment has not been generated, or
    DockerException (from python-on-whales) if compose itself fails.
    """
    _require_deployment(directory)
    _client(directory).compose.up(detach=True)


def _check_within_base(files_dir, base):
    """Reject a symlinked or escaping per-user files directory."""
    if files_dir.is_symlink() or not files_dir.resolve().is_relative_to(base):
        raise OSError(
            f"Refusing to delete '{USER_FILES_DIR}': it is a symlink or "
            "resolves outside the installation directory."
        )


def _user_files_dir(directory):
    """Return the per-user files directory inside *directory*, or None if absent.

    Raises OSError if the directory would escape the installation directory.
    """
    base = Path(directory).resolve()
    files_dir = base / USER_FILES_DIR
    if not files_dir.exists():
        return None
    _check_within_base(files_dir, base)
    return files_dir


def delete_user_files(directory):
    """Delete the per-user workspace files directory. Return a status message."""
    files_dir = _user_files_dir(directory)
    if files_dir is None:
        return f"No '{USER_FILES_DIR}' directory found; nothing to remove."
    shutil.rmtree(files_dir)
    return f"Removed user files at '{files_dir}'."


def uninstall(directory=".", remove_user_files=False):
    """Tear the deployment down with 'docker compose down'.

    Requires a generated compose file in *directory* so that teardown and any
    file removal act only on a real deployment. Returns a message about
    removed files when *remove_user_files* is set, otherwise None. Raises
    DockerException if compose itself fails.
    """
    _require_compose_file(directory)
    _client(directory).compose.down()
    if remove_user_files:
        return delete_user_files(directory)
    return None
