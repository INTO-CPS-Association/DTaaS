"""Tests for kits that bring their own tables, with the soil example (K11)"""

# pylint: disable=redefined-outer-name
import json
import shutil
from pathlib import Path
import pytest
from dtaas_services.pkg.history import kit_hooks, kits, registration, setup
from dtaas_services.pkg.history.twin import TwinFileError, parse_twin
from .conftest import DEVICE_ID, FakeConnection

SOIL = Path(__file__).parent / "kits" / "soil"
SOIL_ROW = {"device_id": DEVICE_ID, "depth_from": 0.1, "depth_to": 0.3}


@pytest.fixture
def installed(base_dir):
    """The soil kit installed under config/kits"""
    shutil.copytree(SOIL, base_dir / kits.KITS_DIR / "soil")
    return base_dir


@pytest.fixture
def soil_twin(twin_data):
    """The test twin with a soil_sensor row for its device"""
    return parse_twin({**twin_data, "kits": {"soil": {"soil_sensor": [SOIL_ROW]}}})


def test_load_kits_reads_the_soil_kit(installed):
    """The manifest and the migration are read and named"""
    (kit,) = kits.load_kits()
    assert kit.name == "soil"
    assert kit.tables == {"soil_sensor": ("depth_from", "depth_to")}
    assert [m.name for m in kit.migrations] == ["soil/0001_soil_sensor"]
    assert "REFERENCES device (device_id)" in kit.migrations[0].statements
    assert installed.exists()


def test_load_kits_without_kits(base_dir):
    """No kits folder means no kits"""
    assert not kits.load_kits()
    assert base_dir.exists()


@pytest.mark.parametrize(
    "manifest, message",
    [
        ({"name": "soil", "tables": {"reading": []}}, "shared table"),
        ({"name": "soil", "tables": {"Soil-Sensor": []}}, "Invalid table"),
        ({"name": "soil", "tables": {"soil_sensor": ["x;y"]}}, "Invalid column"),
        ({"name": "soil", "tables": {}}, "at least one table"),
        ({"name": "other", "tables": {"t": []}}, "must be named other"),
        ({"name": "Soil", "tables": {"t": []}}, "Invalid kit name"),
    ],
)
def test_load_kit_refuses_a_bad_manifest(tmp_path, manifest, message):
    """A kit outside the naming convention is refused"""
    folder = tmp_path / "soil"
    folder.mkdir()
    (folder / "kit.json").write_text(json.dumps(manifest), encoding="utf-8")
    with pytest.raises(kits.KitError, match=message):
        kits.load_kit(folder)


def test_load_kit_refuses_a_badly_named_migration(tmp_path):
    """Migrations are NNNN_<what>.sql, so their order is clear"""
    folder = tmp_path / "soil"
    shutil.copytree(SOIL, folder)
    (folder / "migrations" / "soil.sql").write_text("", encoding="utf-8")
    with pytest.raises(kits.KitError, match="NNNN"):
        kits.load_kit(folder)


@pytest.mark.usefixtures("installed")
def test_apply_kits_runs_the_migration_as_the_kit_role():
    """The soil table is made by swim_kit_soil and readable by swim_view_ro"""
    conn = FakeConnection(rows={"information_schema": [
        ("device_id",), ("depth_from",), ("depth_to",)]})  # fmt: skip
    applied = kit_hooks.apply_kits(conn, "swim", kits.load_kits())
    assert applied == ["soil/0001_soil_sensor"]
    run = conn.statements
    assert 'CREATE ROLE "swim_kit_soil" NOLOGIN' in run
    assert 'GRANT USAGE, CREATE ON SCHEMA public TO "swim_kit_soil"' in run
    assert 'GRANT REFERENCES (device_id) ON device TO "swim_kit_soil"' in run
    create = next(i for i, s in enumerate(run) if s.startswith("-- Depth range"))
    assert run[create - 1] == 'SET LOCAL ROLE "swim_kit_soil"'
    assert run[create + 1] == "RESET ROLE"
    assert run[-1] == 'GRANT SELECT ON "soil_sensor" TO "swim_view_ro"'


