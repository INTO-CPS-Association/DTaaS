"""The template repositories that a provisioned user's projects come from.

Each consumer reads a template host (an https URL) and a template group
(a GitLab group path) from its own configuration, checks them with
template_errors under its own key names, and gets the template URL of
every project from template_urls, so both CLIs accept the same settings and
fill the same projects from the same repositories.

The host must be https: what is cloned from it is pushed into every user's
private projects, and plain http would let anyone on the network path
change it on the way.
"""

from dataclasses import dataclass

from .validators import is_https_url, is_namespace_path

# Each project a user gets, and the repository in the template group that
# it is filled from.
PROJECT_TEMPLATES = {"common": "common", "user": "user1"}


@dataclass(frozen=True)
class TemplateKeys:
    """The names a consumer gives the two settings, used in its messages."""

    host: str
    group: str

    @property
    def together(self) -> str:
        """The message for a configuration that sets only one of them."""
        return f"{self.group} and {self.host} must both be set, or both left out"

    @property
    def group_rule(self) -> str:
        """The message for a group that is not a GitLab group path."""
        return (
            f"{self.group} must be a GitLab group path, such as dtaas or "
            "dtaas/templates"
        )

    @property
    def host_rule(self) -> str:
        """The message for a host that is not an https URL."""
        return f"{self.host} must be an https URL, such as https://gitlab.com"


def template_errors(host: object, group: object, keys: TemplateKeys) -> list[str]:
    """What is wrong with the template settings, [] when they can be used.

    Each value is None when its key is not set. A value that is set must be
    a GitLab group path (*group*) or an https URL (*host*), and the two are
    set together or not at all: neither means no projects.

    Args:
        host: The template host, or None.
        group: The template group, or None.
        keys: The consumer's names for the two settings.
    """
    checks = (
        (group, is_namespace_path, keys.group_rule),
        (host, is_https_url, keys.host_rule),
    )
    present = [check for check in checks if check[0] is not None]
    errors = [message for value, valid, message in present if not valid(value)]
    if len(present) == 1:
        errors.append(keys.together)
    return errors


def template_urls(host: str, group: str) -> dict[str, str]:
    """{project name: template URL}, each URL <host>/<group>/<repository>.git.

    Args:
        host: The template host, a checked https URL. A trailing slash is
            dropped.
        group: The template group, a checked GitLab group path.
    """
    base = f"{host.rstrip('/')}/{group}"
    return {
        name: f"{base}/{repository}.git"
        for name, repository in PROJECT_TEMPLATES.items()
    }
