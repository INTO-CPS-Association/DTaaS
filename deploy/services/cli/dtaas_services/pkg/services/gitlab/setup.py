"""GitLab post-install setup orchestration."""

import json
import logging
from pathlib import Path
from typing import Tuple, cast
from dataclasses import dataclass, asdict

from rich.console import Console

from ...config import Config
from ...utils import write_secret_file
from .health import is_gitlab_healthy
from .password import get_initial_root_password, reset_gitlab_password
from .personal_token import create_personal_access_token
from .app_token import (
    OAuthAppResult,
    create_server_application,
    create_client_application,
)

logger = logging.getLogger(__name__)

TOKENS_FILENAME = "gitlab_tokens.json"


@dataclass
class GitLabTokens:
    """All tokens produced by the GitLab setup process."""

    root_password: str
    personal_access_token: str
    server_app: dict
    client_app: dict


def _save_tokens(tokens: GitLabTokens, output_path: Path) -> Tuple[bool, str]:
    """Save tokens to a JSON file."""
    try:
        write_secret_file(output_path, json.dumps(asdict(tokens), indent=2))
        return True, f"Tokens saved to {output_path}"
    except OSError as exc:
        return False, f"Failed to save tokens: {exc}"


def _get_tokens_output_path() -> Path:
    """Return path to config/gitlab_tokens.json."""
    base_dir = Config.get_base_dir()
    return base_dir / "config" / TOKENS_FILENAME


def _app_result_to_dict(result: OAuthAppResult) -> dict:
    """Convert an OAuthAppResult to a plain dict for serialization."""
    return asdict(result)


def _check_gitlab_health(console: Console, docker) -> Tuple[bool, str]:
    """Check if GitLab is healthy (non-blocking).

    Returns:
        Tuple of (is_healthy, status_or_error_msg)
    """
    health_status = is_gitlab_healthy(docker)
    if health_status == "healthy":
        console.print("[green]\u2705 GitLab is healthy.[/green]")
        return True, ""
    return False, health_status


def _step_get_password(console: Console) -> Tuple[bool, str]:
    """Retrieve the initial root password."""
    console.print("[cyan]Retrieving initial root password...[/cyan]")
    success, password = get_initial_root_password()
    if not success:
        return False, password
    console.print("[green]✅ Root password retrieved.[/green]")
    return True, password


def _step_create_pat(console: Console) -> Tuple[bool, str]:
    """Create a Personal Access Token."""
    console.print("[cyan]Creating Personal Access Token...[/cyan]")
    success, token = create_personal_access_token()
    if not success:
        return False, token
    console.print("[green]✅ Personal Access Token created.[/green]")
    return True, token


def _step_save_tokens(
    console: Console,
    root_password: str,
    results: dict,
) -> Tuple[bool, str]:
    """Save all tokens to a JSON file."""
    tokens = GitLabTokens(
        root_password=root_password,
        personal_access_token=cast(str, results.get("pat")),
        server_app=_app_result_to_dict(
            cast(OAuthAppResult, results.get("server_result"))
        ),
        client_app=_app_result_to_dict(
            cast(OAuthAppResult, results.get("client_result"))
        ),
    )

    output_path = _get_tokens_output_path()
    success, msg = _save_tokens(tokens, output_path)

    if success:
        console.print(f"[green]✅ {msg}[/green]")
    return success, msg


def _run_prereq_steps(console: Console, docker) -> Tuple[bool, str, str, str]:
    """Run health check, password retrieval, PAT creation."""
    healthy, status_msg = _check_gitlab_health(console, docker)
    if not healthy:
        return False, "", "", status_msg

    success, root_password = _step_get_password(console)
    if not success:
        return False, "", "", root_password

    success, pat = _step_create_pat(console)
    error = "" if success else pat
    return success, root_password, pat, error


def _step_reset_root_password(console: Console) -> Tuple[bool, str]:
    """Reset root password to GITLAB_ROOT_NEW_PASSWORD right after install.

    Returns:
        Tuple of (success, message)
    """
    console.print("[cyan]Resetting root password to configured value...[/cyan]")
    success, msg = reset_gitlab_password()
    if success:
        console.print("[green]\u2705 Root password updated.[/green]")
    return success, msg


def _step_remove_root_password_from_tokens(console: Console) -> Tuple[bool, str]:
    """Backup gitlab_tokens.json then remove the root_password entry from it.

    Returns:
        Tuple of (success, message)
    """
    console.print(
        "[cyan]Backing up tokens and removing root password from tokens file...[/cyan]"
    )
    tokens_path = _get_tokens_output_path()
    backup_path = tokens_path.parent / "backup_gitlab_tokens.json"
    try:
        with tokens_path.open("r", encoding="utf-8") as fh:
            tokens_data = json.load(fh)
        write_secret_file(backup_path, json.dumps(tokens_data, indent=2))
        tokens_data.pop("root_password", None)
        write_secret_file(tokens_path, json.dumps(tokens_data, indent=2))
        console.print("[green]\u2705 Root password removed from tokens file.[/green]")
        return True, "Root password removed from gitlab_tokens.json."
    except OSError as exc:
        return False, f"Failed to update tokens file: {exc}"


def _step_create_oauth_apps(
    console: Console, pat: str
) -> Tuple[bool, OAuthAppResult | None, OAuthAppResult | None, str]:
    """Create both OAuth application tokens."""
    console.print("[cyan]Creating OAuth application tokens...[/cyan]")

    success, server_result, error_msg = create_server_application(pat)
    if not success:
        return False, None, None, error_msg
    console.print("[green]  ✅ Server Authorization app created.[/green]")

    success, client_result, error_msg = create_client_application(pat)
    if not success:
        return False, None, None, error_msg
    console.print("[green]  ✅ Client Authorization app created.[/green]")

    return True, server_result, client_result, ""


def _setup_tokens_phase(
    console: Console, pat: str, root_password: str
) -> Tuple[bool, str]:
    """Create OAuth apps, validate results, and save all tokens."""
    success, server_result, client_result, error_msg = _step_create_oauth_apps(
        console, pat
    )
    if not success:
        return False, error_msg

    if server_result is None or client_result is None:
        return False, "Unexpected error: OAuth app results are missing"

    results = {
        "pat": pat,
        "server_result": server_result,
        "client_result": client_result,
    }
    return _step_save_tokens(console, root_password, results)


def setup_gitlab(console: Console, docker) -> Tuple[bool, str]:
    """Run the full GitLab post-install setup.

    Check health → password → PAT → OAuth apps → save → reset root password.
    """
    console.print("[bold cyan]Starting GitLab setup...[/bold cyan]")

    success, root_password, pat, error_msg = _run_prereq_steps(console, docker)
    if not success:
        return False, error_msg

    ok, msg = _setup_tokens_phase(console, pat, root_password)
    if not ok:
        return False, msg

    pw_ok, pw_msg = _step_reset_root_password(console)
    if not pw_ok:
        return False, f"Root password reset failed: {pw_msg}"

    bk_ok, bk_msg = _step_remove_root_password_from_tokens(console)
    if not bk_ok:
        return False, f"Failed to remove root password from tokens: {bk_msg}"

    return True, "GitLab setup completed successfully."
