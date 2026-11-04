"""Tests for deploy_config.check_placeholders."""

from src.pkg.deploy_config import check_placeholders


def test_check_placeholders_returns_warning_for_unresolved(tmp_path):
    """check_placeholders warns when a known secret placeholder remains in a file"""
    env = tmp_path / "config" / ".env"
    env.parent.mkdir()
    env.write_text("OAUTH_CLIENT_ID=your_client_id_here\n")

    warnings = check_placeholders(
        str(tmp_path),
        [("config/.env", "env", {"OAUTH_CLIENT_ID": "real_id"})],
    )
    assert any("your_client_id_here" in w for w in warnings)


def test_check_placeholders_ignores_placeholder_substring(tmp_path):
    """A real value that merely contains a placeholder substring is not flagged."""
    env = tmp_path / "config" / ".env"
    env.parent.mkdir()
    env.write_text("KEYCLOAK_ADMIN_PASSWORD=changemed\n")  # NOSONAR

    warnings = check_placeholders(
        str(tmp_path),
        [("config/.env", "env", {"KEYCLOAK_ADMIN_PASSWORD": "changemed"})],  # NOSONAR
    )
    assert not warnings


def test_check_placeholders_skips_missing_files(tmp_path):
    """check_placeholders ignores files that don't exist in dest_dir"""
    warnings = check_placeholders(
        str(tmp_path),
        [("config/.env", "env", {})],
    )
    assert not warnings
