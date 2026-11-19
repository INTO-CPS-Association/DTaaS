"""Tests for the owners file of the signals gateway"""

# pylint: disable=redefined-outer-name
import json
import stat
import pytest
from dtaas_services.pkg.history import owners, setup


def test_merge_owners_maps_each_owner_to_group_and_topics():
    """Each owner gets the group and one prefix ending in / per project"""
    merged = owners.merge_owners({}, "swim", ["jady", "team.x"], ["SWiM", "Soil"])
    assert merged == {
        "jady": {"group": "swim", "topics": ["SWiM/", "Soil/"]},
        "team.x": {"group": "swim", "topics": ["SWiM/", "Soil/"]},
    }


def test_merge_owners_keeps_known_topics_and_other_owners():
    """A second run adds new prefixes and leaves other owners alone"""
    current = {
        "jady": {"group": "swim", "topics": ["SWiM/"]},
        "bob": {"group": "soil", "topics": ["Soil/"]},
    }
    merged = owners.merge_owners(current, "swim", ["jady"], ["SWiM", "Lab"])
    assert merged["jady"] == {"group": "swim", "topics": ["SWiM/", "Lab/"]}
    assert merged["bob"] == current["bob"]


def test_merge_owners_refuses_an_owner_of_another_group():
    """An owner mapped to another group is a clear error"""
    current = {"jady": {"group": "soil", "topics": ["Soil/"]}}
    with pytest.raises(owners.OwnersError, match="mapped to group soil, not swim"):
        owners.merge_owners(current, "swim", ["jady"], ["SWiM"])


@pytest.mark.parametrize("owner", ["", "-jady", "ja dy", "a/b", "jady*"])
def test_merge_owners_refuses_an_invalid_owner(owner):
    """Owners follow the pattern the gateway checks"""
    with pytest.raises(owners.OwnersError, match="Invalid owner"):
        owners.merge_owners({}, "swim", [owner], ["SWiM"])


def test_patterns_match_the_gateway():
    """The prefix pattern refuses wildcards and needs a final /"""
    assert owners.PREFIX.match("SWiM/")
    assert not owners.PREFIX.match("SWiM")
    assert not owners.PREFIX.match("SWiM/#/")
    assert owners.GROUP.match("swim_2")
    assert not owners.GROUP.match("Swim")


def test_write_owners_writes_mode_600(base_dir):
    """The file sits next to the gateway's other secrets with mode 600"""
    owners.write_owners({"jady": {"group": "swim", "topics": ["SWiM/"]}})
    path = base_dir / "secrets" / "signals" / "signals_owners.json"
    assert stat.S_IMODE(path.stat().st_mode) == 0o600
    assert owners.read_owners() == {"jady": {"group": "swim", "topics": ["SWiM/"]}}


def test_read_owners_refuses_a_bad_file(base_dir):
    """A file that is not a JSON object is refused with its name"""
    path = owners.owners_path()
    path.parent.mkdir(parents=True)
    path.write_text("[]", encoding="utf-8")
    with pytest.raises(owners.OwnersError, match="must map"):
        owners.read_owners()
    assert base_dir.exists()


@pytest.fixture
def services(mocker):
    """Mock the broker, the database and the data source"""
    mocker.patch.object(setup, "setup_broker_account", return_value=(True, ""))
    mocker.patch.object(setup, "setup_database", return_value=[])
    return mocker.patch.object(setup, "write_datasource")


@pytest.mark.usefixtures("services")
def test_setup_group_history_writes_the_owners(base_dir):
    """add-history with owners merges them into the owners file"""
    assert setup.setup_group_history("swim", ["SWiM"], ("jady",))[0]
    path = base_dir / "secrets" / "signals" / "signals_owners.json"
    assert json.loads(path.read_text(encoding="utf-8")) == {
        "jady": {"group": "swim", "topics": ["SWiM/"]}
    }


def test_setup_group_history_conflict_changes_nothing(base_dir, services):
    """An owner of another group stops the command before any service"""
    owners.write_owners({"jady": {"group": "soil", "topics": ["Soil/"]}})
    success, message = setup.setup_group_history("swim", ["SWiM"], ("jady",))
    assert not success
    assert "mapped to group soil" in message
    services.assert_not_called()
    assert owners.read_owners()["jady"]["group"] == "soil"
    assert base_dir.exists()


@pytest.mark.usefixtures("services")
def test_setup_group_history_without_owners_writes_no_file(base_dir):
    """No --owner leaves the owners file alone"""
    assert setup.setup_group_history("swim", ["SWiM"])[0]
    assert not (base_dir / "secrets" / "signals" / "signals_owners.json").exists()
