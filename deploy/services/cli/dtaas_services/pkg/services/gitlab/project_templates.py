"""The template settings of the GitLab project step, from config/services.env.

GITLAB_TEMPLATE_HOST (an https URL) and GITLAB_TEMPLATE_GROUP (a GitLab
group path) name where the templates of each user's projects live. The value
rules and the URLs are gitlab_common's, shared with the DTaaS CLI, so both
accept the same settings and fill the same projects. Both keys left out, or
empty, mean accounts and tokens only.

GITLAB_TEMPLATE_COMMON_COMMIT and GITLAB_TEMPLATE_USER_COMMIT pin the
template of the 'common' and the 'user' project to a full commit id, so
exactly that commit is pushed, whatever the template holds when the user is
added. Each left out, or empty, means that template's default branch. They
apply only with the host and the group.
"""

import os
from dataclasses import dataclass
from typing import Tuple

from ....gitlab_common import (
    PROJECT_TEMPLATES,
    TemplateKeys,
    is_commit_id,
    template_errors,
    template_urls,
)

TEMPLATE_KEYS = TemplateKeys("GITLAB_TEMPLATE_HOST", "GITLAB_TEMPLATE_GROUP")
# The key that pins each project's template to a commit.
COMMIT_KEYS = {
    name: f"GITLAB_TEMPLATE_{name.upper()}_COMMIT" for name in PROJECT_TEMPLATES
}


@dataclass(frozen=True)
class ProjectTemplate:
    """Where a project is filled from: its template's URL, and the commit
    pinned for it ("" for the template's default branch)."""

    url: str
    commit: str = ""


def _setting(key: str) -> str | None:
    """The value of *key* in the environment, or None when it is unset or
    empty."""
    return os.getenv(key, "").strip() or None


def _commit_errors(commits: dict[str, str | None]) -> list[str]:
    """What is wrong with the pinned commits ({project name: value})."""
    return [
        f"{COMMIT_KEYS[name]} must be a full commit id (40 hexadecimal characters)"
        for name, value in commits.items()
        if value is not None and not is_commit_id(value)
    ]


def read_templates() -> Tuple[dict[str, ProjectTemplate], str]:
    """Return {project name: ProjectTemplate} from config/services.env, and
    "" or why the settings cannot be used.

    {} with no error means accounts and tokens only. Read before any user
    is touched, so a bad setting fails the GitLab step at once.
    """
    host = _setting(TEMPLATE_KEYS.host)
    group = _setting(TEMPLATE_KEYS.group)
    commits = {name: _setting(key) for name, key in COMMIT_KEYS.items()}
    errors = template_errors(host, group, TEMPLATE_KEYS) + _commit_errors(commits)
    if errors:
        return {}, f"Invalid settings in config/services.env: {'. '.join(errors)}."
    if host is None or group is None:
        return {}, ""
    urls = template_urls(host, group)
    return {
        name: ProjectTemplate(url, (commits[name] or "").lower())
        for name, url in urls.items()
    }, ""
