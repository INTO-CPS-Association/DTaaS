"""Check the logger-url key of the [frontend] section of dtaas.toml.

Split out of config_validate.py, which is near its line limit.
logger-url names the logger the website sends workflow logs to; an empty
string turns remote logging off. Without the key, the server deploy types
point the website at the logger they run themselves
(_deploy_data._frontend_js). 'config validate' and 'deployment generate'
warn in three cases, so the admin knows what the website does: the key is
missing, empty, or still the example the template ships.
"""

from ..gitlab_common import with_hint
from ._deploy_data import _CLIENT_JS_FILE
from .validators import get_nested, is_url, optional

TEMPLATE_EXAMPLE = "https://foo.com/logger"

# State of logger-url -> (summary, hint); the hint's {} is the URL in use.
_WARNINGS = {
    "unset": (
        "Warning: frontend.logger-url is not set",
        "{}, the logger of this installation.\n"
        "Set logger-url in dtaas.toml to choose it explicitly.",
    ),
    "empty": (
        "Warning: frontend.logger-url is empty",
        "Remote logging is off: LOGGER_URL is empty and the website hides\n"
        "the option. Set logger-url in dtaas.toml to turn it on.",
    ),
    "example": (
        "Warning: frontend.logger-url is the template example",
        f"Logs go to {TEMPLATE_EXAMPLE}, which is not your logger.\n"
        'Set logger-url to your logger, or to "" to turn remote logging off.',
    ),
}


def _is_logger_url(value):
    """True for a URL, or an empty string (remote logging off)."""
    return value == "" or is_url(value)


def check_logger_url(data):
    """frontend.logger-url, when present, must be a URL or empty."""
    message = "frontend.logger-url must be a valid URL, or empty to turn it off"
    return optional(data, ("frontend", "logger-url"), (_is_logger_url, message))


def _logger_url_state(data):
    """Return 'unset', 'empty' or 'example' for a warning, else None."""
    url = get_nested(data, "frontend", "logger-url")
    if url is None:
        return "unset"
    if not isinstance(url, str):
        return None
    return {"": "empty", TEMPLATE_EXAMPLE: "example"}.get(url.strip())


def _warnings(data, used):
    """Return the logger-url warning for *data*, naming *used*, or []."""
    state = _logger_url_state(data)
    if state is None:
        return []
    summary, hint = _WARNINGS[state]
    return [with_hint(summary, hint.format(used))]


def validate_warnings(data):
    """Warnings for 'config validate', which knows no deploy type.

    A [frontend] section is only used by the server deploy types, so its
    presence is what makes logger-url worth a warning.
    """
    if not isinstance(get_nested(data, "frontend"), dict):
        return []
    dns = get_nested(data, "common", "server-dns") or "<server-dns>"
    used = f"The server deploy types use http(s)://{dns}/logger"
    return _warnings(data, used)


def _written_logger_url(specs):
    """Return the LOGGER_URL *specs* write into config/client.js, or None."""
    for rel_path, _, values in specs:
        if rel_path == _CLIENT_JS_FILE:
            return values.get("LOGGER_URL")
    return None


def generate_warnings(data, specs):
    """Warnings for 'deployment generate', for the types that write LOGGER_URL."""
    url = _written_logger_url(specs)
    if url is None:
        return []
    return _warnings(data, f"LOGGER_URL is {url}")
