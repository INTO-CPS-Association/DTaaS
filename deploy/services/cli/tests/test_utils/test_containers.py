"""Tests for the container state helpers of utils.py."""

from unittest.mock import Mock
from dtaas_services.pkg.utils import (
    get_container_health_status,
    has_running_container,
    is_container_running,
)


def test_is_container_running_true():
    """Test running container detection."""
    container = Mock()
    container.state.status = "running"
    assert is_container_running(container) is True


def test_is_container_running_false_without_state():
    """Test stopped container detection when state is missing."""
    container = Mock(spec=[])
    assert is_container_running(container) is False


def test_has_running_container_true():
    """Test list detection when one container is running."""
    stopped = Mock()
    stopped.state.status = "exited"
    running = Mock()
    running.state.status = "running"
    assert has_running_container([stopped, running]) is True


def test_get_container_health_status_unknown_state():
    """Test health fallback when status is unavailable."""
    container = Mock()
    container.state.health = True
    assert get_container_health_status(container) == "unknown state"
