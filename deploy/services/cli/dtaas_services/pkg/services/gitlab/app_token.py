"""Create or update the DTaaS OAuth applications owned by the GitLab root user."""

import json
import os
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

from .app_script import (
    APP_KEYS,
    APP_MARKER,
    INSTANCE_APP_KEYS,
    INSTANCE_APP_MARKER,
    OAuthAppOptions,
    parse_marked,
    run_apps_script,
    runner_error,
)
from .tokens_file import TOKENS_FILENAME

APP_KINDS = ("Server", "Client")


@dataclass
class OAuthAppConfig:
    """Configuration for an OAuth application to create."""

    name: str
    redirect_uri: str
    confidential: bool
    scopes: str
    trusted: bool = False


@dataclass
class OAuthAppResult:
    """Result of creating an OAuth application."""

    application_id: int
    name: str
    client_id: str
    client_secret: str


def _load_oauth_apps_config() -> list[dict[str, Any]]:
    """Load OAuth applications configuration from JSON file.

    Looks for the config file in the config/ directory.
    The filename can be overridden via the OAUTH_APPS environment variable.

    Returns:
        List of OAuth application configurations

    Raises:
        FileNotFoundError: If config file is not found in config/
        json.JSONDecodeError: If config file is invalid JSON
    """
    config_filename = os.getenv("OAUTH_APPS", "gitlab_oauth.json")
    config_path = Path.cwd() / "config" / config_filename

    if not config_path.exists():
        raise FileNotFoundError(
            f"OAuth config file not found: {config_path}\n"
            "Please ensure the config file exists in the config/ directory."
        )

    with open(config_path, "r", encoding="utf-8") as f:
        return json.load(f)


def _build_apps_config() -> list[OAuthAppConfig]:
    """Build OAuth app configurations from JSON config file.

    Returns:
        List of OAuthAppConfig objects

    Raises:
        FileNotFoundError: If config file not found
        json.JSONDecodeError: If config is invalid JSON
        KeyError: If required fields missing in config
    """
    apps_data = _load_oauth_apps_config()
    apps = []

    for app_data in apps_data:
        redirect_uri = app_data.get("redirect_uri")
        if not redirect_uri:
            raise KeyError(
                f"Missing or empty 'redirect_uri' in OAuth app config entry: {app_data}"
            )

        config = OAuthAppConfig(
            name=app_data.get("name", ""),
            redirect_uri=redirect_uri,
            confidential=app_data.get("confidential", False),
            scopes=app_data.get("scopes", ""),
            trusted=app_data.get("trusted", False),
        )
        apps.append(config)

    return apps


def _select_server_and_client() -> tuple[list[OAuthAppConfig], str]:
    """Pick the server and client apps, in that order, from the OAuth config.

    Returns:
        Tuple of (configs, error message); configs is empty on error
    """
    apps = _build_apps_config()
    selected = []
    for kind in APP_KINDS:
        config = next((a for a in apps if kind.lower() in a.name.lower()), None)
        if config is None:
            return [], f"{kind} Authorization app not found in OAuth config"
        selected.append(config)
    return selected, ""


def _entry_named(entries: list[dict], name: str) -> dict | None:
    """Return the printed app with the given name."""
    return next((entry for entry in entries if entry["name"] == name), None)


def _saved_secret(saved: dict[str, Any], client_id: str) -> str | None:
    """Return the secret saved in the tokens file for a client id."""
    apps = [value for value in saved.values() if isinstance(value, dict)]
    return next(
        (a.get("client_secret") for a in apps if a.get("client_id") == client_id), None
    )


def _resolve(
    entry: dict | None, name: str, saved: dict[str, Any]
) -> tuple[OAuthAppResult | None, str]:
    """Build the result of one app; a kept secret comes from the tokens file."""
    if entry is None:
        return None, f"'{name}' missing from the gitlab-rails runner output"
    secret = entry["secret"] or _saved_secret(saved, entry["uid"])
    if not secret:
        return None, (
            f"root's app '{name}' already exists, but config/{TOKENS_FILENAME} "
            f"has no secret for its client id {entry['uid']}. GitLab cannot show "
            "the old secret; rerun with --rotate-secrets to renew it"
        )
    return OAuthAppResult(entry["id"], name, entry["uid"], secret), ""


@dataclass
class OAuthAppsOutcome:
    """What the runner call made, even when part of it failed.

    apps holds every app with a usable secret, keyed server_app and
    client_app as in the tokens file, so the caller can save it before
    reporting errors.
    """

    apps: dict[str, OAuthAppResult] = field(default_factory=dict)
    instance_apps: list[dict] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)


def _collect(
    configs: list[OAuthAppConfig], output: str, saved: dict[str, Any]
) -> OAuthAppsOutcome:
    """Match the printed apps to the configured server and client apps."""
    entries, errors = parse_marked(output, APP_MARKER, APP_KEYS)
    found, found_errors = parse_marked(output, INSTANCE_APP_MARKER, INSTANCE_APP_KEYS)
    outcome = OAuthAppsOutcome(instance_apps=found, errors=errors + found_errors)
    for kind, config in zip(APP_KINDS, configs):
        result, error = _resolve(_entry_named(entries, config.name), config.name, saved)
        if result is None:
            outcome.errors.append(error)
        else:
            outcome.apps[f"{kind.lower()}_app"] = result
    return outcome


def create_oauth_applications(
    options: OAuthAppOptions, saved: dict[str, Any]
) -> OAuthAppsOutcome:
    """Create or update root's DTaaS Server and Client Authorization apps.

    Runs one ``gitlab-rails runner`` call (about a minute). The output is
    read even when the call fails, since the apps are printed after the
    commit and a printed secret must not be lost; the error is then the
    runner's own.

    Args:
        options: Whether to renew secrets and delete same name instance apps
        saved: The tokens file contents, for the secrets of reused apps
    """
    configs, error = _select_server_and_client()
    if error:
        return OAuthAppsOutcome(errors=[error])
    success, output = run_apps_script([asdict(c) for c in configs], options)
    outcome = _collect(configs, output, saved)
    if not success:
        outcome.errors = [f"gitlab-rails runner failed: {runner_error(output)}"]
    return outcome
