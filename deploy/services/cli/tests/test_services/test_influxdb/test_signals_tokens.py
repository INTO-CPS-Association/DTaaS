"""Tests for the read-only InfluxDB tokens of the signals gateway"""

import json
import stat
from pathlib import Path
import pytest
from dtaas_services.pkg.services.influxdb.signals_tokens import (
    create_read_token,
    find_bucket_id,
    get_tokens_file,
    read_tokens,
    revoke_old_tokens,
    setup_signals_tokens,
    write_signals_tokens,
)
# pylint: disable=W0613, W0621

MODULE = "dtaas_services.pkg.services.influxdb.signals_tokens"
TOKEN = "made-up-read-token"


@pytest.fixture
def mock_exec(mocker):
    """Mock the influx commands run in the InfluxDB container"""
    return mocker.patch(f"{MODULE}.execute_influxdb_command")


@pytest.fixture
def env(mocker):
    """services.env with an admin org and a tokens file"""
    config = mocker.patch(f"{MODULE}.Config")
    config.return_value.env = {"INFLUXDB_ORG": "dtaas"}
    config.get_base_dir.return_value = Path("/base")
    return config.return_value.env


def _influx(bucket_ids: dict, auths=()):
    """Answer bucket list, auth list, auth delete and auth create like the influx CLI"""
    def answer(command, _context):
        if command[1:3] == ["auth", "delete"]:
            return True, "{}"
        org = command[command.index("--org") + 1]
        if command[1:3] == ["auth", "list"]:
            return True, json.dumps(list(auths))
        if command[1] == "bucket":
            if org not in bucket_ids:
                return False, f'Error: bucket "{org}" not found'
            return True, json.dumps([{"id": bucket_ids[org], "name": org}])
        return True, json.dumps({"id": "a1", "token": f"{TOKEN}-{org}"})
    return answer


def test_get_tokens_file_unset(env):
    """No file is configured when the key is missing"""
    assert get_tokens_file() is None


def test_get_tokens_file_relative_to_base_dir(env):
    """A relative path is read against the CLI base directory"""
    env["SIGNALS_INFLUX_TOKENS_FILE"] = " config/secrets/influx-tokens.json "
    assert get_tokens_file() == Path("/base/config/secrets/influx-tokens.json")


def test_get_tokens_file_absolute(env):
    """An absolute path is kept"""
    env["SIGNALS_INFLUX_TOKENS_FILE"] = "/srv/signals/influx-tokens.json"
    assert get_tokens_file() == Path("/srv/signals/influx-tokens.json")


def test_find_bucket_id(mock_exec):
    """The bucket named after the org is looked up inside that org"""
    mock_exec.side_effect = _influx({"alice": "b1"})
    assert find_bucket_id("alice") == (True, "b1", "")
    command = mock_exec.call_args.args[0]
    assert command[:3] == ["influx", "bucket", "list"]
    assert command[command.index("--name") + 1] == "alice"


def test_find_bucket_id_missing_bucket(mock_exec):
    """A missing bucket is not an error, the org is simply skipped"""
    mock_exec.side_effect = _influx({})
    assert find_bucket_id("alice") == (True, "", "")


def test_find_bucket_id_failure(mock_exec):
    """Any other failure is reported"""
    mock_exec.return_value = (False, "Failed to find bucket alice: refused")
    success, _, error = find_bucket_id("alice")
    assert success is False
    assert "refused" in error


def test_create_read_token_reads_one_bucket_only(mock_exec):
    """The token is created with a read permission on one bucket and no write"""
    mock_exec.side_effect = _influx({"alice": "b1"})
    assert create_read_token("alice", "b1") == (True, f"{TOKEN}-alice", "")
    command = mock_exec.call_args.args[0]
    assert command[command.index("--read-bucket") + 1] == "b1"
    assert not any(arg.startswith("--write") for arg in command)
    assert "--all-access" not in command and "--operator" not in command


def test_create_read_token_without_token_in_answer(mock_exec):
    """An answer with no token is a failure"""
    mock_exec.return_value = (True, json.dumps({"id": "a1"}))
    success, token, error = create_read_token("alice", "b1")
    assert (success, token) == (False, "")
    assert "No token" in error


def test_read_tokens_missing_file(tmp_path):
    """A file that does not exist yet reads as no tokens"""
    assert read_tokens(tmp_path / "none.json") == (True, {}, "")


def test_read_tokens_bad_file_hides_content(tmp_path):
    """A broken file is reported without echoing its content"""
    path = tmp_path / "tokens.json"
    path.write_text(f"{TOKEN} not json", encoding="utf-8")
    success, _, error = read_tokens(path)
    assert success is False
    assert TOKEN not in error


