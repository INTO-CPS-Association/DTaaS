"""Tests for cert_update ('dtaas admin update --certs' orchestration).

Certificate validation and the Traefik reload are mocked here so these tests
focus on staging, the atomic swap, permissions, and the fail-safe behaviour.
The real validation logic is covered by test_cert_validate.py.
"""

import os
from contextlib import contextmanager
from unittest.mock import patch

import pytest
from src.pkg import cert_update
from src.pkg.cert_validate import CertValidationError
# pylint: disable=protected-access


@contextmanager
def _mock_docker():
    """Patch the Traefik stop/restart/liveness calls used while activating certs."""
    with patch("src.pkg.cert_update.deploy.stop_service") as stop, patch(
        "src.pkg.cert_update.deploy.restart_service"
    ) as restart, patch(
        "src.pkg.cert_update.deploy.service_running", return_value=True
    ) as running:
        yield {"stop": stop, "restart": restart, "running": running}


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
    with patch("src.pkg.cert_update.validate_cert_pair"), _mock_docker() as docker:
        message = cert_update.update_certs(str(out))

    assert (out / "certs" / "fullchain.pem").read_text() == "fc"
    assert (out / "certs" / "privkey.pem").read_text() == "pk"
    assert not list((out / "certs").glob("*.new"))
    assert not list((out / "certs").glob("*.bak"))
    assert "updated" in message
    docker["stop"].assert_called_once_with(str(out), "traefik")
    docker["restart"].assert_called_once_with(str(out), "traefik")


def test_update_certs_sets_key_permissions(tmp_path):
    """The activated private key is restricted to 0600 (POSIX only)."""
    out, _ = _setup(tmp_path)
    with patch("src.pkg.cert_update.validate_cert_pair"), _mock_docker():
        cert_update.update_certs(str(out))

    key = out / "certs" / "privkey.pem"
    if os.name == "posix":
        assert (key.stat().st_mode & 0o777) == 0o600


def test_update_certs_is_repeatable(tmp_path):
    """Running the update twice is safe and leaves the newest certs in place."""
    out, _ = _setup(tmp_path)
    with patch("src.pkg.cert_update.validate_cert_pair"), _mock_docker():
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


def test_stage_one_copies_latest(tmp_path):
    """_stage_one stages a present certificate into a .new file."""
    src = tmp_path / "src"
    src.mkdir()
    (src / "fullchain.pem").write_text("fc")
    certs_dir = tmp_path / "certs"
    certs_dir.mkdir()

    dest = cert_update._stage_one("fullchain.pem", src, certs_dir)

    assert dest == certs_dir / ("fullchain.pem" + cert_update.STAGE_SUFFIX)
    assert dest.read_text() == "fc"


def test_stage_one_raises_when_missing(tmp_path):
    """_stage_one raises OSError when the certificate is absent from source."""
    src = tmp_path / "src"
    src.mkdir()
    certs_dir = tmp_path / "certs"
    certs_dir.mkdir()

    with pytest.raises(OSError, match="fullchain.pem"):
        cert_update._stage_one("fullchain.pem", src, certs_dir)


def test_update_certs_raises_when_traefik_stays_down(tmp_path):
    """If traefik never reports running, the update raises instead of succeeding."""
    out, _ = _setup(tmp_path)
    with patch("src.pkg.cert_update.validate_cert_pair"), patch(
        "src.pkg.cert_update.deploy.stop_service"
    ), patch("src.pkg.cert_update.deploy.restart_service"), patch(
        "src.pkg.cert_update.deploy.service_running", return_value=False
    ), patch("src.pkg.cert_update.time.sleep"):
        with pytest.raises(RuntimeError, match="not running"):
            cert_update.update_certs(str(out))


def test_update_certs_rolls_back_on_partial_swap(tmp_path):
    """A failed second replace restores the old pair and still restarts traefik."""
    out, _ = _setup(tmp_path)
    live = _seed_live_certs(out)
    real_replace = os.replace

    def flaky_replace(src, dst):
        if str(src).endswith("privkey.pem" + cert_update.STAGE_SUFFIX):
            raise PermissionError("file is locked")
        return real_replace(src, dst)

    with patch(
        "src.pkg.cert_update.validate_cert_pair"
    ), _mock_docker() as docker, patch(
        "src.pkg.cert_update.os.replace", side_effect=flaky_replace
    ):
        with pytest.raises(PermissionError):
            cert_update.update_certs(str(out))

    assert (live / "fullchain.pem").read_text() == "OLD"
    assert (live / "privkey.pem").read_text() == "OLDKEY"
    assert not list(live.glob("*.new"))
    assert not list(live.glob("*.bak"))
    docker["restart"].assert_called_once_with(str(out), "traefik")


def test_update_certs_first_time_partial_swap_leaves_no_mismatch(tmp_path):
    """A failed second replace on a first-time install leaves no half-written pair."""
    out, _ = _setup(tmp_path)  # no live certs seeded: first-time install
    certs = out / "certs"
    real_replace = os.replace

    def flaky_replace(src, dst):
        if str(src).endswith("privkey.pem" + cert_update.STAGE_SUFFIX):
            raise PermissionError("file is locked")
        return real_replace(src, dst)

    with patch("src.pkg.cert_update.validate_cert_pair"), _mock_docker(), patch(
        "src.pkg.cert_update.os.replace", side_effect=flaky_replace
    ):
        with pytest.raises(PermissionError):
            cert_update.update_certs(str(out))

    # The first file must be rolled back too: neither cert is left in place.
    assert not (certs / "fullchain.pem").exists()
    assert not (certs / "privkey.pem").exists()
    assert not list(certs.glob("*.new"))
    assert not list(certs.glob("*.bak"))


def test_update_certs_rolls_back_when_traefik_rejects_new_certs(tmp_path):
    """If Traefik fails liveness on the new pair, the old pair is restored."""
    out, _ = _setup(tmp_path)
    live = _seed_live_certs(out)
    with patch("src.pkg.cert_update.validate_cert_pair"), patch(
        "src.pkg.cert_update.deploy.stop_service"
    ), patch("src.pkg.cert_update.deploy.restart_service") as restart, patch(
        "src.pkg.cert_update.deploy.service_running", return_value=False
    ), patch("src.pkg.cert_update.time.sleep"):
        with pytest.raises(RuntimeError, match="not running"):
            cert_update.update_certs(str(out))

    assert (live / "fullchain.pem").read_text() == "OLD"
    assert (live / "privkey.pem").read_text() == "OLDKEY"
    assert not list(live.glob("*.new"))
    assert not list(live.glob("*.bak"))
    # Restarted once for the new pair, then again after rolling the old pair back.
    assert restart.call_count == 2
