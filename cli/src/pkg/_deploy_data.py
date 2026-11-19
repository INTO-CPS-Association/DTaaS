"""Per-deployment config file substitution specs used by deploy_config."""

from functools import partial
from .validators import get_nested

# Placeholder strings that represent unconfigured secrets in template files.
# check_placeholders warns when any of these survive substitution.
_SECRET_PLACEHOLDERS = frozenset(
    {
        "your_client_id_here",
        "your_client_secret_here",
        "your_random_secret_key_here",
        "your_keycloak_client_secret_here",
        "changeme",  # NOSONAR
    }
)

_ENV_FILE = "config/.env"
_CLIENT_JS_FILE = "config/client.js"
_CONF_SERVER_FILE = "config/conf.server"
_SRC_USERNAME1 = "users.username1"
_SRC_USERNAME2 = "users.username2"
_DNS = "common.server-dns"


def resolve_logger_url(toml_data, scheme):
    """Return the LOGGER_URL a server deploy type writes, or None.

    A set frontend.logger-url is written as it is, so "" turns remote
    logging off (the website hides the option). Without the key it is the
    logger this installation runs, <scheme>://<server-dns>/logger; None,
    which leaves the template's value, when server-dns is not set either.
    """
    url = get_nested(toml_data, "frontend", "logger-url")
    if url is not None:
        return str(url)
    dns = str(get_nested(toml_data, "common", "server-dns") or "").strip()
    return f"{scheme}://{dns}/logger" if dns else None


def _frontend_js(scheme):
    """JS substitution entries for config/client.js using the given URL scheme."""
    return [
        ("REACT_APP_CLIENT_ID", "frontend.react-app-client-id", "{}"),
        ("REACT_APP_AUTH_AUTHORITY", "frontend.react-app-oauth-url", "{}"),
        ("REACT_APP_URL", _DNS, f"{scheme}://{{}}"),
        ("REACT_APP_REDIRECT_URI", _DNS, f"{scheme}://{{}}/Library"),
        ("REACT_APP_LOGOUT_REDIRECT_URI", _DNS, f"{scheme}://{{}}/"),
        ("LOGGER_URL", None, partial(resolve_logger_url, scheme=scheme)),
    ]


_CONF_SERVER = [
    ("rule.onlyu1.rule", _SRC_USERNAME1, "PathPrefix(`/{}`)"),
    ("rule.onlyu1.whitelist", "users.email1", "{}"),
    ("rule.onlyu2.rule", _SRC_USERNAME2, "PathPrefix(`/{}`)"),
    ("rule.onlyu2.whitelist", "users.email2", "{}"),
]


def _server_env(section):
    """Entries for a server deployment's config/.env file."""
    return [
        ("SERVER_DNS", _DNS, "{}"),
        ("USERNAME1", _SRC_USERNAME1, "{}"),
        ("USERNAME2", _SRC_USERNAME2, "{}"),
        ("OAUTH_URL", f"{section}.oauth-url", "{}"),
        ("OAUTH_CLIENT_ID", f"{section}.oauth-client-id", "{}"),
        ("OAUTH_CLIENT_SECRET", f"{section}.oauth-client-secret", "{}"),
        ("OAUTH_SECRET", f"{section}.oauth-secret", "{}"),
    ]


_DEPLOY_FILES = {
    "localhost": [
        (
            _ENV_FILE,
            "env",
            [("DEFAULT_USER", "localhost.default-user", "{}")],
        ),
        (
            _CLIENT_JS_FILE,
            "js",
            [
                ("REACT_APP_CLIENT_ID", "localhost.client-id", "{}"),
                ("REACT_APP_AUTH_AUTHORITY", "localhost.auth-authority", "{}"),
            ],
        ),
    ],
    "insecure-server": [
        (_ENV_FILE, "env", _server_env("insecure-server")),
        (_CLIENT_JS_FILE, "js", _frontend_js("http")),
        (_CONF_SERVER_FILE, "env", _CONF_SERVER),
    ],
    "secure-server": [
        (_ENV_FILE, "env", _server_env("secure-server")),
        (_CLIENT_JS_FILE, "js", _frontend_js("https")),
        (_CONF_SERVER_FILE, "env", _CONF_SERVER),
    ],
    "secure-server-gitlab": [
        (_ENV_FILE, "env", _server_env("secure-server-gitlab")),
        (_CLIENT_JS_FILE, "js", _frontend_js("https")),
        (_CONF_SERVER_FILE, "env", _CONF_SERVER),
    ],
    "workspace-localhost": [
        (
            _ENV_FILE,
            "env",
            [("DEFAULT_USER", "workspace-localhost.default-user", "{}")],
        ),
        (
            "config/env.local.js",
            "js",
            [
                ("REACT_APP_CLIENT_ID", "workspace-localhost.client-id", "{}"),
                (
                    "REACT_APP_AUTH_AUTHORITY",
                    "workspace-localhost.auth-authority",
                    "{}",
                ),
            ],
        ),
        (
            "config/dex-config.yaml",
            "yaml",
            [
                ("issuer", "workspace-localhost.auth-authority", "{}"),
                ("id", "workspace-localhost.client-id", "{}"),
            ],
        ),
    ],
    "workspace-secure-server": [
        (
            _ENV_FILE,
            "env",
            [
                ("SERVER_DNS", _DNS, "{}"),
                ("USERNAME1", _SRC_USERNAME1, "{}"),
                ("USERNAME2", _SRC_USERNAME2, "{}"),
                ("OAUTH_SECRET", "workspace-secure-server.oauth-secret", "{}"),
                ("KEYCLOAK_ADMIN", "workspace-secure-server.keycloak-admin", "{}"),
                (
                    "KEYCLOAK_ADMIN_PASSWORD",
                    "workspace-secure-server.keycloak-admin-password",
                    "{}",
                ),
                ("KEYCLOAK_REALM", "workspace-secure-server.keycloak-realm", "{}"),
                (
                    "KEYCLOAK_ISSUER_URL",
                    "workspace-secure-server.keycloak-issuer-url",
                    "{}",
                ),
                (
                    "KEYCLOAK_CLIENT_ID",
                    "workspace-secure-server.keycloak-client-id",
                    "{}",
                ),
                (
                    "KEYCLOAK_CLIENT_SECRET",
                    "workspace-secure-server.keycloak-client-secret",
                    "{}",
                ),
            ],
        ),
    ],
}
