"""The gitlab-rails runner script that makes root's OAuth apps, and its output."""

import json
from dataclasses import dataclass
from typing import Any

from ...docker_utils import execute_docker_command, DockerRunOptions
from ...sanitize import escape_js_string
from .personal_token import GITLAB_CONTAINER_NAME, ROOT_USER_ID

APP_MARKER = "DTAAS_APP="
INSTANCE_APP_MARKER = "DTAAS_INSTANCE_APP="
APP_KEYS = ("id", "name", "uid", "secret")
INSTANCE_APP_KEYS = ("id", "name", "uid")

# The REST API only creates instance wide applications, so the script creates
# them as root's (User Settings > Applications). Per configured app, inside one
# transaction: note instance wide apps of the same name and delete them only
# with opts['replace'], reuse or create root's app and apply the configured
# settings. A reused app keeps its secret (printed as null) unless
# opts['rotate'] renews it; GitLab stores secrets hashed, so only a new or
# renewed secret can be printed. Everything is printed after the commit.
APPS_SCRIPT_HEAD = (
    f"root = User.find({ROOT_USER_ID}); "
    "org = root.organization || Organizations::Organization.default_organization; "
    "found = []; "
    "opts = JSON.parse('"
)
APPS_SCRIPT_TAIL = (
    "'); "
    "apps = ActiveRecord::Base.transaction do opts['apps'].map do |cfg| "
    "same = Authn::OauthApplication.where(owner_id: nil, name: cfg['name']).to_a; "
    "found.concat(same.map { |o| { id: o.id, name: o.name, uid: o.uid } }); "
    "same.each(&:destroy!) if opts['replace']; "
    "app = root.oauth_applications.find_or_initialize_by(name: cfg['name']); "
    "keep = app.persisted? && !opts['rotate']; "
    "app.assign_attributes(cfg); app.organization ||= org; "
    "app.renew_secret if app.persisted? && !keep; app.save!; "
    "{ id: app.id, name: app.name, uid: app.uid, "
    "secret: (keep ? nil : app.plaintext_secret) } "
    "end end; "
    f"found.each {{ |o| puts '{INSTANCE_APP_MARKER}' + o.to_json }}; "
    f"apps.each {{ |a| puts '{APP_MARKER}' + a.to_json }}"
)


@dataclass
class OAuthAppOptions:
    """What a rerun may change on existing apps (service install flags)."""

    rotate_secrets: bool = False
    replace_instance_apps: bool = False


def build_apps_script(apps: list[dict[str, Any]], options: OAuthAppOptions) -> str:
    """Return the runner script for the given app settings and options."""
    payload = json.dumps(
        {
            "apps": apps,
            "rotate": options.rotate_secrets,
            "replace": options.replace_instance_apps,
        }
    )
    return APPS_SCRIPT_HEAD + escape_js_string(payload) + APPS_SCRIPT_TAIL


def run_apps_script(
    apps: list[dict[str, Any]], options: OAuthAppOptions
) -> tuple[bool, str]:
    """Run the script in the GitLab container (about a minute).

    The secrets travel on stdout only, never on the docker command line.
    """
    return execute_docker_command(
        GITLAB_CONTAINER_NAME,
        ["gitlab-rails", "runner", build_apps_script(apps, options)],
        DockerRunOptions(verbose=False),
    )


def _read_entry(text: str, keys: tuple[str, ...]) -> tuple[dict | None, str]:
    """Decode one printed object; the error names the problem, not the text."""
    try:
        entry = json.loads(text)
    except ValueError:
        return None, "invalid JSON"
    missing = [k for k in keys if k not in entry] if isinstance(entry, dict) else keys
    if missing:
        return None, f"no {', '.join(missing)}"
    return entry, ""


def parse_marked(
    output: str, marker: str, keys: tuple[str, ...]
) -> tuple[list[dict], list[str]]:
    """Return the objects printed after marker and a reason per unreadable line.

    The reasons never quote a line, since it can hold a client secret.
    """
    texts = [line.strip() for line in output.splitlines()]
    reads = [_read_entry(t.removeprefix(marker), keys) for t in texts if t.startswith(marker)]
    entries = [entry for entry, _ in reads if entry is not None]
    errors = [f"unreadable {marker} line ({error})" for entry, error in reads if entry is None]
    return entries, errors


def runner_error(output: str) -> str:
    """Return the runner's error output without the marked lines (secrets)."""
    markers = (APP_MARKER, INSTANCE_APP_MARKER)
    kept = [line for line in output.splitlines() if not line.strip().startswith(markers)]
    return "\n".join(kept).strip() or "no error output"
