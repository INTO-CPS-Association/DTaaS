"""Shared fixtures for the history tests"""

# pylint: disable=redefined-outer-name
import json
from unittest.mock import MagicMock
import pytest
from psycopg import sql

DEVICE_ID = "S-SWiM-CTO-room-0224-seat48A-TRH-0001"


class FakeConnection:
    """Record the statements a connection runs, as text"""

    def __init__(self, rows=None):
        self.statements = []
        self.params = []
        self.rows = rows or {}
        self.cursor_mock = MagicMock()

    def execute(self, query, params=None):
        """Record one statement and answer with the rows set for it"""
        text = query.as_string() if isinstance(query, sql.Composable) else query
        self.statements.append(" ".join(text.split()))
        self.params.append(params)
        result = MagicMock()
        rows = next((r for key, r in self.rows.items() if key in text), [])
        result.fetchall.return_value = rows
        result.fetchone.return_value = rows[0] if rows else None
        return result

    def cursor(self):
        """A cursor whose executemany calls are recorded"""
        return self.cursor_mock

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


@pytest.fixture
def fake_conn():
    """A fresh fake connection"""
    return FakeConnection()


@pytest.fixture
def twin_data():
    """A valid twin file content with one sensor"""
    return {
        "group": "swim",
        "twin": "room_0224",
        "topic_prefix": "SWiM/CTO/room/0224",
        "devices": [
            {
                "topic": f"SWiM/CTO/room/0224/seat48A/S/{DEVICE_ID}",
                "ifc_guid": "2O2Fr$t4X7Zf8NOew3FLOH",
            }
        ],
    }


@pytest.fixture
def twin_path(tmp_path, twin_data):
    """The twin file written to disk"""
    path = tmp_path / "room_0224.json"
    path.write_text(json.dumps(twin_data), encoding="utf-8")
    return path
