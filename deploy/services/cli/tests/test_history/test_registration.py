"""Tests for twin registration and removal"""

# pylint: disable=redefined-outer-name
from unittest.mock import MagicMock
import psycopg
import pytest
from dtaas_services.pkg.history import registration
from dtaas_services.pkg.secret_files import ensure_password
from .conftest import DEVICE_ID, FakeConnection


@pytest.fixture
def ready(base_dir, mocker):
    """A group with its Telegraf secrets, a passing check and a fake database"""
    ensure_password("telegraf", "rabbitmq", "swim_telegraf")
    ensure_password("telegraf", "postgresql", "swim_telegraf")
    events = []
    conn = FakeConnection()
    conn.cursor_mock.__enter__.return_value.executemany.side_effect = (
        lambda *a: events.append("devices")
    )
    mocker.patch.object(registration, "render", return_value="conf")
    check = mocker.patch.object(registration, "check", return_value=(True, ""))
    connect = mocker.patch.object(registration, "connect", return_value=conn)
    install = mocker.patch.object(
        registration, "install", side_effect=lambda *a: events.append("file")
    )
    return {"events": events, "check": check, "connect": connect,
            "install": install, "conn": conn, "base": base_dir}  # fmt: skip


def test_register_writes_devices_before_the_file(ready, twin_path):
    """The device rows exist before Telegraf can let a reading in"""
    success, message = registration.register_twin(twin_path)
    assert success, message
    assert ready["events"] == ["devices", "file"]
    ready["check"].assert_called_once_with("conf", "swim")
    ready["connect"].assert_called_once_with("swim")
    rows = ready["conn"].cursor_mock.__enter__.return_value.executemany.call_args
    assert rows.args[1][0]["device_id"] == DEVICE_ID
    assert "ON CONFLICT (device_id) DO UPDATE" in rows.args[0].as_string()


def test_register_writes_nothing_when_the_check_fails(ready, twin_path):
    """A file that fails the check leaves no device and no file"""
    ready["check"].return_value = (False, "telegraf config check failed: E! x")
    assert registration.register_twin(twin_path) == (
        False,
        "telegraf config check failed: E! x",
    )
    assert not ready["events"]
    ready["connect"].assert_not_called()


def test_register_needs_the_group_secrets(base_dir, twin_path, mocker):
    """A group without user add-history is refused before any check"""
    check = mocker.patch.object(registration, "check")
    success, message = registration.register_twin(twin_path)
    assert not success
    assert "run user add-history first" in message
    check.assert_not_called()
    assert base_dir.exists()


def test_register_reports_a_bad_twin_file(tmp_path):
    """An invalid file is refused with its reason"""
    path = tmp_path / "t.json"
    path.write_text('{"group": "Bad"}', encoding="utf-8")
    success, message = registration.register_twin(path)
    assert not success
    assert "Invalid group name" in message


def test_register_keeps_the_file_out_when_the_database_fails(ready, twin_path):
    """A refused insert means no Telegraf file"""
    ready["connect"].side_effect = psycopg.OperationalError("down")
    success, message = registration.register_twin(twin_path)
    assert not success
    assert "OperationalError" in message
    ready["install"].assert_not_called()


def test_remove_deletes_the_file_then_the_session_queue(base_dir, mocker):
    """The file goes first, so Telegraf disconnects before the queue goes"""
    path = registration.twin_file("swim", "room_0224")
    path.parent.mkdir(parents=True)
    path.write_text("conf", encoding="utf-8")
    events = []
    reload = mocker.patch.object(
        registration,
        "reload_telegraf",
        side_effect=lambda: events.append(("reload", path.exists())),
    )
    delete = mocker.patch.object(
        registration,
        "delete_session_queue",
        side_effect=lambda cid: events.append(("queue", cid)) or (True, cid),
    )
    assert registration.remove_twin("swim", "room_0224") == (
        True,
        "swim_telegraf_room_0224",
    )
    assert events == [("reload", False), ("queue", "swim_telegraf_room_0224")]
    reload.assert_called_once_with()
    delete.assert_called_once()
    assert base_dir.exists()


def test_remove_validates_names(mocker):
    """A name outside the convention touches nothing"""
    mocker.patch.object(registration, "reload_telegraf")
    delete = mocker.patch.object(registration, "delete_session_queue")
    assert registration.remove_twin("swim", "../x")[0] is False
    delete.assert_not_called()


def test_write_devices_sends_parameters_only():
    """Device values are parameters, never part of the SQL text"""
    conn = MagicMock()
    device = MagicMock()
    device.row.return_value = {"device_id": "x'; DROP TABLE reading; --"}
    registration.write_devices(conn, (device,))
    query, rows = (
        conn.cursor.return_value.__enter__.return_value.executemany.call_args.args
    )
    assert "DROP" not in query.as_string()
    assert rows == [{"device_id": "x'; DROP TABLE reading; --"}]
