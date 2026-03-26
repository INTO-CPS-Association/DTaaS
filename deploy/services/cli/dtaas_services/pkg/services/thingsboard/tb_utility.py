"""Utility functions for ThingsBoard installation and error handling."""

# pylint: disable=W1203, R0903
import logging
import os
import click
import concurrent.futures
import json
import time
import httpx
from typing import Tuple
from rich.console import Console

# Set up logger
logger = logging.getLogger(__name__)


def get_ssl_verify() -> bool:
    """Get SSL_VERIFY from environment (after Config loads services.env).
    Deferred to runtime so this module can be imported even when
    config/services.env doesn't exist (e.g., during generate-project).
    """
    raw = os.getenv("SSL_VERIFY", "true").strip().lower()
    return raw not in ("false", "0", "no", "off")


def is_ssl_error(error_str: str) -> bool:
    """Check if error is SSL-related."""
    return (
        "certificate verify failed" in error_str.lower() or "ssl" in error_str.lower()
    )


def is_json_parse_error(exception: Exception) -> bool:
    """Check if exception is JSON parsing related."""
    return "json" in str(exception).lower()


def _run_install(docker) -> None:
    """Run ThingsBoard database installation. Kept as a top-level helper so it can be
    submitted to a ThreadPoolExecutor with docker passed as an argument."""
    docker.compose.run(
        "thingsboard-ce",
        remove=True,
        envs={"INSTALL_TB": "true", "LOAD_DEMO": "false"},
        service_ports=False,
        use_aliases=True,
        user="root",
    )


def run_thingsboard_install(console: Console, docker) -> None:
    """Run ThingsBoard database installation.

    Args:
        console: Rich console for output
        docker: Docker client

    Raises:
        click.ClickException: If installation fails or times out
    """
    console.print(
        "[cyan]Running ThingsBoard installation "
        "(this may take a few minutes)...[/cyan]"
    )
    with console.status(
        "[bold cyan]Installing ThingsBoard schema...[/bold cyan]",
        spinner="dots",
    ):
        timeout = int(os.getenv("THINGSBOARD_INSTALL_TIMEOUT", "300"))

        try:
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(_run_install, docker)
                future.result(timeout=timeout)
        except concurrent.futures.TimeoutError:
            console.print(
                f"[red]ThingsBoard installation timed out after {timeout} seconds.[/red]"
            )
            console.print(
                "[yellow]Attempting to stop ThingsBoard container "
                "to avoid inconsistent state...[/yellow]"
            )
            try:
                docker.compose.kill("thingsboard-ce")
            except Exception:
                # Best-effort cleanup; ignore errors here
                pass
            raise click.ClickException(
                f"ThingsBoard installation timed out after {timeout} seconds. "
                "Check logs with: docker logs thingsboard-ce and try again."
            )
        except Exception as e:
            raise click.ClickException(
                f"ThingsBoard installation failed: {str(e)}"
            ) from e


def handle_login_response(resp: httpx.Response) -> str | None:
    """Handle login response and extract token."""
    if resp.status_code == 200:
        try:
            data = resp.json()
            return data.get("token")
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON response during login: {e}")
            return None
    if resp.status_code != 401:
        logger.warning(f"Unexpected login response {resp.status_code}")
    return None


def _log_login_error(error: httpx.HTTPError) -> None:
    """Log login error with appropriate context."""
    error_str = str(error)
    if is_ssl_error(error_str):
        logger.error(
            f"SSL certificate verification failed: {error}\n"
            " Using self-signed certificates? Change SSL_VERIFY in services.env to False\n"
        )
    else:
        logger.error(f"Network error during login: {error}")


def _make_login_request(base_url: str, email: str, password: str) -> httpx.Response:
    """Make login API request to ThingsBoard.

    Args:
        base_url: ThingsBoard base URL
        email: User email
        password: User password

    Returns:
        HTTP response from login endpoint
    """
    url = f"{base_url}/api/auth/login"
    return httpx.post(
        url,
        json={"username": email, "password": password},
        timeout=10,
        verify=get_ssl_verify(),
    )


def _process_login_response(resp: httpx.Response) -> str | None:
    """Process login response and extract token or determine retry behavior.

    Args:
        resp: HTTP response from login endpoint

    Returns:
        JWT token if login successful
        None if credentials are invalid (401)

    Raises:
        ValueError if response indicates a retryable error
    """
    token = handle_login_response(resp)
    if token:
        return token

    # If 401, credentials are wrong, don't retry
    if resp.status_code == 401:
        return None

    # For other errors, raise to signal retry
    raise ValueError(f"Login failed with status {resp.status_code}")


def _handle_login_retry_error(
    e: httpx.HTTPError, attempt: int, max_retries: int
) -> None:
    """Handle login retry on HTTPError."""
    if attempt < max_retries - 1:
        wait_time = 2**attempt
        print(f"Connection error, retrying in {wait_time}s...")
        time.sleep(wait_time)
    else:
        _log_login_error(e)


def _handle_login_retry_failure(attempt: int, max_retries: int) -> None:
    """Handle login retry on ValueError (non-401 error)."""
    if attempt < max_retries - 1:
        wait_time = 2**attempt
        print(f"Login attempt {attempt + 1} failed, retrying in {wait_time}s...")
        time.sleep(wait_time)


def _dispatch_login_exception(e: Exception, attempt: int, max_retries: int) -> None:
    """Dispatch login exception to appropriate handler based on type."""
    if isinstance(e, httpx.HTTPError):
        _handle_login_retry_error(e, attempt, max_retries)
    else:  # ValueError
        _handle_login_retry_failure(attempt, max_retries)


def _attempt_login(base_url: str, email: str, password: str) -> str | None:
    """Make a single login attempt.

    Args:
        base_url: ThingsBoard base URL
        email: User email
        password: User password

    Returns:
        JWT token if successful, None if credentials invalid (401)

    Raises:
        httpx.HTTPError: On network errors
        ValueError: On other HTTP errors (retryable)
    """
    resp = _make_login_request(base_url, email, password)
    return _process_login_response(resp)


def login(base_url: str, email: str, password: str) -> str | None:
    """Authenticate with ThingsBoard and return a JWT token.

    Args:
        base_url: ThingsBoard base URL
        email: User email
        password: User password

    Returns:
        JWT token if successful, None otherwise
    """
    max_retries = 3
    for attempt in range(max_retries):
        try:
            return _attempt_login(base_url, email, password)
        except (httpx.HTTPError, ValueError) as e:
            _dispatch_login_exception(e, attempt, max_retries)

    return None


def verify_admin_login(
    base_url: str, admin_email: str, admin_password: str
) -> Tuple[bool, str]:
    """Verify admin can login."""
    token = login(base_url, admin_email, admin_password)
    if not token:
        return False, "Created admin but login verification failed"
    return True, ""
