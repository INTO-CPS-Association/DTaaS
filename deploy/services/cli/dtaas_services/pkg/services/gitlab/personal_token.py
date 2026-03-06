"""Create a GitLab Personal Access Token via the Rails console."""

import logging
from ...utils import execute_docker_command

logger = logging.getLogger(__name__)

GITLAB_CONTAINER_NAME = "gitlab"
PAT_NAME = "dtaas-services"


def _build_rails_script(token_name: str) -> str:
    """Build the Ruby script that creates a Personal Access Token.

    The script:
    1. Finds the root user (admin, User ID 1)
    2. Revokes any existing token with the same name
    3. Creates a new PersonalAccessToken with ``api`` scope
    4. Prints ONLY the token value to stdout

    Args:
        token_name: Display name for the token

    Returns:
        Ruby script as a string
    """
    return (
        "user = User.find(1); "
        f"user.personal_access_tokens.where(name: '{token_name}').each(&:revoke!); "
        "token = user.personal_access_tokens.create!("
        f"name: '{token_name}', "
        "scopes: ['api'], "
        "expires_at: 365.days.from_now"
        "); "
        "puts token.token"
    )


def _parse_token_from_output(output: str) -> str | None:
    """Extract the token string from rails runner output.

    Args:
        output: Raw stdout from gitlab-rails runner

    Returns:
        Token string or None if parsing fails
    """
    lines = [line.strip() for line in output.strip().splitlines() if line.strip()]
    if not lines:
        return None

    token = lines[-1]

    if len(token) < 10:
        logger.warning(
            f"Token parsing warning: extracted token is too short: '{token}'"
        )
        return None

    return token


def _execute_rails_command() -> tuple[bool, str]:
    """Execute the gitlab-rails runner command.

    Returns:
        Tuple of (success, output_or_error)
    """
    script = _build_rails_script(PAT_NAME)
    cmd = ["gitlab-rails", "runner", script]

    logger.info("Creating Personal Access Token via gitlab-rails runner...")

    return execute_docker_command(GITLAB_CONTAINER_NAME, cmd, verbose=False)


def _extract_and_validate_token(output: str) -> tuple[bool, str]:
    """Extract and validate the token from command output.

    Args:
        output: Raw output from the rails command

    Returns:
        Tuple of (success, token_or_error)
    """
    token = _parse_token_from_output(output)
    if token is None:
        return False, (
            "Could not parse token from gitlab-rails output. "
            f"Raw output: {output[:200]}"
        )
    logger.info("Personal Access Token created successfully.")
    return True, token


def create_personal_access_token() -> tuple[bool, str]:
    """Create a Personal Access Token for the GitLab root user.

    Returns:
        Tuple of (success, token_or_error_message)
    """
    success, output = _execute_rails_command()

    if not success:
        return False, f"Failed to create Personal Access Token: {output}"

    return _extract_and_validate_token(output)
