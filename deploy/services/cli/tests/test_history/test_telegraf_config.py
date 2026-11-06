"""Tests for the Telegraf file of a twin, rendered from one template"""

# pylint: disable=redefined-outer-name
import shutil
import subprocess
from unittest.mock import Mock
import pytest
from dtaas_services.pkg.history import telegraf_config
from dtaas_services.pkg.history.twin import parse_twin
from .conftest import DEVICE_ID

tomllib = pytest.importorskip("tomllib")

CAN_CHECK = bool(shutil.which("telegraf") or shutil.which("docker"))


@pytest.fixture
def rendered(twin_data, mocker):
    """The rendered file of the test twin, parsed as TOML"""
    config = mocker.patch.object(telegraf_config, "Config").return_value
    config.env = {}
    config.get_value.return_value = "services.example.org"
    text = telegraf_config.render(parse_twin(twin_data))
    return text, tomllib.loads(text)


def test_render_leaves_no_placeholder(rendered):
    """Only Telegraf's own ${...} default survives the rendering"""
    text, _ = rendered
    assert "$" not in text.replace("${TELEGRAF_SECRETS_DIR:-/run/secrets}", "")


def test_render_reads_the_twin_topics_with_qos_1(rendered):
    """Exactly eight levels under the prefix, QoS 1 and a persistent session"""
    _, conf = rendered
    mqtt = conf["inputs"]["mqtt_consumer"][0]
    assert mqtt["topics"] == ["SWiM/CTO/room/0224/+/+/+/+"]
    assert mqtt["topic_parsing"][0]["topic"] == "SWiM/CTO/room/0224/+/+/+/+"
    assert mqtt["topic_parsing"][0]["tags"].endswith("device_id/quantity")
    assert (mqtt["qos"], mqtt["persistent_session"]) == (1, True)
    assert mqtt["client_id"] == "swim_telegraf_room_0224"
    assert mqtt["username"] == "swim_telegraf"
    assert mqtt["password"] == "@{swim_room_0224:rabbitmq_swim_telegraf_password}"
    assert mqtt["name_override"] == "reading"
    assert mqtt["servers"] == ["ssl://rabbitmq:8883"]


def test_render_parses_the_payload_convention(rendered):
    """value is the field, unit a tag and ts an RFC 3339 time in UTC"""
    _, conf = rendered
    parser = conf["inputs"]["mqtt_consumer"][0]["json_v2"][0]
    assert parser["timestamp_path"] == "ts"
    assert parser["timestamp_format"] == "rfc3339"
    assert parser["timestamp_timezone"] == "UTC"
    assert parser["tag"] == [{"path": "unit"}]
    assert parser["field"] == [{"path": "value", "type": "float"}]


def test_render_routes_only_registered_devices_of_the_twin(rendered):
    """Registered devices leave the input, the routing tag enters the output"""
    _, conf = rendered
    mqtt = conf["inputs"]["mqtt_consumer"][0]
    output = conf["outputs"]["postgresql"][0]
    assert mqtt["tags"] == {"dtaas_twin": "swim/room_0224"}
    assert mqtt["tagpass"] == {"device_id": [DEVICE_ID]}
    assert mqtt["tagdrop"] == {"quantity": ["status"]}
    assert output["tagpass"] == {"dtaas_twin": ["swim/room_0224"]}
    assert output["taginclude"] == ["device_id", "quantity", "unit"]
    assert output["create_templates"] == []
    assert output["add_column_templates"] == []


def test_render_keeps_pace_with_the_broker_prefetch(rendered):
    """Ten messages in flight, written as soon as a batch of ten is full

    The packaged rabbitmq.conf sets mqtt.prefetch = 10 and Telegraf only
    acknowledges written messages, so waiting for the 10 s agent flush would
    store one message per second per twin.
    """
    _, conf = rendered
    assert conf["inputs"]["mqtt_consumer"][0]["max_undelivered_messages"] == 10
    output = conf["outputs"]["postgresql"][0]
    assert output["metric_batch_size"] == 10
    assert output["flush_interval"] == "1s"


def test_render_takes_the_postgres_password_from_the_secret_store(rendered):
    """The connection names the group database and the secret, not a password"""
    _, conf = rendered
    connection = conf["outputs"]["postgresql"][0]["connection"]
    assert "dbname=swim user=swim_telegraf" in connection
    assert "password=@{swim_room_0224:postgresql_swim_telegraf_password}" in connection
    assert conf["secretstores"]["docker"][0]["id"] == "swim_room_0224"


