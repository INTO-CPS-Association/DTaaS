"""Values shared by the tests of gitlab_common/users.py."""

import requests

TEST_TOKEN = "fake-admin-token"  # noqa: S105 # NOSONAR
TEST_USERNAME = "testuser"
TEST_EMAIL = "test@example.com"
TEST_PASSWORD = "UserP@ss123"  # noqa: S105 # NOSONAR
DROPPED = requests.ConnectionError("connection reset")
