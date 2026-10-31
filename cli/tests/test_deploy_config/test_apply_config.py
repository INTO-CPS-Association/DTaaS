"""Tests for deploy_config.apply_config and its read-only preview, diff_specs."""

import shutil
from pathlib import Path
from unittest.mock import patch

import pytest
from src.pkg.deploy_config import apply_config, build_file_specs, diff_specs
from src.pkg.project import DEPLOY_TEMPLATES_DIR


ENV_TEXT = (
    "# Server Configuration\n"
    "SERVER_DNS=localhost\n"
    "\n"
    "# OAuth Application Client ID\n"
    "OAUTH_CLIENT_ID=your_client_id_here\n"
)

JS_TEXT = (
    "if (typeof window !== 'undefined') {\n"
    "  window.env = {\n"
    "    REACT_APP_CLIENT_ID: 'your_client_id_here',\n"
    "    REACT_APP_AUTH_AUTHORITY: 'https://gitlab.com',\n"
    "  };\n"
    "};\n"
)


def test_apply_config_chmods_secret_file_when_content_changes(tmp_path):
    """A secret-named file (config/.env) is chmod'd 0600 when its content changes.

    Windows chmod() can't be asserted via the resulting st_mode (it only tracks
    the read-only attribute, so 0o600 and 0o644 read back identically) -- so
    this asserts the call itself, which is the portable signal.
    """
    config_dir = tmp_path / "config"
    config_dir.mkdir()
    (config_dir / ".env").write_text(ENV_TEXT)

    with patch.object(Path, "chmod") as mock_chmod:
        apply_config(
            str(tmp_path), [("config/.env", "env", {"SERVER_DNS": "myserver.com"})]
        )
    mock_chmod.assert_called_once_with(0o600)


def test_apply_config_chmods_secret_file_even_when_content_is_unchanged(tmp_path):
    """An existing config/.env from before this hardening was added is still
    chmod'd 0600 even on a run that changes nothing -- the population this
    protects is exactly the deployments that already have a live secret file
    sitting at the old, world-readable mode."""
    config_dir = tmp_path / "config"
    config_dir.mkdir()
    (config_dir / ".env").write_text("SERVER_DNS=myserver.com\n")

    with patch.object(Path, "chmod") as mock_chmod:
        apply_config(
            str(tmp_path), [("config/.env", "env", {"SERVER_DNS": "myserver.com"})]
        )
    mock_chmod.assert_called_once_with(0o600)


def test_apply_config_does_not_chmod_non_secret_files(tmp_path):
    """A file outside the secret-filename allowlist (e.g. tls.yml) is left alone."""
    (tmp_path / "tls.yml").write_text("issuer: http://old\n")

    with patch.object(Path, "chmod") as mock_chmod:
        apply_config(str(tmp_path), [("tls.yml", "yaml", {"issuer": "http://new"})])
    mock_chmod.assert_not_called()


def test_apply_config_edits_files_by_key(tmp_path):
    """apply_config edits the targeted keys in each config file"""
    config_dir = tmp_path / "config"
    config_dir.mkdir()
    (config_dir / ".env").write_text(ENV_TEXT)
    (config_dir / "client.js").write_text(JS_TEXT)

    apply_config(
        str(tmp_path),
        [
            ("config/.env", "env", {"SERVER_DNS": "myserver.com"}),
            ("config/client.js", "js", {"REACT_APP_CLIENT_ID": "real_id"}),
        ],
    )

    assert "SERVER_DNS=myserver.com" in (config_dir / ".env").read_text()
    client_js = (config_dir / "client.js").read_text()
    assert "REACT_APP_CLIENT_ID: 'real_id'" in client_js


@pytest.mark.parametrize(
    "frontend,line",
    [
        ({}, "LOGGER_URL: '{scheme}://myserver.com/logger',"),
        ({"logger-url": ""}, "LOGGER_URL: '',"),
    ],
    ids=["default", "off"],
)
def test_apply_config_sets_logger_url_in_shipped_client_js(
    tmp_path, server_type, frontend, line
):
    """The shipped client.js loses the intocps.org logger: it gets this
    installation's logger, or an empty LOGGER_URL with logger-url empty."""
    deploy_type, scheme = server_type
    client_js = tmp_path / "config" / "client.js"
    client_js.parent.mkdir()
    template = DEPLOY_TEMPLATES_DIR / deploy_type / "config" / "client.js.example"
    shutil.copy(template, client_js)
    toml = {"common": {"server-dns": "myserver.com"}, "frontend": frontend}

    apply_config(str(tmp_path), build_file_specs(deploy_type, toml))

    text = client_js.read_text(encoding="utf-8")
    assert line.format(scheme=scheme) in text
    assert "intocps.org/logger" not in text


def test_apply_config_skips_missing_files(tmp_path):
    """specs for files absent from dest_dir are skipped silently"""
    apply_config(str(tmp_path), [("config/.env", "env", {"KEY": "value"})])


def test_apply_config_raises_on_file_error(tmp_path):
    """write failures are collected and raised as OSError"""
    bad = tmp_path / ".env"
    bad.write_text("SERVER_DNS=localhost\n")
    dest = str(tmp_path)
    specs = [(".env", "env", {"SERVER_DNS": "x"})]
    with patch.object(Path, "write_text", side_effect=OSError("permission denied")):
        with pytest.raises(OSError):
            apply_config(dest, specs)


def test_apply_config_skips_binary_file(tmp_path):
    """apply_config leaves binary files (NUL-byte detected) untouched"""
    binary = tmp_path / ".env"
    binary.write_bytes(b"SERVER_DNS=\x00value\n")
    original = binary.read_bytes()
    apply_config(str(tmp_path), [(".env", "env", {"SERVER_DNS": "x"})])
    assert binary.read_bytes() == original


def test_diff_specs_reports_only_changed_files(tmp_path):
    """diff_specs lists files a spec would change and omits no-op specs."""
    config_dir = tmp_path / "config"
    config_dir.mkdir()
    (config_dir / ".env").write_text(ENV_TEXT)
    (config_dir / "client.js").write_text(JS_TEXT)

    changed = diff_specs(
        str(tmp_path),
        [
            ("config/.env", "env", {"SERVER_DNS": "myserver.com"}),  # changes
            ("config/client.js", "js", {"REACT_APP_CLIENT_ID": "your_client_id_here"}),
        ],
    )
    assert changed == ["config/.env"]


def test_diff_specs_does_not_write(tmp_path):
    """diff_specs is read-only: it never edits the file it inspects."""
    env = tmp_path / ".env"
    env.write_text("SERVER_DNS=localhost\n")
    before = env.read_text()
    diff_specs(str(tmp_path), [(".env", "env", {"SERVER_DNS": "changed.com"})])
    assert env.read_text() == before


def test_diff_specs_skips_missing_files(tmp_path):
    """A spec for a file absent from dest_dir counts as unchanged."""
    assert not diff_specs(str(tmp_path), [("config/.env", "env", {"K": "v"})])
