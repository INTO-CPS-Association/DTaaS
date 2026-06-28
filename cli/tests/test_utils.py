"""Tests for utils module."""

from src.pkg import utils


def test_import_yaml_empty_file():
    """Test importing an empty YAML file"""
    message, _ = utils.import_yaml("tests/data/empty.yml")
    assert message == {}


def test_import_yaml_compose():
    """Test importing YAML compose configuration"""
    expected = get_test_compose_object()

    compose, err = utils.import_yaml("tests/data/compose.users.test.yml")
    if err is not None:
        raise AssertionError(err)
    assert expected == compose


def test_import_toml():
    """Test importing TOML configuration file"""
    toml, err = utils.import_toml("tests/dtaas.test.toml")
    if err is not None:
        raise AssertionError(err)

    expected = {
        "name": "Digital Twin as a Service (DTaaS)",
        "version": "0.9.0",
        "owner": "The INTO-CPS-Association",
        "git-repo": "https://github.com/into-cps-association/DTaaS.git",
        "common": {
            "server-dns": "localhost",
            "path": "/home/Desktop/DTaaS",
            "security": {
                "tls": False,
                "certs-src": "/etc/letsencrypt/archive/intocps.org",
            },
            "resources": {
                "cpus": 4,
                "mem_limit": "4G",
                "pids_limit": 4960,
                "shm_size": "512m",
            },
        },
        "users": {
            "add": ["username1", "username2", "username3"],
            "delete": ["username2", "username3"],
            "username1": {"email": "username1@intocps.org"},
            "username2": {"email": "username2@intocps.org"},
            "username3": {"email": "username3@intocps.org"},
        },
        "frontend": {
            "react-app-client-id": "your_client_id_here",
            "react-app-oauth-url": "https://gitlab.com",
        },
        "localhost": {
            "default-user": "user1",
            "client-id": "your_client_id_here",
            "auth-authority": "https://gitlab.com/",
        },
        "insecure-server": {
            "oauth-url": "https://gitlab.com",
            "oauth-client-id": "your_client_id_here",
            "oauth-client-secret": "your_client_secret_here",
            "oauth-secret": "your_random_secret_key_here",
        },
        "secure-server": {
            "oauth-url": "https://gitlab.com",
            "oauth-client-id": "your_client_id_here",
            "oauth-client-secret": "your_client_secret_here",
            "oauth-secret": "your_random_secret_key_here",
        },
        "secure-server-gitlab": {
            "oauth-client-id": "your_client_id_here",
            "oauth-client-secret": "your_client_secret_here",
            "oauth-secret": "your_random_secret_key_here",
        },
        "workspace-localhost": {
            "default-user": "user",
            "client-id": "mock",
            "auth-authority": "http://localhost:5556/dex",
        },
        "workspace-secure-server": {
            "oauth-secret": "your_random_secret_key_here",
            "keycloak-admin": "admin",
            "keycloak-admin-password": "changeme",  # NOSONAR
            "keycloak-realm": "dtaas",
            "keycloak-issuer-url": "https://your_server_dns/auth/realms/dtaas",
            "keycloak-client-id": "dtaas-workspace",
            "keycloak-client-secret": "your_keycloak_client_secret_here",
            "client-id": "dtaas-client",
            "auth-authority": "https://your_server_dns/auth/realms/dtaas",
        },
    }

    assert expected == toml


def test_replace_all():
    """Test replacing all values in a nested structure"""
    template_random_vals = [
        "stringval1",
        "stringval2",
        "stringval3",
        "listval1",
        "listval2",
        "listval3",
    ]
    template = get_replace_all_object(template_random_vals)

    expected_random_vals = ["one", "two", "three", "foo", "bar", "qux"]
    expected = get_replace_all_object(expected_random_vals)

    mapping = {}
    for i, template_val in enumerate(template_random_vals):
        mapping[template_val] = expected_random_vals[i]

    ans, err = utils.replace_all(template, mapping)
    if err is not None:
        raise AssertionError(err)

    assert ans == expected


