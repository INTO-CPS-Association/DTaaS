"""InfluxDB utility functions."""

import json
from typing import Any
from ...utils import execute_docker_command


def parse_json_response(json_str: str) -> tuple[bool, Any, str]:
    """Parse JSON response.
    Args:
        json_str: JSON string to parse
    Returns:
        Tuple of (success, parsed data, error message)
    """
    try:
        data = json.loads(json_str)
        return True, data, ""
    except json.JSONDecodeError as e:
        return False, None, f"Failed to parse JSON: {str(e)}"
    except (KeyError, TypeError) as e:
        return False, None, f"Unexpected data format: {str(e)}"


def execute_influxdb_command(command: list, error_context: str) -> tuple[bool, str]:
    """Execute an InfluxDB docker command and return result or error.

    Args:
        command: Command list to execute
        error_context: Error message context
    Returns:
        Tuple of (success, output or error message)
    """
    success, output = execute_docker_command("influxdb", command, False)
    if not success:
        return False, f"{error_context}: {output}"
    return True, output
