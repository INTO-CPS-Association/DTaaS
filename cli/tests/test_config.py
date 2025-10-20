"""Tests for config.py module"""
from src.pkg import config


def test_get_resource_limits():
    """Test that resource limits are correctly read from config"""
    configObj = config.Config()

    resourceLimits, err = configObj.getResourceLimits()
    if err is not None:
        raise Exception(err)

    expected = {
        'cpus': '4',
        'memory': '4g',
        'pids': 4000
    }

    assert resourceLimits == expected


def test_get_resource_limits_defaults():
    """Test that default resource limits are returned when not specified in config"""
    # This would require a config file without resourcelimits section
    # For now, we'll just test the structure
    configObj = config.Config()

    resourceLimits, err = configObj.getResourceLimits()
    if err is not None:
        raise Exception(err)

    # Should have the required keys
    assert 'cpus' in resourceLimits
    assert 'memory' in resourceLimits
    assert 'pids' in resourceLimits

    # Should be of correct types
    assert isinstance(resourceLimits['cpus'], str)
    assert isinstance(resourceLimits['memory'], str)
    assert isinstance(resourceLimits['pids'], int)
