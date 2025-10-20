"""Integration tests for users.py module with resource limits"""
from src.pkg import users


def test_get_compose_config_with_resource_limits():
    """Test that compose config is correctly generated with resource limits"""
    username = "testuser"
    server = "localhost"
    path = "/test/path"
    resourceLimits = {
        'cpus': '4',
        'memory': '4g',
        'pids': 4000
    }

    config, err = users.getComposeConfig(username, server, path, resourceLimits)
    if err is not None:
        raise Exception(err)

    # Verify resource limits are present in the config
    assert 'deploy' in config
    assert 'resources' in config['deploy']
    assert 'limits' in config['deploy']['resources']

    limits = config['deploy']['resources']['limits']
    assert limits['cpus'] == '4'
    assert limits['memory'] == '4g'
    assert limits['pids'] == '4000'  # String because replaceAll converts to strings

    # Verify other fields are still present
    assert config['image'] == 'mltooling/ml-workspace-minimal:0.13.2'
    assert username in str(config['environment'])
    assert path in str(config['volumes'])


def test_get_compose_config_with_custom_resource_limits():
    """Test compose config with custom resource limits"""
    username = "poweruser"
    server = "example.com"
    path = "/custom/path"
    resourceLimits = {
        'cpus': '8',
        'memory': '16g',
        'pids': 8000
    }

    config, err = users.getComposeConfig(username, server, path, resourceLimits)
    if err is not None:
        raise Exception(err)

    limits = config['deploy']['resources']['limits']
    assert limits['cpus'] == '8'
    assert limits['memory'] == '16g'
    assert limits['pids'] == '8000'  # String because replaceAll converts to strings