def test_apply_kits_refuses_a_table_without_device_id(installed):
    """A declared table must exist with device_id and its columns"""
    conn = FakeConnection(rows={"information_schema": [("depth_from",)]})
    with pytest.raises(kits.KitError, match="lacks"):
        kit_hooks.apply_kits(conn, "swim", kits.load_kits())
    assert installed.exists()


def test_kit_role_fits_a_postgresql_name():
    """A role longer than 63 bytes would be cut, so it is refused"""
    with pytest.raises(kits.KitError, match="63 bytes"):
        kit_hooks.kit_role("g" * 32, "k" * 32)


@pytest.mark.usefixtures("installed")
def test_write_kit_rows_replaces_the_rows_of_the_twin_devices(soil_twin):
    """Old rows of the devices go, the file's rows come, as the kit role"""
    conn = FakeConnection()
    kit_hooks.write_kit_rows(conn, soil_twin, kits.load_kits())
    assert conn.statements == [
        'SET LOCAL ROLE "swim_kit_soil"',
        'DELETE FROM "soil_sensor" WHERE device_id = ANY(%s)',
        'INSERT INTO "soil_sensor" ("device_id", "depth_from", "depth_to") '
        "VALUES (%s, %s, %s)",
        "RESET ROLE",
    ]
    assert conn.params[1] == ([DEVICE_ID],)
    assert conn.params[2] == (DEVICE_ID, 0.1, 0.3)


@pytest.mark.parametrize(
    "rows, message",
    [
        ({"other": {"t": [SOIL_ROW]}}, "not installed"),
        ({"soil": {"soil_depth": [SOIL_ROW]}}, "no table soil_depth"),
        ({"soil": {"soil_sensor": [{**SOIL_ROW, "x": 1}]}}, "no columns"),
    ],
)
def test_write_kit_rows_refuses_undeclared_parts(installed, twin_data, rows, message):
    """Only declared tables and columns of installed kits are written"""
    twin = parse_twin({**twin_data, "kits": rows})
    with pytest.raises(kits.KitError, match=message):
        kit_hooks.write_kit_rows(FakeConnection(), twin, kits.load_kits())
    assert installed.exists()


@pytest.mark.parametrize(
    "rows, message",
    [
        ([{"device_id": "other", "depth_from": 0}], "device_id of a twin device"),
        ([{"device_id": DEVICE_ID, "depth_from": [1]}], "text, numbers or null"),
        ({"device_id": DEVICE_ID}, "list of rows"),
    ],
)
def test_twin_file_refuses_bad_kit_rows(twin_data, rows, message):
    """Kit rows belong to the twin's devices and hold plain values"""
    with pytest.raises(TwinFileError, match=message):
        parse_twin({**twin_data, "kits": {"soil": {"soil_sensor": rows}}})


def test_setup_database_runs_the_kit_hook(mocker, installed):
    """Setup applies the core migrations, then the kits, in one transaction"""
    for name in ("ensure_database", "connect", "ensure_roles", "grant_history"):
        mocker.patch.object(setup, name)
    mocker.patch.object(setup, "apply_migrations", return_value=["core"])
    hook = mocker.patch.object(setup, "apply_kits", return_value=["soil/0001"])
    assert setup.setup_database("swim") == ["core", "soil/0001"]
    assert [k.name for k in hook.call_args.args[2]] == ["soil"]
    assert installed.exists()


def test_register_runs_the_kit_hook_with_the_devices(mocker, installed, twin_path):
    """Kit rows are written in the transaction that writes the devices"""
    conn = FakeConnection()
    mocker.patch.object(registration, "connect", return_value=conn)
    mocker.patch.object(registration, "write_devices")
    hook = mocker.patch.object(registration, "write_kit_rows")
    mocker.patch.object(registration, "install")
    twin = registration.load_twin(twin_path)
    registration._store(twin, "conf")  # pylint: disable=protected-access
    assert hook.call_args.args[0] is conn
    assert installed.exists()
