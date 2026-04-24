"""Docker command execution utilities."""

import time
from dataclasses import dataclass, field
from typing import NamedTuple
from python_on_whales import DockerClient
from python_on_whales.exceptions import DockerException


@dataclass
class DockerRunOptions:
    """Options controlling retry, environment, and verbosity."""

    envs: dict[str, str] = field(default_factory=dict)
    max_attempts: int = 1
    delay: int = 4
    verbose: bool = True


class _ExecParams(NamedTuple):
    container: str
    cmd: list[str]
    envs: dict[str, str]


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


def _attempt_docker_exec(docker: DockerClient, params: _ExecParams) -> tuple[bool, str]:
    """Execute one attempt of a docker command.

    Args:
        docker: DockerClient instance
        params: Execution parameters (container, command, env vars)

    Returns:
        Tuple of (success, output or error message)
    """
    try:
        result = docker.execute(params.container, params.cmd, envs=params.envs)
        return True, str(result) if result is not None else ""
    except DockerException as e:
        error_str = str(e)
        if "stdout is '" in error_str:
            parts = error_str.split("stdout is '", 1)
            if len(parts) > 1:
                stdout = parts[1].split("'")[0]
                if stdout:
                    return False, stdout
        return False, _format_docker_error(params.container, error_str)


def _sleep_before_retry(attempt: int, opts: DockerRunOptions) -> None:
    """Sleep before next retry if not the last attempt.

    Args:
        attempt: Current attempt number (0-indexed)
        opts: Options containing max_attempts and delay
    """
    if attempt < opts.max_attempts - 1:
        time.sleep(opts.delay)


def _run_with_retry(
    docker: DockerClient, params: _ExecParams, opts: DockerRunOptions
) -> tuple[bool, str]:
    """Retry a docker exec according to the given options.

    Args:
        docker: DockerClient instance
        params: Execution parameters
        opts: Retry and verbosity options

    Returns:
        Tuple of (success, output or error message)
    """
    last_output = ""
    for attempt in range(opts.max_attempts):
        success, output = _attempt_docker_exec(docker, params)
        if success:
            return True, output
        if output:
            last_output = output
        _sleep_before_retry(attempt, opts)
    return False, last_output


def execute_docker_command(
    container_name: str,
    exec_cmd: list[str],
    options: DockerRunOptions | None = None,
) -> tuple[bool, str]:
    """Execute a command in a Docker container, with optional retries.

    Args:
        container_name: Name of the Docker container
        exec_cmd: Command to execute as a list of arguments
        options: Retry, environment, and verbosity options

    Returns:
        Tuple of (success, output/error message)
    """
    opts = options or DockerRunOptions()
    params = _ExecParams(container_name, exec_cmd, opts.envs)
    success, output = _run_with_retry(DockerClient(), params, opts)
    if not success and opts.verbose:
        print(output)
    return success, output
