"""Tests for the ThingsBoard device connectivity settings."""

from unittest.mock import Mock
import httpx
import pytest
from dtaas_services.pkg.services.thingsboard import connectivity as conn


def _session(stored: dict) -> Mock:
    """A session whose GET returns the stored settings and whose POST succeeds."""
    session = Mock()
    session.get.return_value = Mock(json=Mock(return_value=stored))
    session.post.return_value = Mock()
    return session


def _stored() -> dict:
    """Connectivity settings as a fresh ThingsBoard stores them."""
    return {
        "key": "connectivity",
        "jsonValue": {
            "http": {"enabled": True, "host": "", "port": "8080"},
            "https": {"enabled": False, "host": "", "port": "443"},
            "mqtt": {"enabled": True, "host": "", "port": "1883"},
            "mqtts": {"enabled": False, "host": "", "port": "8883"},
            "coap": {"enabled": True, "host": "", "port": "5683"},
        },
    }


def test_points_devices_to_the_published_ports(monkeypatch):
    """Only HTTPS and MQTT over TLS are offered, each on its published port"""
    monkeypatch.setenv("THINGSBOARD_PORT", "8089")
    monkeypatch.setenv("THINGSBOARD_MQTT_SSL_PORT", "8883")
    session = _session(_stored())
    ok, msg = conn.apply_device_connectivity("https://tb", session)
    assert ok is True
    assert "8089" in msg and "8883" in msg
    saved = session.post.call_args.kwargs["json"]["jsonValue"]
    assert saved["http"]["enabled"] is False
    assert saved["mqtt"]["enabled"] is False
    assert saved["https"] == {"enabled": True, "host": "", "port": "8089"}
    assert saved["mqtts"] == {"enabled": True, "host": "", "port": "8883"}
    assert saved["coap"]["enabled"] is True


def test_keeps_the_key_of_the_stored_settings(monkeypatch):
    """The settings are saved back under the key they were read from"""
    monkeypatch.setenv("THINGSBOARD_PORT", "8089")
    monkeypatch.setenv("THINGSBOARD_MQTT_SSL_PORT", "8883")
    session = _session(_stored())
    conn.apply_device_connectivity("https://tb", session)
    assert session.get.call_args.args[0] == "https://tb/api/admin/settings/connectivity"
    assert session.post.call_args.args[0] == "https://tb/api/admin/settings"
    assert session.post.call_args.kwargs["json"]["key"] == "connectivity"


def test_fills_protocols_the_stored_settings_lack(monkeypatch):
    """Settings without an https or mqtts entry still get one"""
    monkeypatch.setenv("THINGSBOARD_PORT", "8089")
    monkeypatch.setenv("THINGSBOARD_MQTT_SSL_PORT", "8883")
    session = _session({"key": "connectivity", "jsonValue": None})
    ok, _ = conn.apply_device_connectivity("https://tb", session)
    saved = session.post.call_args.kwargs["json"]["jsonValue"]
    assert ok is True
    assert saved["https"] == {"enabled": True, "port": "8089"}
    assert saved["http"] == {"enabled": False}


def test_refuses_without_the_ports(monkeypatch):
    """Nothing is read or written when a port is not configured"""
    monkeypatch.setenv("THINGSBOARD_PORT", "8089")
    monkeypatch.delenv("THINGSBOARD_MQTT_SSL_PORT", raising=False)
    session = _session(_stored())
    ok, msg = conn.apply_device_connectivity("https://tb", session)
    assert ok is False
    assert "THINGSBOARD_MQTT_SSL_PORT" in msg
    session.get.assert_not_called()
    session.post.assert_not_called()


def test_an_http_error_reaches_the_caller(monkeypatch):
    """A refused request raises, so setup_thingsboard_users reports it"""
    monkeypatch.setenv("THINGSBOARD_PORT", "8089")
    monkeypatch.setenv("THINGSBOARD_MQTT_SSL_PORT", "8883")
    session = _session(_stored())
    session.get.return_value.raise_for_status.side_effect = httpx.HTTPError("403")
    with pytest.raises(httpx.HTTPError):
        conn.apply_device_connectivity("https://tb", session)
    session.post.assert_not_called()
