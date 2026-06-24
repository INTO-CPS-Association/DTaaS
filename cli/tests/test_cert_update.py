"""Tests for cert_update ('dtaas admin update --certs' orchestration).

Certificate validation and the Traefik reload are mocked here so these tests
focus on staging, the atomic swap, permissions, and the fail-safe behaviour.
The real validation logic is covered by test_cert_validate.py.
"""

import os
from unittest.mock import patch

import pytest
from src.pkg import cert_update
from src.pkg.cert_validate import CertValidationError
# pylint: disable=protected-access


def _make_source(src):
    """Create a certs-src directory holding a dummy fullchain/privkey pair."""
    src.mkdir(parents=True, exist_ok=True)
    (src / "fullchain.pem").write_text("fc")
    (src / "privkey.pem").write_text("pk")


def _write_toml(out_dir, certs_src):
    """Write a dtaas.toml in *out_dir* whose certs-src points at *certs_src*."""
    (out_dir / "dtaas.toml").write_text(
        f"[common.security]\ncerts-src = '{certs_src}'\n"
    )


def _setup(tmp_path):
    """Build an installed deployment plus a populated certs-src; return both."""
    out = tmp_path / "install"
    out.mkdir()
    (out / "docker-compose.yml").write_text("services: {}")
    src = tmp_path / "src"
    _make_source(src)
    _write_toml(out, str(src))
    return out, src


def _seed_live_certs(out):
    """Place existing (old) certificates in the deployment's certs/ directory."""
    live = out / "certs"
    live.mkdir(parents=True, exist_ok=True)
    (live / "fullchain.pem").write_text("OLD")
    (live / "privkey.pem").write_text("OLDKEY")
    return live


def test_update_certs_success(tmp_path):
    """The newest pair is copied in, traefik reloaded, and no staging is left."""
    out, _ = _setup(tmp_path)
    with patch("src.pkg.cert_update.validate_cert_pair"), patch(
        "src.pkg.cert_update.deploy.restart_service"
    ) as mock_restart:
        message = cert_update.update_certs(str(out))

    assert (out / "certs" / "fullchain.pem").read_text() == "fc"
    assert (out / "certs" / "privkey.pem").read_text() == "pk"
    assert not list((out / "certs").glob("*.new"))
    assert "updated" in message
    mock_restart.assert_called_once_with(str(out), "traefik")


def test_update_certs_sets_key_permissions(tmp_path):
    """The activated private key is restricted to 0600 (POSIX only)."""
    out, _ = _setup(tmp_path)
    with patch("src.pkg.cert_update.validate_cert_pair"), patch(
        "src.pkg.cert_update.deploy.restart_service"
    ):
        cert_update.update_certs(str(out))

    key = out / "certs" / "privkey.pem"
    if os.name == "posix":
        assert (key.stat().st_mode & 0o777) == 0o600


def test_update_certs_is_repeatable(tmp_path):
    """Running the update twice is safe and leaves the newest certs in place."""
    out, _ = _setup(tmp_path)
    with patch("src.pkg.cert_update.validate_cert_pair"), patch(
        "src.pkg.cert_update.deploy.restart_service"
    ):
        cert_update.update_certs(str(out))
        cert_update.update_certs(str(out))

    assert (out / "certs" / "fullchain.pem").read_text() == "fc"


def test_update_certs_requires_compose_file(tmp_path):
    """Without a generated deployment the update fails before touching certs."""
    out = tmp_path / "install"
    out.mkdir()
    _write_toml(out, str(tmp_path / "src"))
    with patch("src.pkg.cert_update.deploy.restart_service") as mock_restart:
        with pytest.raises(OSError, match="docker-compose.yml"):
            cert_update.update_certs(str(out))
        mock_restart.assert_not_called()


def test_update_certs_requires_certs_src(tmp_path):
    """A dtaas.toml without certs-src yields a clear error and no reload."""
    out = tmp_path / "install"
    out.mkdir()
    (out / "docker-compose.yml").write_text("services: {}")
    (out / "dtaas.toml").write_text("[common]\nserver-dns = 'localhost'\n")
    with patch("src.pkg.cert_update.deploy.restart_service") as mock_restart:
        with pytest.raises(OSError, match="certs-src"):
            cert_update.update_certs(str(out))
        mock_restart.assert_not_called()


def test_update_certs_missing_source_file_leaves_live_certs(tmp_path):
    """A certs-src missing privkey.pem leaves the live pair untouched."""
    out, src = _setup(tmp_path)
    (src / "privkey.pem").unlink()
    live = _seed_live_certs(out)
    with patch("src.pkg.cert_update.deploy.restart_service") as mock_restart:
        with pytest.raises(OSError, match="privkey.pem"):
            cert_update.update_certs(str(out))
        mock_restart.assert_not_called()

    assert (live / "fullchain.pem").read_text() == "OLD"
    assert (live / "privkey.pem").read_text() == "OLDKEY"
    assert not list(live.glob("*.new"))


def test_update_certs_invalid_pair_leaves_live_certs(tmp_path):
    """A pair that fails validation never replaces the live certificates."""
    out, _ = _setup(tmp_path)
    live = _seed_live_certs(out)
    with patch(
        "src.pkg.cert_update.validate_cert_pair",
        side_effect=CertValidationError("expired"),
    ), patch("src.pkg.cert_update.deploy.restart_service") as mock_restart:
        with pytest.raises(CertValidationError, match="expired"):
            cert_update.update_certs(str(out))
        mock_restart.assert_not_called()

    assert (live / "fullchain.pem").read_text() == "OLD"
    assert (live / "privkey.pem").read_text() == "OLDKEY"
    assert not list(live.glob("*.new"))


def test_stage_pair_discards_partial_on_missing(tmp_path):
    """_stage_pair removes an already-staged file when its partner is absent."""
    src = tmp_path / "src"
    src.mkdir()
    (src / "fullchain.pem").write_text("fc")  # privkey.pem absent
    certs_dir = tmp_path / "certs"
    certs_dir.mkdir()

    with pytest.raises(OSError, match="privkey.pem"):
        cert_update._stage_pair(src, certs_dir)

    assert not list(certs_dir.glob("*.new"))
