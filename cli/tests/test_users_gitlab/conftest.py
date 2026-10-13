"""Fixtures shared by the tests of users_gitlab.py, which drive it through
users.add_users (the public entry point) and so mirror test_users.py's."""

import pytest
# pylint: disable=redefined-outer-name,unused-argument


@pytest.fixture
def mock_utils(yaml_io):
    """Mock the utils functions add_users calls directly."""
    with yaml_io("src.pkg.users") as mocks:
        yield mocks
