"""Tests for the certs module (TLS certificate placement)."""

import os
from unittest.mock import patch
from src.pkg.certs import copy_certs, find_latest_cert, secure_private_key


def _make_cert_src(src, files):
    """Create a source cert dir with the given {name: text} files."""
    src.mkdir(parents=True, exist_ok=True)
    for name, text in files.items():
        (src / name).write_text(text)


def test_find_latest_cert_picks_newest_numbered(tmp_path):
    """find_latest_cert returns the newest fullchain<N>.pem by mtime."""
    src = tmp_path / "archive"
    _make_cert_src(src, {"fullchain1.pem": "old", "fullchain2.pem": "new"})
    os.utime(src / "fullchain1.pem", (1, 1))
    os.utime(src / "fullchain2.pem", (2, 2))

    latest = find_latest_cert(src, "fullchain")

    assert latest == src / "fullchain2.pem"


def test_find_latest_cert_ignores_unrelated_names(tmp_path):
    """Files like fullchain-service.pem are not treated as candidates."""
    src = tmp_path / "archive"
    _make_cert_src(src, {"fullchain-service.pem": "x"})

    assert find_latest_cert(src, "fullchain") is None


def test_copy_certs_skips_non_tls_deploy(tmp_path):
    """copy_certs is a no-op (returns None) for non-TLS deploy types."""
    assert copy_certs("localhost", str(tmp_path), str(tmp_path)) is None


def test_copy_certs_notes_when_no_source(tmp_path):
    """A TLS deploy with no certs-src returns an informative note, copies nothing."""
    note = copy_certs("secure-server", str(tmp_path), "")

    assert note is not None and "certs-src not set" in note
    assert not (tmp_path / "certs").exists()


def test_copy_certs_notes_when_source_missing(tmp_path):
    """A non-existent certs-src directory yields a note without raising."""
    note = copy_certs("secure-server", str(tmp_path), str(tmp_path / "nope"))

    assert note is not None and "not found" in note


def test_copy_certs_copies_latest_pair(tmp_path):
    """The latest fullchain/privkey are copied into certs/."""
    src = tmp_path / "archive"
    _make_cert_src(
        src,
        {
            "fullchain1.pem": "fc-old",
            "fullchain2.pem": "fc-new",
            "privkey1.pem": "pk-old",
            "privkey2.pem": "pk-new",
        },
    )
    for name, when in [("1.pem", 1), ("2.pem", 2)]:
        os.utime(src / f"fullchain{name}", (when, when))
        os.utime(src / f"privkey{name}", (when, when))
    dest = tmp_path / "install"

    note = copy_certs("secure-server", str(dest), str(src))

    assert (dest / "certs" / "fullchain.pem").read_text() == "fc-new"
    assert (dest / "certs" / "privkey.pem").read_text() == "pk-new"
    assert note is not None and "copied" in note


def test_copy_certs_sets_private_key_permissions(tmp_path):
    """The copied private key is chmod-ed to 0600 (POSIX only)."""
    src = tmp_path / "archive"
    _make_cert_src(src, {"fullchain.pem": "fc", "privkey.pem": "pk"})
    dest = tmp_path / "install"

    copy_certs("secure-server", str(dest), str(src))

    key = dest / "certs" / "privkey.pem"
    assert key.exists()
    if os.name == "posix":
        assert (key.stat().st_mode & 0o777) == 0o600


def test_copy_certs_skips_existing_without_force(tmp_path):
    """Existing certs are preserved unless force is set."""
    src = tmp_path / "archive"
    _make_cert_src(src, {"fullchain.pem": "fc-new", "privkey.pem": "pk-new"})
    dest = tmp_path / "install"
    certs = dest / "certs"
    certs.mkdir(parents=True)
    (certs / "fullchain.pem").write_text("fc-old")
    (certs / "privkey.pem").write_text("pk-old")

    copy_certs("secure-server", str(dest), str(src), force=False)

    assert (certs / "fullchain.pem").read_text() == "fc-old"


def test_copy_certs_overwrites_with_force(tmp_path):
    """Existing certs are replaced when force is True."""
    src = tmp_path / "archive"
    _make_cert_src(src, {"fullchain.pem": "fc-new", "privkey.pem": "pk-new"})
    dest = tmp_path / "install"
    certs = dest / "certs"
    certs.mkdir(parents=True)
    (certs / "fullchain.pem").write_text("fc-old")

    copy_certs("secure-server", str(dest), str(src), force=True)

    assert (certs / "fullchain.pem").read_text() == "fc-new"


def test_secure_private_key_skips_missing_file(tmp_path):
    """secure_private_key is a no-op when the key file does not exist."""
    secure_private_key(tmp_path / "privkey.pem")  # must not raise


def test_secure_private_key_swallows_oserror(tmp_path):
    """secure_private_key silently ignores a chmod OSError."""
    key = tmp_path / "privkey.pem"
    key.write_text("pk")
    with patch.object(type(key), "chmod", side_effect=OSError("permission denied")):
        secure_private_key(key)  # must not raise


def test_copy_certs_notes_partial_source(tmp_path):
    """A note is emitted when only one cert is found in the source directory."""
    src = tmp_path / "archive"
    _make_cert_src(src, {"fullchain.pem": "fc"})  # privkey.pem absent
    dest = tmp_path / "install"

    note = copy_certs("secure-server", str(dest), str(src))

    assert note is not None and "privkey.pem" in note
    assert (dest / "certs" / "fullchain.pem").exists()
    assert not (dest / "certs" / "privkey.pem").exists()
