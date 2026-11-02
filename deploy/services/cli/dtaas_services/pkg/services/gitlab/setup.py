"""GitLab post-install setup orchestration."""

import json
import logging
from typing import Tuple

from rich.console import Console

from ...password_store import get_current_password
from ...utils import write_secret_file
from .app_setup import step_create_oauth_apps
from .app_token import OAuthAppOptions
from .health import is_gitlab_healthy
from .password import GITLAB_PW_KEY, get_initial_root_password, reset_gitlab_password
from .personal_token import create_pat
from .tokens_file import get_tokens_path, merge_tokens

logger = logging.getLogger(__name__)


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
    """Create a Personal Access Token (PAT)."""
    console.print(
        "[cyan]Creating Personal Access Token (gitlab-rails runner, "
        "about a minute)...[/cyan]"
    )
    success, token = create_pat()
    if not success:
        return False, token
    console.print("[green]✅ Personal Access Token created.[/green]")
    return True, token


def _step_save_tokens(console: Console, fields: dict) -> Tuple[bool, str]:
    """Save fields into the tokens file right away."""
    success, msg = merge_tokens(fields)
    if success:
        console.print(f"[green]✅ {msg}[/green]")
    return success, msg


def _step_password_and_pat(console: Console, first_install: bool) -> Tuple[bool, str]:
    """Read the initial root password (first install only), create the PAT, save.

    Creating the PAT revokes the previous one, so the new PAT is saved
    before any later step can fail.
    """
    fields = {}
    if first_install:
        success, password = _step_get_password(console)
        if not success:
            return False, password
        fields["root_password"] = password
    success, pat = _step_create_pat(console)
    if not success:
        return False, pat
    fields["personal_access_token"] = pat
    return _step_save_tokens(console, fields)


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
    tokens_path = get_tokens_path()
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


def _finish_first_install(console: Console) -> Tuple[bool, str]:
    """Set the configured root password and move the initial one to the backup."""
    pw_ok, pw_msg = _step_reset_root_password(console)
    if not pw_ok:
        return False, f"Root password reset failed: {pw_msg}"
    bk_ok, bk_msg = _step_remove_root_password_from_tokens(console)
    if not bk_ok:
        return False, f"Failed to remove root password from tokens: {bk_msg}"
    return True, ""


def _is_first_install() -> bool:
    """The first install records root's password once it has reset it."""
    return not get_current_password(GITLAB_PW_KEY)


def _run_token_steps(
    console: Console, first_install: bool, options: OAuthAppOptions
) -> Tuple[bool, str]:
    """Create and save the PAT, then the OAuth apps."""
    success, msg = _step_password_and_pat(console, first_install)
    if not success:
        return False, msg
    return step_create_oauth_apps(console, options)


def _finish(console: Console, first_install: bool) -> Tuple[bool, str]:
    """Reset the root password on the first install only.

    A rerun leaves it alone: the initial password file is gone after 24
    hours, and the reset would undo a password changed since.
    """
    if first_install:
        return _finish_first_install(console)
    console.print(
        "[cyan]Root password was set by an earlier install; left unchanged "
        "(dtaas-services user reset-password -s gitlab resets it).[/cyan]"
    )
    return True, ""


def setup_gitlab(
    console: Console, docker, options: OAuthAppOptions | None = None
) -> Tuple[bool, str]:
    """Run the GitLab post-install setup.

    Check health, then initial password (first install), PAT, OAuth apps,
    then root password reset and backup (first install). Every secret is
    saved as soon as it exists.
    """
    console.print("[bold cyan]Starting GitLab setup...[/bold cyan]")
    healthy, status_msg = _check_gitlab_health(console, docker)
    if not healthy:
        return False, status_msg
    first_install = _is_first_install()
    success, msg = _run_token_steps(console, first_install, options or OAuthAppOptions())
    if success:
        success, msg = _finish(console, first_install)
    return (True, "GitLab setup completed successfully.") if success else (False, msg)
