"""Tests for the twin file"""

import pytest
from dtaas_services.pkg.history.twin import TwinFileError, load_twin, parse_twin
from .conftest import DEVICE_ID


def test_parse_twin_reads_devices(twin_data):
    """A valid file gives the device rows of the naming convention"""
    twin = parse_twin(twin_data)
    assert twin.prefix == ("SWiM", "CTO", "room", "0224")
    row = twin.devices[0].row()
    assert row["device_id"] == DEVICE_ID
    assert row["unit_id"] == "0224"
    assert row["area"] == "seat48A"
    assert row["device_type"] == "S"
    assert row["brick_class"] is None


def test_load_twin_reads_a_file(twin_path):
    """The file on disk is parsed"""
    assert load_twin(twin_path).name == "room_0224"


def test_load_twin_reports_bad_json(tmp_path):
    """A file that is not JSON is refused with the file name"""
    path = tmp_path / "bad.json"
    path.write_text("{", encoding="utf-8")
    with pytest.raises(TwinFileError, match="bad.json"):
        load_twin(path)


@pytest.mark.parametrize(
    "change, message",
    [
        ({"group": "Bad"}, "Invalid group name"),
        ({"twin": "postgres"}, "reserved"),
        ({"topic_prefix": "SWiM/CT.O"}, "Invalid topic level"),
        ({"topic_prefix": "a/b/c/d/e/f/g"}, "fewer than seven"),
        ({"devices": []}, "at least one device"),
        ({"devices": ["x"]}, "JSON object"),
        (
            {"devices": [{"topic": "Other/CTO/room/0224/seat48A/S/dev1"}]},
            "seven levels",
        ),
        ({"devices": [{"topic": "SWiM/CTO/room/0224/seat48A/X/dev1"}]}, "S or A"),
        (
            {"devices": [{"topic": "SWiM/CTO/room/0224/seat48A/S/dev*"}]},
            "Invalid topic",
        ),
        ({"extra": 1}, "Unknown keys"),
    ],
)
def test_parse_twin_refuses(twin_data, change, message):
    """Each malformed part is refused with its reason"""
    with pytest.raises(TwinFileError, match=message):
        parse_twin({**twin_data, **change})


def test_parse_twin_refuses_a_duplicate_device(twin_data):
    """A device listed twice is refused"""
    twin_data["devices"] = twin_data["devices"] * 2
    with pytest.raises(TwinFileError, match="twice"):
        parse_twin(twin_data)


def test_parse_twin_refuses_a_non_text_guid(twin_data):
    """Optional fields must be text"""
    twin_data["devices"][0]["ifc_guid"] = 5
    with pytest.raises(TwinFileError, match="ifc_guid must be text"):
        parse_twin(twin_data)
