"""Tests for files.py."""

import stat

import files


def test_set_env_value_replaces_and_appends():
    """Values are replaced in place, appended if missing, and not regex-expanded."""
    text = "A=1\nB=2\n"
    assert files.set_env_value(text, "B", "x") == "A=1\nB=x\n"
    assert files.set_env_value(text, "C", "3") == "A=1\nB=2\nC=3\n"
    assert files.set_env_value("A=1", "A", r"a\1") == r"A=a\1"


def test_update_env_file_sets_all_values(tmp_path):
    """Every value lands in the file; other lines stay."""
    env = tmp_path / ".env"
    env.write_text("KEEP=1\nA=old\n", encoding="utf-8")
    files.update_env_file(env, {"A": "new", "B": "2"})
    assert env.read_text(encoding="utf-8") == "KEEP=1\nA=new\nB=2\n"


def test_write_private_tightens_existing_file(tmp_path):
    """An existing file loses wider permissions before it is written."""
    path = tmp_path / "secret"
    path.write_text("old", encoding="utf-8")
    path.chmod(0o644)
    files.write_private(path, "new")
    assert stat.S_IMODE(path.stat().st_mode) == 0o600
    assert path.read_text(encoding="utf-8") == "new"
