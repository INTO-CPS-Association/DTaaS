"""config/gitlab_user_projects.json: the GitLab projects with nothing left to do.

Holds {username: [project name, ...]}. A project is added once this CLI has
created and filled it, or once it has warned about a project with content
that it found in place. A re-run skips the projects listed here, without
asking GitLab. The file is kept like gitlab_user_tokens.json: 'service
remove' and 'service clean' leave it, and 'project generate --force' never
overwrites it.
"""

from pathlib import Path
from typing import Tuple

from ...config import Config
from .tokens_file import merge_json_object, read_json_object

PROJECTS_FILENAME = "gitlab_user_projects.json"


def get_projects_path() -> Path:
    """Return the path to config/gitlab_user_projects.json."""
    return Config.get_base_dir() / "config" / PROJECTS_FILENAME


def read_finished() -> Tuple[dict[str, list[str]], str]:
    """Return {username: finished project names} and "" or why the file
    cannot be read. An entry that is not a list of names counts as none."""
    path = get_projects_path()
    try:
        data = read_json_object(path)
    except (OSError, ValueError) as exc:
        return {}, f"config/{PROJECTS_FILENAME} cannot be read: {exc}"
    finished = {
        user: [name for name in names if isinstance(name, str)]
        for user, names in data.items()
        if isinstance(names, list)
    }
    return finished, ""


def record_finished(username: str, names: list[str]) -> str:
    """Save *names* as *username*'s finished projects: "" or why it failed."""
    try:
        merge_json_object(get_projects_path(), {username: names})
    except (OSError, ValueError) as exc:
        return f"config/{PROJECTS_FILENAME} cannot be written: {exc}"
    return ""
