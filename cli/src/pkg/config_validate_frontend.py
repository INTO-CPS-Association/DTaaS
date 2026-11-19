"""Check the logger-url key of the [frontend] section of dtaas.toml.

Split out of config_validate.py, which is near its line limit.
logger-url names the logger the website sends workflow logs to; an empty
string turns remote logging off. Without the key, the server deploy types
point the website at the logger they run themselves
(_deploy_data.resolve_logger_url). 'config validate' and 'deployment
generate' warn, so the admin knows what the website does, when the key is
missing, empty, still the example the template ships, or a URL whose path
does not end in /logger. 'deployment generate' also warns when the
website is served over https and the logger is http (mixed content).
"""

from urllib.parse import urlsplit
from ..gitlab_common import with_hint
from ._deploy_data import _CLIENT_JS_FILE
from .validators import get_nested, is_url, optional

TEMPLATE_EXAMPLE = "https://intocps.org/logger"

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

# Warnings on a set URL; the hint's {} is that URL.
_PATH_WARNING = (
    "Warning: frontend.logger-url does not end in /logger",
    "The logger serves its routes under /logger, so {} may\n"
    "not reach it. Ignore this if a proxy in front of it adds the path.",
)
_MIXED_WARNING = (
    "Warning: frontend.logger-url is http on an https site",
    "Browsers block the website's requests to {} (mixed\n"
    "content), so no logs arrive. Use an https URL for the logger.",
)


def _is_logger_url(value):
    """True for a URL, or an empty string (remote logging off)."""
    return value == "" or is_url(value)


def check_logger_url(data):
    """frontend.logger-url, when present, must be a URL or empty."""
    message = "frontend.logger-url must be a valid URL, or empty to turn it off"
    return optional(data, ("frontend", "logger-url"), (_is_logger_url, message))


def _warning(pair, url):
    """Return one warning from a (summary, hint) *pair*, naming *url*."""
    summary, hint = pair
    return with_hint(summary, hint.format(url))


def _logger_url_state(data):
    """Return 'unset', 'empty' or 'example' for a warning, else None."""
    url = get_nested(data, "frontend", "logger-url")
    if url is None:
        return "unset"
    if not isinstance(url, str):
        return None
    return {"": "empty", TEMPLATE_EXAMPLE: "example"}.get(url)


def _state_warnings(data, used):
    """Return the logger-url state warning for *data*, naming *used*, or []."""
    state = _logger_url_state(data)
    return [_warning(_WARNINGS[state], used)] if state else []


def _path_warnings(data):
    """Warn when a valid logger-url's path does not end in /logger."""
    url = get_nested(data, "frontend", "logger-url")
    if not is_url(url) or urlsplit(str(url)).path.endswith("/logger"):
        return []
    return [_warning(_PATH_WARNING, url)]


def validate_warnings(data):
    """Warnings for 'config validate', which knows no deploy type.

    A [frontend] section is only used by the server deploy types, so its
    presence is what makes logger-url worth a warning.
    """
    if not isinstance(get_nested(data, "frontend"), dict):
        return []
    dns = get_nested(data, "common", "server-dns") or "<server-dns>"
    used = f"The server deploy types use http(s)://{dns}/logger"
    return _state_warnings(data, used) + _path_warnings(data)


def _client_js_values(specs):
    """Return the values *specs* write into config/client.js, or {}."""
    for rel_path, _, values in specs:
        if rel_path == _CLIENT_JS_FILE:
            return values
    return {}


def _mixed_content_warnings(values):
    """Warn when client.js serves the website over https, the logger over http."""
    url = values["LOGGER_URL"]
    site = values.get("REACT_APP_URL", "")
    if site.startswith("https://") and url.lower().startswith("http://"):
        return [_warning(_MIXED_WARNING, url)]
    return []


def generate_warnings(data, specs):
    """Warnings for 'deployment generate', for the types that write LOGGER_URL."""
    values = _client_js_values(specs)
    if "LOGGER_URL" not in values:
        return []
    warnings = _state_warnings(data, f"LOGGER_URL is {values['LOGGER_URL']}")
    return warnings + _path_warnings(data) + _mixed_content_warnings(values)
