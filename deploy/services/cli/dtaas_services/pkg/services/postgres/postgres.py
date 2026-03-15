"""PostgreSQL certificate and permission management."""

# pylint: disable=W1203, R0903
import logging
import time
import click
from typing import Tuple, Optional
from pathlib import Path
from dataclasses import dataclass
from rich.console import Console

from ...config import Config
from ..thingsboard.tb_cert import (
    setup_service_certificates,
    CertificateSetupConfig,
    PRIV_KEY_FILENAME,
    FULLCHAIN_FILENAME,
)
from .status import check_postgres_state

# Set up logger
logger = logging.getLogger(__name__)
POSTGRES_READY = "[green]✅ PostgreSQL is ready[/green]"


@dataclass
class PostgresWaitContext:
    """Context for PostgreSQL wait loop operations."""

    console: Console
    docker: object
    timeout: int
    start_time: float
    last_status: Optional[str] = None


@dataclass
class PostgresCheckContext:
    """Context for PostgreSQL state checking operations."""

    console: Console
    docker: object
    postgres: object
    last_status: Optional[str] = None


def setup_postgres_certs(certs_dir: Path, uid: int, gid: int) -> Tuple[bool, str]:
    """Set up PostgreSQL certificates with proper permissions.

    Args:
        certs_dir: Directory containing certificates
        uid: User ID for PostgreSQL
        gid: Group ID for PostgreSQL

    Returns:
        Tuple of (success, message)
    """
    config = CertificateSetupConfig(
        "PostgreSQL", "postgres.crt", "postgres.key", certs_dir, uid, gid
    )
    return setup_service_certificates(config)


def permissions_postgres() -> Tuple[bool, str]:
    """Set up certificates and permissions for PostgreSQL.

    Returns:
        Tuple of (success, message)
    """
    try:
        config = Config()
        base_dir = Config.get_base_dir()
        certs_dir = base_dir / "certs"
        postgres_uid = int(config.get_value("POSTGRES_UID"))
        postgres_gid = int(config.get_value("POSTGRES_GID"))

        # Verify certificates exist
        privkey_path = certs_dir / PRIV_KEY_FILENAME
        fullchain_path = certs_dir / FULLCHAIN_FILENAME

        if not privkey_path.exists() or not fullchain_path.exists():
            return False, f"Normalized certificates not found in {certs_dir}"

        return setup_postgres_certs(certs_dir, postgres_uid, postgres_gid)
    except Exception as e:
        logger.error(f"Error setting up PostgreSQL: {e}")
        return False, str(e)


def _get_postgres_container(containers):
    """Extract PostgreSQL container from compose containers list."""
    return next((c for c in containers if c.name == "postgres"), None)


def _handle_postgres_timeout_error(console: Console, timeout: int) -> None:
    """Handle PostgreSQL timeout error."""
    raise click.ClickException(
        f"PostgreSQL did not become ready within {timeout} seconds. "
        "\nThis usually indicates a configuration problem, if it keeps restarting. "
    )


def _try_get_postgres_container(docker) -> Optional[object]:
    """Attempt to get PostgreSQL container, returning None if unavailable."""
    try:
        containers = docker.compose.ps()
        return _get_postgres_container(containers)
    except Exception:
        return None


def _is_postgres_container_valid(postgres) -> bool:
    """Check if postgres container exists and has required state attribute."""
    return postgres is not None and hasattr(postgres, "state")


def _get_wait_time_for_status(status: str) -> int:
    """Get appropriate wait time based on container status."""
    return 3 if status == "restarting" else 2


def _wait_iteration(
    console: Console, docker, last_status: Optional[str]
) -> tuple[bool, Optional[str]]:
    """Execute one iteration of the postgres wait loop.

    Returns:
        Tuple of (is_ready, new_last_status)
    """
    try:
        postgres = _try_get_postgres_container(docker)

        if not _is_postgres_container_valid(postgres):
            return False, last_status

        ctx = PostgresCheckContext(console, docker, postgres, last_status)
        current_status, is_ready = check_postgres_state(ctx)

        return is_ready, current_status

    except Exception as e:
        console.print(f"[yellow]Warning: {str(e)}[/yellow]")
        return False, last_status


def _handle_wait_iteration(ctx: PostgresWaitContext) -> bool:
    """Handle a single wait iteration, updating context and returning ready status.

    Args:
        ctx: Wait loop context to update

    Returns:
        True if PostgreSQL is ready, False otherwise
    """
    is_ready, new_status = _wait_iteration(ctx.console, ctx.docker, ctx.last_status)
    if is_ready:
        return True

    wait_time = _get_wait_time_for_status(new_status) if new_status else 2
    ctx.last_status = new_status
    time.sleep(wait_time)
    return False


def _perform_wait_loop(
    ctx: PostgresWaitContext,
) -> Optional[str]:
    """Perform the main wait loop iteration.

    Args:
        ctx: Wait loop context with console, docker, timeout, start_time

    Returns:
        None if ready, "timeout" if timeout reached.
    """
    while time.time() - ctx.start_time < ctx.timeout:
        if _handle_wait_iteration(ctx):
            return None

    return "timeout"


def wait_for_postgres_ready(console: Console, docker, timeout: int = 15) -> None:
    """
    Wait for PostgreSQL to be ready to accept connections.

    Args:
        console: Rich console for output
        docker: Docker client
        timeout: Maximum time to wait in seconds

    Raises:
        click.ClickException: If PostgreSQL doesn't become ready within timeout
    """
    console.print("[cyan]Waiting for PostgreSQL to be ready...[/cyan]")
    start_time = time.time()
    ctx = PostgresWaitContext(console, docker, timeout, start_time)
    result = _perform_wait_loop(ctx)
    if result == "timeout":
        _handle_postgres_timeout_error(console, timeout)
