"""DTaaS platform services setup module"""
import os
from typing import Tuple, Optional
from pathlib import Path
from python_on_whales import DockerClient
from .config import Config


class Service:
    """
    Docker Compose service management utility for DTaaS platform services.

    This class handles starting, stopping, restarting, and checking the status
    of platform services using Docker Compose.
    """

    def __init__(self) -> None:
        """
        Initialize service setup.
        """
        base_dir = Config.get_base_dir()
        compose_file = base_dir / "compose.services.secure.yml"
        
        # If compose file not in base_dir, look in package location
        if not compose_file.exists():
            package_dir = Path(__file__).parent.parent
            compose_file = package_dir / "compose.services.secure.yml"
        
        self.compose_file = compose_file
        
        # Load environment variables from config and set them in os.environ
        config = Config()
        for key, value in config.env.items():
            if value is not None:
                os.environ[key] = str(value)
        
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


    def remove_services(
        self, service_list: Optional[list] = None, 
        remove_volumes: bool = False
    ) -> Tuple[Optional[Exception], str]:
        """
        Remove platform services and optionally their volumes.
        
        When volumes are removed, empty data directories are recreated to ensure
        successful reinstallation of services.
        
        Args:
            service_list: Optional list of specific services to remove
            remove_volumes: Whether to remove volumes as well
            
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
                # Remove specific services
                self.docker.compose.rm(service_list, stop=True, volumes=remove_volumes)
            else:
                # Remove all services using down
                self.docker.compose.down(volumes=remove_volumes)
            
            # If volumes were removed, recreate empty data directories
            if remove_volumes:
                base_dir = Config.get_base_dir()
                data_dir = base_dir / "data"
                data_subdirs = ['grafana', 'influxdb', 'mongodb', 'postgres', 'rabbitmq', 'thingsboard']
                for subdir in data_subdirs:
                    subdir_path = data_dir / subdir
                    subdir_path.mkdir(parents=True, exist_ok=True)
            
            return None, "Services removed successfully"
        except Exception as e:
            return e, f"Failed to remove services: {str(e)}"
