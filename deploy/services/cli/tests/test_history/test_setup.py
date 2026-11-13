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


def broker_mocks(mocker, **env):
    """Mock the broker calls of setup_broker_account and its services.env"""
    mocker.patch.object(setup, "Config").return_value.env = env
    mocker.patch.object(setup, "ensure_password", return_value="pw")
    mocker.patch.object(setup, "ensure_user", return_value=(True, ""))
    grant = mocker.patch.object(setup, "grant_mqtt_account", return_value=(True, ""))
    limit = mocker.patch.object(setup, "limit_session_queues", return_value=(True, ""))
    return grant, limit


def test_setup_broker_account_reads_projects_and_writes_nothing(mocker):
    """<group>_telegraf may read the group's projects and publish nowhere"""
    grant, limit = broker_mocks(mocker)
    assert setup.setup_broker_account("swim", ["SWiM"]) == (True, "")
    grant.assert_called_once_with("swim_telegraf", "^$", r"^(SWiM)\.")
    limit.assert_called_once_with("swim_telegraf", setup.DEFAULT_QUEUE_MAX_LENGTH)


def test_setup_broker_account_takes_the_queue_limit_of_services_env(mocker):
    """TELEGRAF_QUEUE_MAX_LENGTH replaces the default"""
    _, limit = broker_mocks(mocker, TELEGRAF_QUEUE_MAX_LENGTH="500")
    assert setup.setup_broker_account("swim", ["SWiM"]) == (True, "")
    limit.assert_called_once_with("swim_telegraf", 500)


@pytest.mark.parametrize("value", ["0", "many", "-1"])
def test_setup_broker_account_refuses_a_bad_queue_limit(mocker, value):
    """A limit that is not a whole number above 0 changes nothing"""
    grant, limit = broker_mocks(mocker, TELEGRAF_QUEUE_MAX_LENGTH=value)
    success, message = setup.setup_broker_account("swim", ["SWiM"])
    assert not success
    assert "TELEGRAF_QUEUE_MAX_LENGTH" in message
    grant.assert_not_called()
    limit.assert_not_called()


def test_setup_database_runs_in_the_group_database(mocker):
    """Roles, migrations and grants run on one connection to <group>"""
    mocker.patch.object(setup, "ensure_database")
    connect = mocker.patch.object(setup, "connect")
    for name in ("ensure_roles", "grant_history"):
        mocker.patch.object(setup, name)
    mocker.patch.object(setup, "apply_migrations", return_value=["m"])
    assert setup.setup_database("swim") == ["m"]
    connect.assert_called_once_with("swim")


def grafana_env(mocker, base_dir, **env):
    """Point Grafana's Config at the test folder with the given services.env"""
    config = mocker.patch.object(grafana, "Config")
    config.get_base_dir.return_value = base_dir
    config.return_value.env = env


def test_write_datasource_reads_the_password_from_a_file(base_dir, mocker):
    """The data source names its role and reads the secret through $__file"""
    grafana_env(mocker, base_dir)
    path = grafana.write_datasource("swim")
    text = path.read_text(encoding="utf-8")
    assert path == base_dir / grafana.DATASOURCES_DIR / "postgresql_swim.yaml"
    assert "name: postgresql_swim" in text
    assert "user: swim_view_ro" in text
    assert "database: swim" in text
    assert "$__file{/run/secrets/postgresql_swim_view_ro_password}" in text
    assert "url: postgres:5432" in text
    assert "sslmode: require" in text


def test_write_datasource_takes_the_address_and_tls_of_services_env(base_dir, mocker):
    """The address and sslmode come from services.env when set there"""
    grafana_env(
        mocker,
        base_dir,
        POSTGRES_INTERNAL_HOST="db.internal",
        POSTGRES_INTERNAL_PORT="6432",
        POSTGRES_SSLMODE="verify-full",
    )
    text = grafana.write_datasource("swim").read_text(encoding="utf-8")
    assert "url: db.internal:6432" in text
    assert "sslmode: verify-full" in text
