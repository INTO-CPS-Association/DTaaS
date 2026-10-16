"""Test doubles shared by the tests."""


class FakeGitLab:
    """Records requests and answers them from a table of responses."""

    def __init__(self, responses=None, existing=None):
        self.responses = responses or {}
        self.existing = existing or {}
        self.requests = []

    def request(self, method, path, data=None):
        """Record the request and return the matching response."""
        self.requests.append((method, path, data))
        return self.responses.get((method, path.split("?")[0]))

    def find(self, path):
        """Return the object stored for path, or None."""
        return self.existing.get(path)
