"""PostgreSQL certificate and permission management for ThingsBoard integration."""

# pylint: disable=W1203, R0903
import logging
import os
import time
import click
from typing import Tuple, Optional
from pathlib import Path
from dataclasses import dataclass
from rich.console import Console

from ...config import Config
from .tb_cert import (
    ServiceCertConfig,
    CertSetupParams,
    ServiceSetupContext,
    setup_service_certs,
    PRIV_KEY_FILENAME,
    FULLCHAIN_FILENAME,
)

# Set up logger
logger = logging.getLogger(__name__)
POSTGRES_READY = "[green]✅ PostgreSQL is ready[/green]"


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
    cfg = ServiceCertConfig("PostgreSQL", "postgres.key", "postgres.crt")
    params = CertSetupParams(certs_dir, uid, gid)
    setup_ctx = ServiceSetupContext(cfg, params)
    return setup_service_certs(setup_ctx)


def permissions_postgres() -> Tuple[bool, str]:
    """Set up certificates and permissions for PostgreSQL.

    Returns:
        Tuple of (success, message)
    """
    try:
        config = Config()
        base_dir = Config.get_base_dir()
        host_name = config.get_value("HOSTNAME")
        certs_dir = base_dir / "certs" / host_name
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


def _check_pg_isready_string_result(result: str) -> bool:
    """Check if pg_isready string result indicates ready state."""
    return isinstance(result, str) and "accepting" in result.lower()


def _check_pg_isready_tuple_result(result) -> bool:
    """Check if pg_isready tuple result indicates ready state."""
    return isinstance(result, (list, tuple)) and len(result) > 1 and int(result[1]) == 0


def _check_postgres_via_pg_isready(console: Console, docker) -> bool:
    """Check if PostgreSQL is ready using pg_isready command."""
    try:
        pg_user = os.environ.get("POSTGRES_USER", "postgres")
        result = docker.execute("postgres", ["pg_isready", "-U", pg_user])

        if _check_pg_isready_string_result(result) or _check_pg_isready_tuple_result(
            result
        ):
            console.print(POSTGRES_READY)
            return True
    except Exception:
        # Ignore errors from pg_isready command
        pass

    return False


def _print_status_change(
    console: Console, current_status: str, last_status: str
) -> None:
    """Print status message if status has changed."""
    if current_status == last_status:
        return

    if current_status == "running":
        console.print(
            "[green]PostgreSQL container is running, checking health...[/green]"
        )
    elif current_status == "restarting":
        console.print(
            "[yellow]⚠️  PostgreSQL is restarting. "
            "Check logs with: docker logs postgres[/yellow]"
        )


def _get_postgres_container(containers):
    """Extract PostgreSQL container from compose containers list."""
    return next((c for c in containers if c.name == "postgres"), None)


def _check_postgres_health_status(postgres) -> bool:
    """Check if PostgreSQL container has healthy status."""
    if hasattr(postgres.state, "health") and postgres.state.health:
        return postgres.state.health == "healthy"
    return False


def _check_postgres_healthy(console: Console, docker, postgres) -> bool:
    """Check if PostgreSQL is healthy via health status or pg_isready."""
    if _check_postgres_health_status(postgres):
        console.print("[green]✅ PostgreSQL is ready[/green]")
        return True

    # Fallback: Try pg_isready command
    return _check_postgres_via_pg_isready(console, docker)


def _handle_postgres_timeout_error(console: Console, timeout: int) -> None:
    """Handle PostgreSQL timeout error."""
    raise click.ClickException(
        f"PostgreSQL did not become ready within {timeout} seconds. "
        "This usually indicates a configuration problem. "
    )


def _check_postgres_state(ctx: PostgresCheckContext) -> tuple[str | None, bool]:
    """Check PostgreSQL container state and return (current_status, is_ready)."""
    current_status = ctx.postgres.state.status
    _print_status_change(ctx.console, current_status, ctx.last_status)

    if current_status != "running":
        return current_status, False

    if _check_postgres_healthy(ctx.console, ctx.docker, ctx.postgres):
        return current_status, True

    return current_status, False


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
        current_status, is_ready = _check_postgres_state(ctx)

        return is_ready, current_status

    except Exception as e:
        console.print(f"[yellow]Warning: {str(e)}[/yellow]")
        return False, last_status


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
    last_status = None

    while time.time() - start_time < timeout:
        is_ready, new_status = _wait_iteration(console, docker, last_status)

        if is_ready:
            return

        wait_time = _get_wait_time_for_status(new_status) if new_status else 2
        last_status = new_status
        time.sleep(wait_time)

    _handle_postgres_timeout_error(console, timeout)