def test_export_yaml(tmp_path):
    """Test exporting data to YAML file"""
    data = get_test_compose_object()

    # Use a temporary file for export testing to avoid modifying committed files
    temp_file = tmp_path / "compose.users.exp.yml"
    err = utils.export_yaml(data, str(temp_file))
    if err is not None:
        raise AssertionError(err)

    expected, err1 = utils.import_yaml("tests/data/compose.users.test.yml")
    actual, err2 = utils.import_yaml(str(temp_file))

    if err1:
        raise AssertionError(err1)
    if err2:
        raise AssertionError(err2)

    assert expected == actual


def get_replace_all_object(random_vals):
    """Create a nested structure for testing replace_all functionality"""
    obj = {
        "key1": random_vals[0],
        "key2": [random_vals[3], random_vals[4], random_vals[5]],
        "dictkey1": {
            "dict1key1": random_vals[1],
            "dict2key2": [random_vals[3], random_vals[5]],
            "dict3key3": {
                "key3": random_vals[0],
                "key4": {"listkey": [random_vals[4]]},
            },
        },
        "dictkey2": {
            "dict2key1": {
                "key5": random_vals[2],
                "key6": random_vals[3],
                "key7": [random_vals[4], random_vals[5]],
            },
            "dict2key2": random_vals[1],
            "dict2key3": random_vals[4],
        },
    }
    return obj


def test_import_yaml_file_not_found():
    """Test importing a non-existent YAML file"""
    config, err = utils.import_yaml("tests/data/nonexistent.yml")
    assert config == {}
    assert err is None


def test_import_toml_error():
    """Test importing invalid TOML file"""
    config, err = utils.import_toml("tests/data/nonexistent.toml")
    assert config is None
    assert err is not None
    assert isinstance(err, Exception)


def test_export_yaml_error():
    """Test error handling when exporting to invalid path"""
    data = {"test": "data"}
    invalid_path = "/invalid/nonexistent/path/file.yml"
    err = utils.export_yaml(data, invalid_path)
    assert err is not None
    assert isinstance(err, Exception)


def test_replace_all_invalid_object_type():
    """Test replace_all with invalid object type"""
    invalid_obj = 123  # Not str, list, or dict
    mapping = {"key": "value"}
    ans, err = utils.replace_all(invalid_obj, mapping)
    assert ans is None
    assert err is not None
    assert "Object format not valid" in str(err)


def test_replace_all_list_with_error():
    """Test replace_all with list containing invalid object type"""
    template = [123]  # List with invalid object
    mapping = {"key": "value"}
    ans, err = utils.replace_all(template, mapping)
    assert ans is None
    assert err is not None


def test_replace_dict_non_string_key():
    """Test replace_dict with non-string key"""
    dictionary = {123: "value"}  # Non-string key
    mapping = {"key": "value"}
    result, err = utils.replace_dict(dictionary, mapping)
    assert result is None
    assert err is not None
    assert "Key is not a string" in str(err)


def test_replace_dict_with_nested_error():
    """Test replace_dict with nested invalid object"""
    dictionary = {"key": 123}  # Value is invalid object type
    mapping = {"key": "value"}
    result, err = utils.replace_dict(dictionary, mapping)
    assert result is None
    assert err is not None


def test_check_error_with_exception():
    """Test check_error raises exception"""
    err = Exception("Test error")
    try:
        utils.check_error(err)
        assert False, "Expected exception to be raised"
    except Exception as e:  # pylint: disable=broad-except
        assert str(e) == "Test error"


def test_check_error_with_none():
    """Test check_error with None does not raise"""
    utils.check_error(None)  # Should not raise


def get_test_compose_object():
    """Create a test compose object for testing"""
    test_compose = {
        "version": "3",
        "services": {
            "testuser": {
                "image": "intocps/workspace:latest",
                "volumes": [
                    "/home/testuser/DTaaS/files/common:/workspace/common",
                    "/home/testuser/DTaaS/files/testuser:/workspace",
                ],
                "environment": [
                    "AUTHENTICATE_VIA_JUPYTER=",
                    "WORKSPACE_BASE_URL=testuser",
                ],
                "shm_size": "512m",
                "labels": [
                    "traefik.enable=true",
                    "traefik.http.routers.testuser.entryPoints=web",
                    "traefik.http.routers.testuser.rule=PathPrefix(`/testuser`)",
                    "traefik.http.routers.testuser.middlewares=traefik-forward-auth",
                ],
                "networks": ["users"],
            }
        },
        "networks": {
            "users": {
                "name": "dtaas-users",
                "external": True,
            }
        },
    }

    return test_compose
