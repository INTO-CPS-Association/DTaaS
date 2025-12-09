"""Utility functions for DTaaS services CLI"""
from pathlib import Path
from python_on_whales import DockerClient
from .config import Config


def get_credentials_path() -> Path:
    """
    Get the path to credentials.csv file.
    
    Returns:
        Path to credentials.csv file
    """
    base_dir = Config.get_base_dir()
    return base_dir / "config" / "credentials.csv"


def execute_docker_command(
    container_name: str,
    exec_cmd: list[str],
    verbose: bool = True
) -> tuple[bool, str]:
    """
    Execute a command in a Docker container.
    
    Args:
        container_name: Name of the Docker container
        exec_cmd: Command to execute as a list of arguments
        verbose: Whether to print output
        
    Returns:
        Tuple of (success, output/error message)
    """
    try:
        docker = DockerClient()
        result = docker.execute(container_name, exec_cmd)
        if verbose:
            print("Output:", result)
        return True, result
    except Exception as e:
        error_msg = f"Error: {str(e)}"
        if verbose:
            print(error_msg)
        return False, error_msg
