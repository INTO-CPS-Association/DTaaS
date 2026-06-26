"""Handlers for the 'dtaas admin install and uninstall' commands."""

import shutil
from pathlib import Path
from python_on_whales import DockerClient
from python_on_whales.utils import ValidPath

COMPOSE_FILE = "docker-compose.yml"
USERS_COMPOSE_FILE = "compose.users.yml"
USER_FILES_DIR = "files"
ENV_FILE = Path("config") / ".env"
# files/ entries provided by the deployment template (shared workspace and the
# per-user skeleton), as opposed to generated per-user directories. These are
# kept by --remove-user-files so a later install can repopulate user dirs.
SCAFFOLDING_ENTRIES = frozenset({"common", "template"})


def _env_files(directory) -> list[ValidPath]:
    """Return the deployment's env file for compose, or an empty list."""
    env_file = Path(directory) / ENV_FILE
    if env_file.is_file():
        return [str(env_file)]
    return []


def _client(directory):
    """Return a DockerClient bound to the deployment's compose file."""
    return DockerClient(
        compose_files=[str(Path(directory) / COMPOSE_FILE)],
        compose_env_files=_env_files(directory),
    )


def _users_client(directory):
    """Return a DockerClient for the 'user add' compose file, or None if absent.

    Users added via 'dtaas admin user add' run from compose.users.yml as a
    separate compose project, so the main compose file does not know about them.
    """
    users_compose = Path(directory) / USERS_COMPOSE_FILE
    if not users_compose.is_file():
        return None
    return DockerClient(compose_files=[str(users_compose)])


def _toml_present(directory):
    """True if dtaas.toml exists in *directory* or the current directory."""
    return (Path(directory) / "dtaas.toml").is_file() or Path("dtaas.toml").is_file()


def require_compose_file(directory):
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
    require_compose_file(directory)
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


def _is_generated_user_dir(child):
    """True if *child* is a generated per-user directory safe to delete.

    Excludes the 'common' and 'template' scaffolding, any non-directory entry,
    and symlinks (which could point outside the installation).
    """
    if child.name in SCAFFOLDING_ENTRIES:
        return False
    return child.is_dir() and not child.is_symlink()


def _remove_user_dirs(files_dir):
    """Delete generated per-user directories, keeping template scaffolding.

    Returns the names removed. The shared 'common' workspace and the per-user
    'template' skeleton are preserved so a subsequent install can recreate the
    user directories from them.
    """
    removed = []
    for child in files_dir.iterdir():
        if not _is_generated_user_dir(child):
            continue
        shutil.rmtree(child)
        removed.append(child.name)
    return removed


def delete_user_files(directory):
    """Delete generated per-user workspace directories. Return a status message.

    The deployment-provided scaffolding (files/common and files/template) is
    kept so 'dtaas admin install' can repopulate the per-user directories.
    """
    files_dir = _user_files_dir(directory)
    if files_dir is None:
        return f"No '{USER_FILES_DIR}' directory found; nothing to remove."
    removed = _remove_user_dirs(files_dir)
    if not removed:
        return f"No per-user directories found in '{files_dir}'; nothing to remove."
    return f"Removed user files at '{files_dir}'."


def _down_user_containers(directory):
    """Tear down containers added via 'dtaas admin user add', if any exist.

    These live in compose.users.yml as a separate project, so the main
    'compose down' would otherwise leave them running and hold the shared
    network open.
    """
    client = _users_client(directory)
    if client is not None:
        client.compose.down(remove_orphans=True)


def uninstall(directory=".", remove_user_files=False):
    """Tear the deployment down with 'docker compose down'.

    Requires a generated compose file in *directory* so that teardown and any
    file removal act only on a real deployment. User-added containers are torn
    down first so the shared network is free when the main project is removed.
    Returns a message about removed files when *remove_user_files* is set,
    otherwise None. Raises DockerException if compose itself fails.
    """
    require_compose_file(directory)
    _down_user_containers(directory)
    _client(directory).compose.down()
    if remove_user_files:
        return delete_user_files(directory)
    return None


def installation_present(directory):
    """True if any deployment or user-added containers exist for *directory*.

    Lets a repeated uninstall report that nothing is installed instead of
    claiming a successful teardown. Containers in any state count, since a
    stopped container is still part of an installation.
    """
    if not (Path(directory) / COMPOSE_FILE).is_file():
        return False
    if _client(directory).compose.ps(all=True):
        return True
    client = _users_client(directory)
    return client is not None and bool(client.compose.ps(all=True))


def restart_service(directory, service):
    """Recreate one compose service so it picks up new certificates or config.

    Mirrors 'docker compose up -d --force-recreate <service>'. Raises OSError
    if the deployment is missing, or DockerException if compose itself fails.
    """
    require_compose_file(directory)
    _client(directory).compose.up(services=[service], force_recreate=True, detach=True)


def stop_service(directory, service):
    """Stop one compose service so its files can be safely replaced.

    Raises OSError if the deployment is missing, or DockerException if compose
    itself fails.
    """
    require_compose_file(directory)
    _client(directory).compose.stop(services=[service])


def service_running(directory, service):
    """Return True if *service*'s container is currently running.

    A stopped or exited container is not listed by 'compose ps', so the absence
    of a running container reads as False.
    """
    require_compose_file(directory)
    containers = _client(directory).compose.ps(services=[service])
    return any(container.state.running for container in containers)
