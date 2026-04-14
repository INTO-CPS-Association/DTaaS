"""PostgreSQL user management."""

from ...config import Config
from ...utils import (
    process_credentials_file,
    create_users_from_credentials,
)
from ...docker_utils import execute_docker_command, DockerRunOptions
from ...sanitize import escape_sql_identifier, escape_sql_literal

CONTAINER = "postgres"
ALREADY_EXISTS = "already exists"


def _get_admin_credentials() -> tuple[str, str]:
    """Get PostgreSQL admin credentials from config.

    Returns:
        Tuple of (admin_user, admin_password)
    """
    config = Config()
    return config.get_value("POSTGRES_USER"), config.get_value("POSTGRES_PASSWORD")


def _run_psql(admin_user: str, admin_pass: str, sql: str) -> tuple[bool, str]:
    """Execute a SQL statement via psql in the postgres container.

    Args:
        admin_user: PostgreSQL admin username
        admin_pass: PostgreSQL admin password
        sql: SQL statement to execute

    Returns:
        Tuple of (success, output or error message)
    """
    cmd = ["psql", "-U", admin_user, "-d", "postgres", "-c", sql]
    return execute_docker_command(
        CONTAINER,
        cmd,
        DockerRunOptions(envs={"PGPASSWORD": admin_pass}, max_attempts=3),
    )


def _create_user_sql(username: str, password: str) -> str:
    """Build SQL to create a PostgreSQL user with a password.

    Args:
        username: PostgreSQL username
        password: PostgreSQL user password

    Returns:
        SQL statement string
    """
    safe_user = escape_sql_identifier(username)
    safe_pass = escape_sql_literal(password)
    return f"CREATE USER \"{safe_user}\" WITH PASSWORD '{safe_pass}';"


def _create_database_sql(username: str) -> str:
    """Build SQL to create a database owned by the given user.

    Args:
        username: Database name (same as username)

    Returns:
        SQL statement string
    """
    safe_user = escape_sql_identifier(username)
    return f'CREATE DATABASE "{safe_user}" OWNER "{safe_user}";'


def _handle_psql_result(success: bool, output: str, error_msg: str) -> tuple[bool, str]:
    """Evaluate psql result, treating 'already exists' as success.

    Args:
        success: Whether the psql command succeeded
        output: Command output or error text
        error_msg: Prefix for the error message on failure

    Returns:
        Tuple of (success, error message if any)
    """
    if success or ALREADY_EXISTS in output:
        return True, ""
    return False, f"{error_msg}: {output}"


def _add_postgres_user(username: str, password: str) -> tuple[bool, str]:
    """Add a PostgreSQL user with their own database.

    Args:
        username: PostgreSQL username (also used as database name)
        password: PostgreSQL user password

    Returns:
        Tuple of (success, error message if any)
    """
    admin_user, admin_pass = _get_admin_credentials()

    success, output = _run_psql(
        admin_user, admin_pass, _create_user_sql(username, password)
    )
    ok, err = _handle_psql_result(success, output, f"Failed to create user {username}")
    if not ok:
        return False, err

    success, output = _run_psql(admin_user, admin_pass, _create_database_sql(username))
    return _handle_psql_result(success, output, f"Failed to create database {username}")


def setup_postgres_users() -> tuple[bool, str]:
    """Add users to PostgreSQL from credentials file.

    Returns:
        Tuple of (success, message)
    """
    return process_credentials_file(
        lambda creds_file: create_users_from_credentials(
            creds_file, _add_postgres_user
        ),
        "PostgreSQL",
        "PostgreSQL users created successfully",
    )
