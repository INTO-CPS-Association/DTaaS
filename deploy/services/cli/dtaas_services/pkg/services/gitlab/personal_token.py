"""Create GitLab Personal Access Tokens with gitlab-rails runner."""

import json
from pathlib import Path
from typing import Tuple

from ...docker_utils import execute_docker_command, DockerRunOptions
from .tokens_file import get_tokens_path as _get_tokens_path

PAT_NAME = "dtaas-services"
ROOT_USER_ID = 1
GITLAB_CONTAINER_NAME = "gitlab"
PAT_MARKER = "DTAAS_PAT="

# Revokes root's active PATs named PAT_NAME, then creates a new one.
# GitLab generates the token and the script prints it, so no secret is
# passed on the docker command line, which other host users can read.
PAT_SCRIPT = (
    f"user = User.find({ROOT_USER_ID}); "
    f"user.personal_access_tokens.active.where(name: '{PAT_NAME}')"
    ".each(&:revoke!); "
    f"token = user.personal_access_tokens.create!(name: '{PAT_NAME}', "
    "scopes: ['api'], expires_at: 365.days.from_now); "
    f'puts "{PAT_MARKER}#{{token.token}}"'
)


def _parse_pat(output: str) -> tuple[bool, str]:
    """Extract the token printed by PAT_SCRIPT from gitlab-rails output.

    Args:
        output: Standard output of the gitlab-rails runner call

    Returns:
        Tuple of (success, token_or_error)
    """
    for line in output.splitlines():
        stripped = line.strip()
        if stripped.startswith(PAT_MARKER) and stripped != PAT_MARKER:
            return True, stripped.removeprefix(PAT_MARKER)
    return False, "No token in the gitlab-rails runner output"


def create_pat() -> tuple[bool, str]:
    """Create a root admin Personal Access Token inside the GitLab container.

    Runs PAT_SCRIPT with ``gitlab-rails runner``, which needs no password
    and works on every GitLab version (GitLab 19 removed the OAuth password
    grant). Rails starts slowly, so this takes about a minute.

    Returns:
        Tuple of (success, token_or_error)
    """
    success, output = execute_docker_command(
        GITLAB_CONTAINER_NAME,
        ["gitlab-rails", "runner", PAT_SCRIPT],
        DockerRunOptions(verbose=False),
    )
    if not success:
        return False, f"Failed to create PAT with gitlab-rails runner: {output}"
    return _parse_pat(output)


def _read_tokens_file(tokens_path: Path) -> Tuple[bool, str]:
    """Read and extract the admin PAT from a tokens JSON file.

    Returns:
        Tuple of (success, pat_or_error)
    """
    try:
        with tokens_path.open("r", encoding="utf-8") as fh:
            data = json.load(fh)
        pat = data.get("personal_access_token", "")
        if not pat:
            return False, "personal_access_token is empty in token file."
        return True, pat
    except (OSError, json.JSONDecodeError, KeyError) as exc:
        return False, f"Failed to read token file: {exc}"


def _load_pat_from_tokens() -> Tuple[bool, str]:
    """Load the admin Personal Access Token from the install-time tokens file.

    The tokens file is created by ``dtaas-services service install -s gitlab``.

    Returns:
        Tuple of (success, pat_or_error)
    """
    tokens_path = _get_tokens_path()
    if not tokens_path.exists():
        return False, (
            f"Token file not found: {tokens_path}\n"
            "Run 'dtaas-services service install -s gitlab' first."
        )
    return _read_tokens_file(tokens_path)
