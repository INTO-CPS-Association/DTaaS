"""Fixtures shared by the deploy_config tests."""

import pytest

_SERVER_TYPES = [
    ("insecure-server", "http"),
    ("secure-server", "https"),
    ("secure-server-gitlab", "https"),
]


@pytest.fixture(params=_SERVER_TYPES, ids=[name for name, _ in _SERVER_TYPES])
def server_type(request):
    """Each server deploy type that writes [frontend] into config/client.js,
    with the URL scheme its website uses."""
    return request.param
