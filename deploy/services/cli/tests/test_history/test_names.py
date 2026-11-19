"""Tests for group and twin names"""

import pytest
from dtaas_services.pkg.history import names


@pytest.mark.parametrize("name", ["swim", "room_0224", "a12"])
def test_valid_names(name):
    """Names of the convention pass"""
    assert names.validate_name("group", name) == (True, "")


@pytest.mark.parametrize("name", ["", "ab", "Swim", "1abc", "a-b-c", "a.bc", "x" * 33])
def test_invalid_names(name):
    """Names outside the pattern are refused"""
    valid, message = names.validate_name("group", name)
    assert not valid
    assert "Invalid group name" in message


@pytest.mark.parametrize("name", ["postgres", "grafana", "public", "dtaas_admin"])
def test_reserved_names(name):
    """Reserved names are refused"""
    valid, message = names.validate_name("twin", name)
    assert not valid
    assert "reserved" in message


def test_account_names_follow_the_convention():
    """Accounts are <group>_<purpose>, the client ID adds the twin"""
    assert names.telegraf_account("swim") == "swim_telegraf"
    assert names.view_account("swim") == "swim_view_ro"
    assert names.telegraf_client_id("swim", "room_0224") == "swim_telegraf_room_0224"
