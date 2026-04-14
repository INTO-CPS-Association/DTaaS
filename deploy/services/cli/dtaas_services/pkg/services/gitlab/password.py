"""Retrieve the GitLab initial root password from the container."""

import logging
import os
from typing import Tuple

import gitlab
import gitlab.exceptions

from .personal_token import _load_pat_from_tokens
from ...config import Config
from ...docker_utils import execute_docker_command, DockerRunOptions
from ...password_store import save_password
from ._api import get_gitlab_client

logger = logging.getLogger(__name__)

PASSWORD_FILE_PATH = "/etc/gitlab/initial_root_password"
GITLAB_CONTAINER_NAME = "gitlab"
ROOT_USER_ID = 1
GITLAB_PW_KEY = "GITLAB_ROOT_CURRENT_PASSWORD"


def _parse_password_from_output(raw_output: str) -> str | None:
    """Extract the password from the initial_root_password file content.

    Args:
        raw_output: Full text content of the initial_root_password file

    Returns:
        The password string, or None if not found
    """
    for line in raw_output.splitlines():
        stripped = line.strip()
        if stripped.startswith("Password:"):
            return stripped.split("Password:", 1)[1].strip()
    return None


def get_password_file() -> tuple[bool, str]:
    """Read the initial root password file from the GitLab container."""

    cmd = ["cat", PASSWORD_FILE_PATH]

    success, output = execute_docker_command(
        GITLAB_CONTAINER_NAME, cmd, DockerRunOptions(verbose=False)
    )

    if not success:
        if "No such file" in output:
            return False, (
                f"Password file not found at {PASSWORD_FILE_PATH}. "
                "GitLab deletes this file 24 hours after first boot. "
                "You may need to reset the root password manually."
            )
        return False, f"Failed to read initial password: {output}"

    return True, output


def get_initial_root_password() -> tuple[bool, str]:
    """Read the initial root password from the GitLab container.

    Runs ``docker exec gitlab cat /etc/gitlab/initial_root_password``
    and parses the password from the output.

    Returns:
        Tuple of (success, password_or_error_message)
    """
    success, output = get_password_file()

    if success:
        password = _parse_password_from_output(output)
        if password is None:
            return False, (
                "Could not parse password from file content. "
                "Expected a line starting with 'Password:'."
            )

        logger.info("Successfully retrieved GitLab initial root password.")
        return True, password

    return False, output


def _get_root_new_password() -> Tuple[bool, str]:
    """Read the new root password from environment.

    Returns:
        Tuple of (success, password_or_error)
    """
    password = os.getenv("GITLAB_ROOT_NEW_PASSWORD", "")
    if not password:
        return False, (
            "GITLAB_ROOT_NEW_PASSWORD is not set in config/services.env. "
            "Cannot reset password."
        )
    return True, password


def _apply_password_reset(pat: str, new_pw: str) -> Tuple[bool, str]:
    """Call the GitLab API to update the root user's password.

    Args:
        pat: Personal Access Token
        new_pw: New password to set

    Returns:
        Tuple of (success, message_or_error)
    """
    try:
        gl = get_gitlab_client(pat)
        user = gl.users.get(ROOT_USER_ID)
        user.password = new_pw
        user.skip_reconfirmation = True
        user.save()
        logger.info("GitLab root password reset successfully")
        save_password(GITLAB_PW_KEY, new_pw)
        return True, "GitLab root password updated successfully"
    except gitlab.exceptions.GitlabError as exc:
        return False, f"Failed to reset root password: {exc}"


def reset_gitlab_password() -> Tuple[bool, str]:
    """Reset the GitLab root password.

    Reads ``GITLAB_ROOT_NEW_PASSWORD`` from config/services.env and
    changes the root (admin) password via the GitLab REST API.

    Returns:
        Tuple of (success, message)
    """
    Config()

    success, pat = _load_pat_from_tokens()
    if not success:
        return False, pat

    success, new_pw = _get_root_new_password()
    if not success:
        return False, new_pw

    return _apply_password_reset(pat, new_pw)
