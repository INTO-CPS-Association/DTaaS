"""Tests for the history setup of a group"""

# pylint: disable=redefined-outer-name
import psycopg
import pytest
from dtaas_services.pkg.history import grafana, setup


@pytest.fixture
def mocked(mocker):
    """Mock the broker, the database and the data source file"""
    return {
        "broker": mocker.patch.object(
            setup, "setup_broker_account", return_value=(True, "")
        ),
        "database": mocker.patch.object(
            setup, "setup_database", return_value=["core_0001_device_reading"]
        ),
        "datasource": mocker.patch.object(setup, "write_datasource"),
    }


def test_setup_group_history_runs_every_step(mocked):
    """Broker account, database and data source are set up in order"""
    success, message = setup.setup_group_history("swim", ["SWiM"])
    assert success
    assert "core_0001_device_reading" in message
    mocked["broker"].assert_called_once_with("swim", ["SWiM"])
    mocked["database"].assert_called_once_with("swim")
    mocked["datasource"].assert_called_once_with("swim")


@pytest.mark.parametrize("group, projects", [("Bad", ["SWiM"]), ("swim", ["a.b"])])
def test_setup_group_history_validates_first(mocked, group, projects):
    """Nothing is touched for an invalid group or project"""
    assert setup.setup_group_history(group, projects)[0] is False
    mocked["broker"].assert_not_called()


def test_setup_group_history_reports_a_database_error(mocked):
    """A PostgreSQL error ends the setup with its class"""
    mocked["database"].side_effect = psycopg.OperationalError("refused")
    success, message = setup.setup_group_history("swim", ["SWiM"])
    assert not success
    assert "OperationalError" in message
    mocked["datasource"].assert_not_called()


def test_setup_broker_account_reads_projects_and_writes_nothing(mocker):
    """<group>_telegraf may read the group's projects and publish nowhere"""
    mocker.patch.object(setup, "ensure_password", return_value="pw")
    mocker.patch.object(setup, "ensure_user", return_value=(True, ""))
    grant = mocker.patch.object(setup, "grant_mqtt_account", return_value=(True, ""))
    assert setup.setup_broker_account("swim", ["SWiM"]) == (True, "")
    grant.assert_called_once_with("swim_telegraf", "^$", r"^(SWiM)\.")


def test_setup_database_runs_in_the_group_database(mocker):
    """Roles, migrations and grants run on one connection to <group>"""
    mocker.patch.object(setup, "ensure_database")
    connect = mocker.patch.object(setup, "connect")
    for name in ("ensure_roles", "grant_history"):
        mocker.patch.object(setup, name)
    mocker.patch.object(setup, "apply_migrations", return_value=["m"])
    assert setup.setup_database("swim") == ["m"]
    connect.assert_called_once_with("swim")


def test_write_datasource_reads_the_password_from_a_file(base_dir):
    """The data source names its role and reads the secret through $__file"""
    path = grafana.write_datasource("swim")
    text = path.read_text(encoding="utf-8")
    assert path == base_dir / grafana.DATASOURCES_DIR / "postgresql_swim.yaml"
    assert "name: postgresql_swim" in text
    assert "user: swim_view_ro" in text
    assert "database: swim" in text
    assert "$__file{/run/secrets/postgresql_swim_view_ro_password}" in text
