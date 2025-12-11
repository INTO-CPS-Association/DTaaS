"""DTaaS platform services setup module"""
from pathlib import Path
from typing import Tuple, Optional
from python_on_whales import DockerClient
from .config import Config


class Service:
    """
    Docker Compose service management utility for DTaaS platform services.

    This class handles starting, stopping, restarting, and checking the status
    of platform services using Docker Compose.
    """

    def __init__(self, config: Optional[Config] = None) -> None:
        """
        Initialize service setup.
        
        Args:
            config: Configuration object. If None, creates default Config.
        """
        config = config or Config()
        base_dir = Config.get_base_dir()
        self.compose_file = base_dir / "compose.services.secure.yml"
        self.docker = DockerClient(compose_files=[self.compose_file])


    def start_services(
        self, service_list: Optional[list] = None
    ) -> Tuple[Optional[Exception], str]:
        """
        Start the platform services using docker compose.
        
        Args:
            service_list: Optional list of specific services to start
            
        Returns:
            Tuple of (Exception or None, message)
        """
        if not self.compose_file.exists():
            err = FileNotFoundError(
                f"Docker Compose file not found: {self.compose_file}"
            )
            return err, str(err)
        try:
            if service_list:
                self.docker.compose.up(service_list, detach=True)
            else:
                self.docker.compose.up(detach=True)
            return None, "Docker Compose started successfully"
        except Exception as e:
            return e, f"Failed to start Docker Compose: {str(e)}"

    def stop_services(
        self, service_list: Optional[list] = None
    ) -> Tuple[Optional[Exception], str]:
        """
        Stop platform services using Docker Compose.
        
        Args:
            service_list: Optional list of specific services to stop
            
        Returns:
            Tuple of (Exception or None, message)
        """
        if not self.compose_file.exists():
            err = FileNotFoundError(
                f"Docker Compose file not found: {self.compose_file}"
            )
            return err, str(err)
        try:
            if service_list:
                self.docker.compose.stop(service_list)
            else:
                self.docker.compose.down()
            return None, "Services stopped successfully"
        except Exception as e:
            return e, f"Failed to stop services: {str(e)}"


    def restart_services(
        self, service_list: Optional[list] = None
    ) -> Tuple[Optional[Exception], str]:
        """
        Restart platform services using Docker Compose.
        
        Args:
            service_list: Optional list of specific services to restart
            
        Returns:
            Tuple of (Exception or None, message)
        """
        if not self.compose_file.exists():
            err = FileNotFoundError(
                f"Docker Compose file not found: {self.compose_file}"
            )
            return err, str(err)
        try:
            if service_list:
                self.docker.compose.restart(service_list)
            else:
                self.docker.compose.restart()
            return None, "Services restarted successfully"
        except Exception as e:
            return e, f"Failed to restart services: {str(e)}"


    def get_status(
        self, service_list: Optional[list] = None
    ) -> Tuple[Optional[Exception], str]:
        """
        Get status of platform services.
        
        Args:
            service_list: Optional list of specific services to check
            
        Returns:
            Tuple of (Exception or None, status message)
        """
        if not self.compose_file.exists():
            err = FileNotFoundError(
                f"Docker Compose file not found: {self.compose_file}"
            )
            return err, str(err)
        try:
            if service_list:
                result = self.docker.compose.ps(service_list)
            else:
                result = self.docker.compose.ps()
            return None, str(result)
        except Exception as e:
            return e, f"Failed to get status: {str(e)}"