@pytest.mark.skipif(not CAN_CHECK, reason="needs telegraf or docker")
def test_rendered_file_passes_telegraf_config_check(rendered):
    """The template passes the real check of the pinned Telegraf"""
    text, _ = rendered
    assert telegraf_config.check(text, "swim") == (True, "")


@pytest.mark.skipif(not CAN_CHECK, reason="needs telegraf or docker")
def test_telegraf_config_check_refuses_an_unknown_option(rendered):
    """A typo in the file fails the real check"""
    text, _ = rendered
    passed, message = telegraf_config.check(text.replace("qos = 1", "qos_x = 1"), "swim")
    assert not passed
    assert "qos_x" in message


def test_check_fails_closed_without_telegraf_and_docker(mocker):
    """No check tool means no file"""
    mocker.patch.object(telegraf_config.shutil, "which", return_value=None)
    passed, message = telegraf_config.check("x", "swim")
    assert not passed
    assert "nothing written" in message


def test_check_uses_the_pinned_image_without_a_network(mocker):
    """Docker runs telegraf:1.40.2 with no network and placeholder secrets"""
    mocker.patch.object(
        telegraf_config.shutil, "which", side_effect=lambda n: n == "docker"
    )
    run = mocker.patch.object(
        telegraf_config.subprocess, "run", return_value=Mock(returncode=0)
    )
    assert telegraf_config.check("x", "swim") == (True, "")
    command = run.call_args.args[0]
    assert command[:6] == ["docker", "run", "--rm", "--network", "none", "--user"]
    assert "telegraf:1.40.2" in command
    assert "TELEGRAF_SECRETS_DIR=/check/secrets" in command


def test_check_reports_the_error_line(mocker):
    """The E! line of Telegraf is the message"""
    mocker.patch.object(telegraf_config.shutil, "which", return_value="/bin/telegraf")
    mocker.patch.object(
        telegraf_config.subprocess,
        "run",
        return_value=Mock(
            returncode=1,
            stderr="2026-11-06T21:42:30Z I! Loading\n2026-11-06T21:42:30Z E! bad option\n",
        ),
    )
    assert telegraf_config.check("x", "swim") == (
        False,
        "telegraf config check failed: E! bad option",
    )


def test_check_reports_a_timeout(mocker):
    """A check that hangs is a failure"""
    mocker.patch.object(telegraf_config.shutil, "which", return_value="/bin/telegraf")
    mocker.patch.object(
        telegraf_config.subprocess,
        "run",
        side_effect=subprocess.TimeoutExpired("telegraf", 1),
    )
    assert telegraf_config.check("x", "swim")[0] is False


def test_install_moves_the_file_in_one_rename(base_dir):
    """The file appears complete and no staging file stays behind"""
    destination = telegraf_config.twin_file("swim", "room_0224")
    telegraf_config.install("text", destination)
    assert destination.read_text(encoding="utf-8") == "text"
    assert list(destination.parent.iterdir()) == [destination]
    assert not list(destination.parent.parent.glob(".*.tmp"))
    assert base_dir in destination.parents


def test_reload_telegraf_without_docker(mocker):
    """No Docker means no signal"""
    mocker.patch.object(telegraf_config.shutil, "which", return_value=None)
    run = mocker.patch.object(telegraf_config.subprocess, "run")
    assert telegraf_config.reload_telegraf() is False
    run.assert_not_called()


def test_reload_telegraf_skips_a_stopped_container(mocker):
    """A container that is not running gets no signal"""
    mocker.patch.object(telegraf_config.shutil, "which", return_value="/bin/docker")
    run = mocker.patch.object(
        telegraf_config.subprocess, "run", return_value=Mock(returncode=0, stdout="false\n")
    )
    assert telegraf_config.reload_telegraf() is False
    assert run.call_count == 1


def test_reload_telegraf_sends_sighup_to_the_running_container(mocker):
    """A running Telegraf container gets SIGHUP"""
    mocker.patch.object(telegraf_config.shutil, "which", return_value="/bin/docker")
    run = mocker.patch.object(
        telegraf_config.subprocess, "run", return_value=Mock(returncode=0, stdout="true\n")
    )
    assert telegraf_config.reload_telegraf() is True
    assert run.call_args.args[0] == ["docker", "kill", "--signal", "HUP", "telegraf"]
