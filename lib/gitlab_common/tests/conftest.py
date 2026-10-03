"""Fixtures shared by the GitLab project tests."""

import pytest
from gitlab_common import project_import


@pytest.fixture(autouse=True)
def _no_poll_delay(monkeypatch):
    """Keep the import poll loop instant; the wait itself is not under test.

    The interval is left alone so the poll budget still divides by it; only
    the sleeping is skipped.
    """
    monkeypatch.setattr(project_import.time, "sleep", lambda _seconds: None)
