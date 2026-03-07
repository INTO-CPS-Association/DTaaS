"""GitLab post-install setup orchestration."""

import json
import logging
from pathlib import Path
from typing import Tuple
from dataclasses import dataclass, asdict

from rich.console import Console

from ...config import Config
from .health import wait_for_gitlab_ready
from .password import get_initial_root_password
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
    """Save tokens to a JSON file.

    Args:
        tokens: All produced tokens
        output_path: Path to write the JSON file

    Returns:
        Tuple of (success, message)
    """
    try:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with output_path.open("w", encoding="utf-8") as fh:
            json.dump(asdict(tokens), fh, indent=2)
        return True, f"Tokens saved to {output_path}"
    except OSError as exc:
        return False, f"Failed to save tokens: {exc}"


def _get_tokens_output_path() -> Path:
    """Get the path where tokens should be saved.

    Returns:
        Path to config/gitlab_tokens.json
    """
    base_dir = Config.get_base_dir()
    return base_dir / "config" / TOKENS_FILENAME


def _app_result_to_dict(result: OAuthAppResult) -> dict:
    """Convert an OAuthAppResult to a plain dict for serialization.

    Args:
        result: OAuth application result

    Returns:
        Dict representation
    """
    return asdict(result)


def _step_wait_for_health(console: Console, docker) -> Tuple[bool, str]:
    """Wait for GitLab to be healthy.

    Args:
        console: Rich console
        docker: Docker client

    Returns:
        Tuple of (success, error_message)
    """
    if not wait_for_gitlab_ready(console, docker):
        return False, "GitLab did not become healthy in time."
    return True, ""


def _step_get_password(console: Console) -> Tuple[bool, str]:
    """Retrieve the initial root password.

    Args:
        console: Rich console

    Returns:
        Tuple of (success, password_or_error)
    """
    console.print("[cyan]Retrieving initial root password...[/cyan]")
    success, password = get_initial_root_password()
    if not success:
        return False, password
    console.print("[green]✅ Root password retrieved.[/green]")
    return True, password


def _step_create_pat(console: Console) -> Tuple[bool, str]:
    """Create a Personal Access Token.

    Args:
        console: Rich console

    Returns:
        Tuple of (success, token_or_error)
    """
    console.print("[cyan]Creating Personal Access Token...[/cyan]")
    success, token = create_personal_access_token()
    if not success:
        return False, token
    console.print("[green]✅ Personal Access Token created.[/green]")
    return True, token


def _step_create_oauth_apps(
    console: Console, pat: str
) -> Tuple[bool, OAuthAppResult | None, OAuthAppResult | None, str]:
    """Create both OAuth application tokens.

    Args:
        console: Rich console
        pat: Personal Access Token for API authentication

    Returns:
        Tuple of (success, server_result, client_result, error_message)
    """
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


def _step_save_tokens(
    console: Console,
    root_password: str,
    pat: str,
    server_result: OAuthAppResult,
    client_result: OAuthAppResult,
) -> Tuple[bool, str]:
    """Save all tokens to a JSON file.

    Args:
        console: Rich console
        root_password: GitLab root password
        pat: Personal Access Token
        server_result: Server OAuth app details
        client_result: Client OAuth app details

    Returns:
        Tuple of (success, message)
    """
    tokens = GitLabTokens(
        root_password=root_password,
        personal_access_token=pat,
        server_app=_app_result_to_dict(server_result),
        client_app=_app_result_to_dict(client_result),
    )

    output_path = _get_tokens_output_path()
    success, msg = _save_tokens(tokens, output_path)

    if success:
        console.print(f"[green]✅ {msg}[/green]")
    return success, msg


def _run_prereq_steps(console: Console, docker) -> Tuple[bool, str, str, str]:
    """Run health check, password retrieval, PAT creation.

    Args:
        console: Rich console for output
        docker: Docker client

    Returns:
        Tuple of (success, root_password, pat, error_message)
    """
    success, error_msg = _step_wait_for_health(console, docker)
    if not success:
        return False, "", "", error_msg

    success, root_password = _step_get_password(console)
    if not success:
        return False, "", "", root_password

    success, pat = _step_create_pat(console)
    error = "" if success else pat
    return success, root_password, pat, error


def setup_gitlab(console: Console, docker) -> Tuple[bool, str]:
    """Run the full GitLab post-install setup.

    Check health → password → PAT → OAuth apps → save.

    Args:
        console: Rich console for output
        docker: Docker client (python-on-whales DockerClient)

    Returns:
        Tuple of (success, message)
    """
    console.print("[bold cyan]Starting GitLab setup...[/bold cyan]")

    success, root_password, pat, error_msg = _run_prereq_steps(console, docker)
    if not success:
        return False, error_msg

    success, server_result, client_result, error_msg = _step_create_oauth_apps(
        console, pat
    )
    if not success:
        return False, error_msg

    if server_result is None or client_result is None:
        return False, "Unexpected error: OAuth app results are missing"

    ok, msg = _step_save_tokens(
        console, root_password, pat, server_result, client_result
    )
    return ok, "GitLab setup completed successfully." if ok else msg
