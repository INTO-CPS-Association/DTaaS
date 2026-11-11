"""Tests for the migrations and the roles of a group database"""

from dtaas_services.pkg.history import roles, schema
from .conftest import FakeConnection


def test_core_migration_follows_the_naming_convention():
    """The tables, the foreign key and the index have the agreed names"""
    text = schema.CORE_MIGRATIONS[0].statements
    assert "CREATE TABLE device (" in text
    assert "CREATE TABLE reading (" in text
    assert "CONSTRAINT reading_device_id_fkey" in text
    assert "REFERENCES device (device_id)" in text
    assert (
        "CREATE INDEX reading_device_id_time_idx ON reading (device_id, time DESC)"
        in text
    )


def test_apply_migrations_runs_new_ones_and_records_them():
    """A new database gets every core migration, recorded by name"""
    conn = FakeConnection()
    assert schema.apply_migrations(conn, schema.CORE_MIGRATIONS) == [
        "core_0001_device_reading"
    ]
    assert conn.statements[0].startswith("CREATE TABLE IF NOT EXISTS schema_migration")
    assert conn.params[-1] == ("core_0001_device_reading",)


def test_apply_migrations_skips_applied_ones():
    """A migration already recorded does not run again"""
    conn = FakeConnection(rows={"SELECT name": [("core_0001_device_reading",)]})
    assert not schema.apply_migrations(conn, schema.CORE_MIGRATIONS)
    assert not [s for s in conn.statements if "CREATE TABLE device" in s]


def test_grant_history_gives_each_role_only_its_rights():
    """Telegraf inserts, the read-only roles select, PUBLIC loses connect"""
    conn = FakeConnection()
    roles.grant_history(conn, "swim")
    assert conn.statements == [
        'REVOKE ALL ON DATABASE "swim" FROM PUBLIC',
        "REVOKE ALL ON SCHEMA public FROM PUBLIC",
        'GRANT CONNECT ON DATABASE "swim" TO "swim_telegraf", "swim_view_ro", '
        '"dtaas_signals_ro"',
        'GRANT USAGE ON SCHEMA public TO "swim_telegraf", "swim_view_ro", '
        '"dtaas_signals_ro"',
        'GRANT INSERT ON reading TO "swim_telegraf"',
        'GRANT SELECT ON device, reading TO "swim_view_ro", "dtaas_signals_ro"',
    ]


def test_ensure_roles_writes_each_secret_for_its_container(mocker):
    """Each role's password file lands in the folder of its consumer"""
    ensure = mocker.patch.object(roles, "ensure_password", return_value="pw")
    login = mocker.patch.object(roles, "ensure_login_role")
    roles.ensure_roles(FakeConnection(), "swim")
    assert [c.args for c in ensure.call_args_list] == [
        ("telegraf", "postgresql", "swim_telegraf"),
        ("grafana", "postgresql", "swim_view_ro"),
        ("signals", "postgresql", "dtaas_signals_ro"),
    ]
    assert login.call_count == 3


def test_gateway_secret_files_have_the_names_it_reads(base_dir, mocker):
    """The gateway mounts secrets/signals as /run/secrets and reads these two"""
    # pylint: disable=import-outside-toplevel
    from dtaas_services.pkg.services import rabbitmq_accounts, signals_account

    mocker.patch.object(roles, "ensure_login_role")
    mocker.patch.object(rabbitmq_accounts, "rabbitmqctl", return_value=(True, ""))
    roles.ensure_roles(FakeConnection(), "swim")
    signals_account.setup_signals_account(["SWiM"])
    names = sorted(p.name for p in (base_dir / "secrets" / "signals").iterdir())
    assert names == [
        "postgresql_dtaas_signals_ro_password",
        "rabbitmq_dtaas_signals_password",
    ]
