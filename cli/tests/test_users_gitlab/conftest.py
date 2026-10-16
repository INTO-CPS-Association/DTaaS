"""Fixtures shared by the tests of users_gitlab.py, which drive it through
users.add_users (the public entry point) and so mirror test_users.py's."""

from unittest.mock import patch
import pytest
# pylint: disable=redefined-outer-name,unused-argument


@pytest.fixture
def mock_utils(yaml_io):
    """Mock the utils functions add_users calls directly."""
    with yaml_io("src.pkg.users") as mocks:
        yield mocks


@pytest.fixture(autouse=True)
def usable_token_file(tmp_path, monkeypatch):
    """Run in a scratch directory, with the token file preflight passing, so a
    test about the account step sees only that step's writes."""
    monkeypatch.chdir(tmp_path)
    with patch("src.pkg.users_gitlab.check_token_file", return_value=None) as check:
        yield check
