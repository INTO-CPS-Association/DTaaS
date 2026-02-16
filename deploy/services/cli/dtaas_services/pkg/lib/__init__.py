"""Library management service, unified interface for all operations."""

from .manager import Manager
from .cleanup import Cleanup


class Service(Manager, Cleanup):
    """Unified service management class combining all functionality.

    Inherits from Manager (which includes Status and DockerExecutor) and Cleanup.
    This provides complete service management capabilities.
    """


__all__ = ["Service"]
