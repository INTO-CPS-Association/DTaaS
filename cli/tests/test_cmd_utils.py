"""Tests for the CLI helper functions in cmd_utils.py."""

from unittest.mock import MagicMock
from src.cmd_utils import VerticalChoicesCommand, _find_toml, _certs_src


def test_param_rows_skips_hidden_param():
    """_param_rows returns no rows for a param with no help record (hidden)."""
    param = MagicMock()
    param.get_help_record.return_value = None

    rows = VerticalChoicesCommand._param_rows(param, ctx=None)  # pylint: disable=protected-access
    assert not rows


def test_find_toml_prefers_output_dir(tmp_path):
    """_find_toml returns the output_dir copy when present."""
    toml = tmp_path / "dtaas.toml"
    toml.write_text("x = 1")

    assert _find_toml(str(tmp_path)) == toml


def test_find_toml_returns_none_when_absent(tmp_path, monkeypatch):
    """_find_toml returns None when no dtaas.toml exists in either location."""
    empty = tmp_path / "empty"
    empty.mkdir()
    monkeypatch.chdir(empty)  # cwd has no dtaas.toml either

    assert _find_toml(str(empty)) is None


def test_certs_src_handles_missing_section():
    """_certs_src returns '' when common.security is absent or malformed."""
    assert _certs_src({}) == ""
    assert _certs_src({"common": {"security": "oops"}}) == ""
    assert _certs_src({"common": {"security": {"certs-src": " /x "}}}) == "/x"
