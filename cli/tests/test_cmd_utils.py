"""Tests for the CLI helper functions in cmd_utils.py."""

from unittest.mock import MagicMock, patch
from src.cmd_utils import (
    VerticalChoicesCommand,
    _find_toml,
    _certs_src,
    provision_user_files,
)


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


def test_provision_user_files_creates_dirs_and_sets_permissions(tmp_path):
    """provision_user_files recreates per-user dirs from toml and fixes ownership."""
    (tmp_path / "dtaas.toml").write_text('[users]\nadd = ["alice"]\n')
    with patch("src.cmd_utils.projectPkg.create_user_dirs") as mock_create, patch(
        "src.cmd_utils.projectPkg.set_files_permissions"
    ) as mock_perms:
        provision_user_files(str(tmp_path))

    mock_create.assert_called_once_with(str(tmp_path), ["alice"])
    mock_perms.assert_called_once_with(str(tmp_path))


def test_provision_user_files_noop_without_toml(tmp_path, monkeypatch):
    """provision_user_files does nothing when no dtaas.toml is present."""
    monkeypatch.chdir(tmp_path)  # no dtaas.toml in output dir or cwd
    with patch("src.cmd_utils.projectPkg.create_user_dirs") as mock_create, patch(
        "src.cmd_utils.projectPkg.set_files_permissions"
    ) as mock_perms:
        provision_user_files(str(tmp_path))

    mock_create.assert_not_called()
    mock_perms.assert_not_called()
