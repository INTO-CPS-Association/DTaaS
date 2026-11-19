"""Tests for collect_errors, require_valid and validate_config as a whole."""

import pytest
from src.pkg.config_validate import collect_errors, require_valid, validate_config
from src.pkg.project import generate_config


def test_valid_config_has_no_errors(base):
    """A fully populated, correct config produces no problems."""
    assert collect_errors(base) == []


def test_require_valid_raises_with_field_messages():
    """require_valid surfaces every dtaas.toml problem as a field-level message."""
    with pytest.raises(ValueError) as exc:
        require_valid({"common": {}}, "secure-server")
    message = str(exc.value)
    assert message.startswith("Invalid dtaas.toml:\n- ")
    assert "git-repo is missing" in message
    assert "common.server-dns is missing" in message


def test_require_valid_accepts_a_valid_config(base):
    """A valid config passes; a leftover section of another type is ignored."""
    base["workspace-secure-server"] = {"keycloak-issuer-url": "not a url"}
    require_valid(base, "secure-server")


def test_non_dict_sections_report_missing_keys():
    """A malformed (non-dict) section is treated as having no keys."""
    errors = collect_errors({"common": "oops", "users": "oops"})
    assert "common.server-dns is missing" in errors
    assert "common.path is missing" in errors


def test_validate_config_missing_file(tmp_path, monkeypatch):
    """validate_config raises FileNotFoundError when no dtaas.toml exists."""
    monkeypatch.chdir(tmp_path)  # neither output_dir nor cwd has the file
    output_dir = str(tmp_path)
    with pytest.raises(FileNotFoundError, match="dtaas.toml not found"):
        validate_config(output_dir)


def test_validate_config_parse_error(tmp_path):
    """validate_config raises ValueError when the file cannot be parsed."""
    (tmp_path / "dtaas.toml").write_text("key = = =")
    output_dir = str(tmp_path)
    with pytest.raises(ValueError):
        validate_config(output_dir)


def test_validate_config_returns_empty_for_valid_file(tmp_path):
    """A real dtaas.toml whose path/certs-src exist validates clean end to end."""
    existing = str(tmp_path).replace("\\", "/")  # forward slashes are TOML-safe
    (tmp_path / "dtaas.toml").write_text(
        'git-repo="https://github.com/into-cps-association/DTaaS.git"\n'
        "[common]\n"
        'server-dns="localhost"\n'
        f'path="{existing}"\n'
        "[common.security]\n"
        f"certs-src='{existing}'\n"
        "[common.resources]\n"
        "cpus=4\npids_limit=4960\n"
        'mem_limit="4G"\nshm_size="512m"\n'
        "[[users]]\n"
        'username="u1"\n'
        'email="u1@intocps.org"\n'
    )
    assert validate_config(str(tmp_path)) == ([], [])


def test_validate_config_flags_placeholder_path(tmp_path):
    """The shipped template's placeholder path does not exist, so it is flagged."""
    generate_config(str(tmp_path))
    errors, _ = validate_config(str(tmp_path))
    assert any(e.startswith("common.path") for e in errors)


def test_validate_config_warns_template_logger_url(tmp_path):
    """The shipped template's logger-url is a valid URL, but only an example,
    so validate warns until the admin sets their own or empties it."""
    generate_config(str(tmp_path))
    errors, warnings = validate_config(str(tmp_path))
    assert not [e for e in errors if e.startswith("frontend.")]
    assert [w.splitlines()[0] for w in warnings] == [
        "Warning: frontend.logger-url is the template example"
    ]
