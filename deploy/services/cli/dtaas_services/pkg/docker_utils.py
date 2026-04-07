"""Docker command execution utilities."""

import time
from python_on_whales import DockerClient
from python_on_whales.exceptions import DockerException


def _get_stderr_content(error_str: str) -> str:
    """Extract stderr content from Docker error string.

    Args:
        error_str: Full error string from DockerException

    Returns:
        Stderr content or empty string if not found
    """
    if "stderr is '" not in error_str:
        return ""
    parts = error_str.split("stderr is '", 1)
    if len(parts) <= 1:
        return ""
    return parts[1].split("'")[0]


def _process_stderr_lines(stderr_content: str) -> str:
    """Process stderr content to extract meaningful error message.

    Args:
        stderr_content: Raw stderr content

    Returns:
        Processed error message
    """
    lines = [
        line.strip() for line in stderr_content.strip().split("\n") if line.strip()
    ]
    if not lines:
        return "Unknown error"
    if len(lines) > 1 and lines[0] == "Error:":
        return ": ".join(lines[:2])
    return lines[0]


def _extract_stderr_line(error_str: str) -> str:
    """Extract just the stderr line from Docker error for cleaner display.

    Args:
        error_str: Full error string from DockerException

    Returns:
        Clean error message (stderr line or first line if not found)
    """
    stderr_content = _get_stderr_content(error_str)
    if stderr_content:
        return _process_stderr_lines(stderr_content)
    return error_str.split("\n")[0]


def _format_docker_error(container: str, error_str: str) -> str:
    """Format a DockerException into a user-friendly error message.

    Args:
        container: Container name
        error_str: Raw exception string

    Returns:
        Formatted error message
    """
    if "No such container" in error_str:
        return (
            f"Container '{container}' is not running. "
            f"Please start services first with: dtaas-services start"
        )
    clean_error = _extract_stderr_line(error_str)
    return f"Docker error: {clean_error}"


def execute_docker_command(
    container_name: str, exec_cmd: list[str], verbose: bool = True
) -> tuple[bool, str]:
    """Execute a command in a Docker container.

    Args:
        container_name: Name of the Docker container
        exec_cmd: Command to execute as a list of arguments
        verbose: Whether to print output

    Returns:
        Tuple of (success, output/error message)
    """
    docker = DockerClient()
    try:
        result = docker.execute(container_name, exec_cmd)
    except DockerException as e:
        error_msg = _format_docker_error(container_name, str(e))
        if verbose:
            print(error_msg)
        return False, error_msg
    return True, str(result) if result is not None else ""


def _attempt_docker_exec(
    docker: DockerClient,
    container_name: str,
    exec_cmd: list[str],
    envs: dict[str, str],
) -> tuple[bool, str]:
    """Execute one attempt of a docker command.

    Args:
        docker: DockerClient instance
        container_name: Name of the Docker container
        exec_cmd: Command to execute as a list of arguments
        envs: Environment variables for the command

    Returns:
        Tuple of (success, output or error message)
    """
    try:
        result = docker.execute(container_name, exec_cmd, envs=envs)
        return True, str(result) if result is not None else ""
    except DockerException as e:
        return False, _format_docker_error(container_name, str(e))


def execute_docker_command_with_retry(
    container_name: str,
    exec_cmd: list[str],
    envs: dict[str, str] | None = None,
    max_attempts: int = 3,
    delay: int = 4,
) -> tuple[bool, str]:
    """Execute a command in a Docker container with retries.

    Args:
        container_name: Name of the Docker container
        exec_cmd: Command to execute as a list of arguments
        envs: Optional environment variables for the command
        max_attempts: Maximum number of attempts
        delay: Seconds to wait between retries

    Returns:
        Tuple of (success, output or error message)
    """
    docker = DockerClient()
    resolved_envs = envs or {}
    output = ""
    for attempt in range(max_attempts):
        success, output = _attempt_docker_exec(
            docker, container_name, exec_cmd, resolved_envs
        )
        if success:
            return True, output
        if attempt < max_attempts - 1:
            time.sleep(delay)
    return False, output
