"""The template settings of the GitLab project step, from config/services.env.

GITLAB_TEMPLATE_HOST (an http(s) URL) and GITLAB_TEMPLATE_GROUP (a GitLab
group path) name where the templates of each user's projects live. The value
rules and the URLs are gitlab_common's, shared with the DTaaS CLI, so both
accept the same settings and fill the same projects. Both keys left out, or
empty, mean accounts and tokens only.
"""

import os
from typing import Tuple

from ....gitlab_common import TemplateKeys, template_errors, template_urls

TEMPLATE_KEYS = TemplateKeys("GITLAB_TEMPLATE_HOST", "GITLAB_TEMPLATE_GROUP")


def _setting(key: str) -> str | None:
    """The value of *key* in the environment, or None when it is unset or
    empty."""
    return os.getenv(key, "").strip() or None


def read_templates() -> Tuple[dict[str, str], str]:
    """Return {project name: template URL} from config/services.env, and ""
    or why the settings cannot be used.

    {} with no error means accounts and tokens only. Read before any user
    is touched, so a bad setting fails the GitLab step at once.
    """
    host = _setting(TEMPLATE_KEYS.host)
    group = _setting(TEMPLATE_KEYS.group)
    errors = template_errors(host, group, TEMPLATE_KEYS)
    if errors:
        return {}, f"Invalid settings in config/services.env: {'. '.join(errors)}."
    if host is None or group is None:
        return {}, ""
    return template_urls(host, group), ""
