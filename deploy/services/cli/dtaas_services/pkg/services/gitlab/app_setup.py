"""OAuth apps step of the GitLab install: run the script, save, report."""

from dataclasses import asdict
from typing import Any, Tuple

from rich.console import Console

from .app_token import OAuthAppOptions, OAuthAppsOutcome, create_oauth_applications
from .tokens_file import TOKENS_FILENAME, merge_tokens, read_saved_tokens


def _save_apps(outcome: OAuthAppsOutcome) -> list[str]:
    """Save every app that has a usable secret; return the save error, if any."""
    if not outcome.apps:
        return []
    success, msg = merge_tokens({key: asdict(app) for key, app in outcome.apps.items()})
    return [] if success else [msg]


def _report_instance_apps(console: Console, found: list[dict], replaced: bool) -> None:
    """List the same name instance wide apps the script deleted or left alone."""
    verb = "Deleted" if replaced else "Kept"
    for app in found:
        console.print(
            f"[yellow]  ⚠️ {verb} instance wide app '{app['name']}' "
            f"(id {app['id']}, client id {app['uid']}).[/yellow]"
        )
    if found and not replaced:
        console.print(
            "[yellow]  Once DTaaS uses root's apps, delete them in Admin Area > "
            "Applications or rerun with --replace-instance-apps.[/yellow]"
        )


def _saved_credentials(saved: dict[str, Any], key: str) -> tuple:
    """Return the saved (client id, client secret) of server_app or client_app."""
    entry = saved.get(key)
    if not isinstance(entry, dict):
        return None, None
    return entry.get("client_id"), entry.get("client_secret")


def _report_new_credentials(
    console: Console, outcome: OAuthAppsOutcome, saved: dict[str, Any]
) -> None:
    """Tell the operator which deployed credentials are now out of date."""
    changed = [
        app.name
        for key, app in outcome.apps.items()
        if _saved_credentials(saved, key) != (app.client_id, app.client_secret)
    ]
    if changed:
        console.print(
            f"[yellow]  ⚠️ New credentials for {', '.join(changed)} saved in "
            f"config/{TOKENS_FILENAME}. Copy them into the DTaaS configuration "
            "(GITLAB_INTEGRATION.md, step 4).[/yellow]"
        )


def step_create_oauth_apps(console: Console, options: OAuthAppOptions) -> Tuple[bool, str]:
    """Create or update root's apps; save each with a secret, even on failure."""
    console.print(
        "[cyan]Creating root's OAuth applications (gitlab-rails runner, "
        "about a minute)...[/cyan]"
    )
    saved, error = read_saved_tokens()
    if error:
        return False, error
    outcome = create_oauth_applications(options, saved)
    save_errors = _save_apps(outcome)
    _report_instance_apps(console, outcome.instance_apps, options.replace_instance_apps)
    if not save_errors:
        _report_new_credentials(console, outcome, saved)
    errors = outcome.errors + save_errors
    if errors:
        return False, "; ".join(errors)
    console.print(
        "[green]  ✅ Server and Client Authorization apps ready in root's "
        "User Settings > Applications.[/green]"
    )
    return True, ""
