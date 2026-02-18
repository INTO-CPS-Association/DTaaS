"""Status and health checking for PostgreSQL module."""

# pylint: disable=W1203, R0903
import logging
import os
from rich.console import Console


# Set up logger
logger = logging.getLogger(__name__)
POSTGRES_READY = "[green]✅ PostgreSQL is ready[/green]"


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


def check_postgres_state(ctx) -> tuple[str | None, bool]:
    """Check PostgreSQL container state and return (current_status, is_ready)."""
    current_status = ctx.postgres.state.status
    _print_status_change(ctx.console, current_status, ctx.last_status)

    if current_status != "running":
        return current_status, False

    if _check_postgres_healthy(ctx.console, ctx.docker, ctx.postgres):
        return current_status, True

    return current_status, False