def test_write_signals_tokens(mock_exec, env, mocker, tmp_path):
    """Each user org gets a token, the admin org none, the file is mode 600"""
    mocker.patch(
        f"{MODULE}.get_existing_orgs", return_value=(True, {"dtaas", "alice"}, "")
    )
    mock_exec.side_effect = _influx({"alice": "b1", "dtaas": "b0"})
    path = tmp_path / "secrets" / "influx-tokens.json"
    success, message = write_signals_tokens(path)
    assert success is True
    assert json.loads(path.read_text(encoding="utf-8")) == {"alice": f"{TOKEN}-alice"}
    assert stat.S_IMODE(path.stat().st_mode) == 0o600
    assert TOKEN not in message


def test_write_signals_tokens_keeps_existing(mock_exec, env, mocker, tmp_path):
    """An org already in the file keeps its token and gets no new one"""
    mocker.patch(
        f"{MODULE}.get_existing_orgs", return_value=(True, {"alice", "bob"}, "")
    )
    mock_exec.side_effect = _influx({"alice": "b1", "bob": "b2"})
    path = tmp_path / "influx-tokens.json"
    path.write_text(json.dumps({"alice": "old"}), encoding="utf-8")
    assert write_signals_tokens(path)[0] is True
    tokens = json.loads(path.read_text(encoding="utf-8"))
    assert tokens == {"alice": "old", "bob": f"{TOKEN}-bob"}
    # Bucket lookup, old-token check and creation, all for bob only.
    assert mock_exec.call_count == 3


def test_write_signals_tokens_keeps_tokens_made_before_a_failure(
    mock_exec, env, mocker, tmp_path
):
    """Tokens created before a failure are still written"""
    mocker.patch(
        f"{MODULE}.get_existing_orgs", return_value=(True, {"alice", "bob"}, "")
    )
    answer = _influx({"alice": "b1", "bob": "b2"})
    mock_exec.side_effect = [
        answer(["influx", "bucket", "--org", "alice"], ""),
        answer(["influx", "auth", "list", "--org", "alice"], ""),
        answer(["influx", "auth", "create", "--org", "alice"], ""),
        (False, "Failed to find bucket bob: refused"),
    ]
    path = tmp_path / "influx-tokens.json"
    success, error = write_signals_tokens(path)
    assert success is False
    assert "refused" in error
    assert json.loads(path.read_text(encoding="utf-8")) == {"alice": f"{TOKEN}-alice"}


def test_revoke_old_tokens_deletes_only_gateway_tokens(mock_exec):
    """Only the tokens this module made for the org are deleted"""
    mock_exec.side_effect = _influx({}, auths=[
        {"id": "old1", "description": "dtaas-signals read alice"},
        {"id": "keep", "description": "alice's own token"},
    ])
    assert revoke_old_tokens("alice") == (True, "")
    deleted = [c.args[0] for c in mock_exec.call_args_list if c.args[0][2] == "delete"]
    assert deleted == [["influx", "auth", "delete", "--skip-verify", "--id", "old1"]]


def test_revoke_old_tokens_list_failure(mock_exec):
    """A failed listing stops before a new token is made"""
    mock_exec.return_value = (False, "Failed to list the tokens of org alice: refused")
    success, error = revoke_old_tokens("alice")
    assert success is False
    assert "refused" in error


def test_write_signals_tokens_revokes_orphans_when_file_is_lost(
    mock_exec, env, mocker, tmp_path
):
    """A lost file does not leave the earlier tokens valid in InfluxDB"""
    mocker.patch(f"{MODULE}.get_existing_orgs", return_value=(True, {"alice"}, ""))
    mock_exec.side_effect = _influx(
        {"alice": "b1"}, auths=[{"id": "old1", "description": "dtaas-signals read alice"}]
    )
    assert write_signals_tokens(tmp_path / "influx-tokens.json")[0] is True
    deleted = [c.args[0][-1] for c in mock_exec.call_args_list if c.args[0][2] == "delete"]
    assert deleted == ["old1"]


def test_write_signals_tokens_drops_removed_users(mock_exec, env, mocker, tmp_path):
    """An org that no longer exists leaves the file"""
    mocker.patch(f"{MODULE}.get_existing_orgs", return_value=(True, {"alice"}, ""))
    path = tmp_path / "influx-tokens.json"
    path.write_text(json.dumps({"alice": "a", "bob": "b"}), encoding="utf-8")
    assert write_signals_tokens(path)[0] is True
    assert json.loads(path.read_text(encoding="utf-8")) == {"alice": "a"}
    mock_exec.assert_not_called()


def test_setup_signals_tokens_without_file(env, mocker):
    """Nothing happens when services.env names no tokens file"""
    write = mocker.patch(f"{MODULE}.write_signals_tokens")
    assert setup_signals_tokens() == (True, "")
    write.assert_not_called()


def test_setup_signals_tokens_write_error(env, mocker):
    """A failed write is reported as an error"""
    env["SIGNALS_INFLUX_TOKENS_FILE"] = "/nowhere/influx-tokens.json"
    mocker.patch(f"{MODULE}.write_signals_tokens", side_effect=PermissionError())
    success, error = setup_signals_tokens()
    assert success is False
    assert "PermissionError" in error
