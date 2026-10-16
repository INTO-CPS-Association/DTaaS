"""Shared test fixtures and constants."""
# pylint: disable=redefined-outer-name

from contextlib import contextmanager
from unittest.mock import patch, MagicMock
import pytest

CONF_SERVER_CONTENT = (
    "rule.libms.action=auth\n"
    "rule.libms.rule=PathPrefix(`/lib`)\n"
    "\n"
    "rule.onlyu1.action=auth\n"
    "rule.onlyu1.rule=PathPrefix(`/user1`)\n"
    "rule.onlyu1.whitelist=user1@example.com\n"
    "\n"
    "rule.onlyu2.action=auth\n"
    "rule.onlyu2.rule=PathPrefix(`/user2`)\n"
    "rule.onlyu2.whitelist=user2@example.com\n"
)


@pytest.fixture
def base(tmp_path):
    """A valid config whose path/certs-src point at an existing directory."""
    existing = str(tmp_path)
    return {
        "git-repo": "https://github.com/into-cps-association/DTaaS.git",
        "common": {
            "server-dns": "localhost",
            "path": existing,
            "security": {"certs-src": existing},
            "resources": {
                "cpus": 4,
                "pids_limit": 4960,
                "mem_limit": "4G",
                "shm_size": "512m",
            },
        },
        "users": [
            {
                "username": "u1",
                "email": "u1@intocps.org",
                "groups": ["default"],
                "load_balance": True,
            },
            {"username": "u2", "email": "u2@intocps.org"},
        ],
    }


@pytest.fixture
def yaml_io():
    """Patch the YAML helpers of whichever users module a test drives.

    Shared by the 'user add' and 'user delete' test modules: each drives its
    own module, so only the patch target differs.
    """

    @contextmanager
    def _patched(module):
        with patch(f"{module}.utils.import_yaml") as mi, patch(
            f"{module}.utils.export_yaml"
        ) as me:
            mi.return_value = ({"version": "3", "services": {}}, None)
            me.return_value = None
            yield {"import": mi, "export": me}

    return _patched


@pytest.fixture
def mock_registry():
    """Patch the registry store function add_users reads.

    Shared by test_users.py and the users_gitlab tests, which both drive
    add_users and so both need its registry read stubbed.
    """
    with patch("src.pkg.users.load_registry") as mock_load:
        mock_load.return_value = {"user1": {"email": "user1@x.io"}}
        yield {"load": mock_load}


@pytest.fixture
def mock_config():
    """Mock config object providing deployment settings from dtaas.toml.

    Shared by every test module that drives users.add_users; the GitLab test
    package overrides it to add the [gitlab] getters it also needs.
    """
    mock = MagicMock()
    mock.get_server_dns.return_value = ("foo.example.com", None)
    mock.get_path.return_value = ("/test/path", None)
    mock.get_resource_limits.return_value = (
        {"cpus": 4, "mem_limit": "4G", "pids_limit": 4960, "shm_size": "512m"},
        None,
    )
    mock.get_tls.return_value = (False, None)
    mock.get_set_limits.return_value = (True, None)
    mock.get_gitlab_provision.return_value = (False, None)
    mock.get_user_emails.return_value = ({}, None)
    return mock


@pytest.fixture
def mock_user_operations():
    """Mock the users_compose functions imported into users.py."""
    with patch("src.pkg.users.create_user_files") as mc, patch(
        "src.pkg.users.add_users_to_compose"
    ) as ma, patch("src.pkg.users.finalize_compose") as mf:
        mc.return_value = ma.return_value = mf.return_value = None
        yield {"create": mc, "add": ma, "finalize": mf}
