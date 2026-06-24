"""Tests for cert_validate (TLS certificate/key pair validation)."""

from datetime import datetime, timedelta, timezone

import pytest
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec

from src.pkg.cert_validate import validate_cert_pair, CertValidationError


def _self_signed(key, not_after):
    """Build a self-signed certificate for *key* expiring at *not_after*."""
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "localhost")])
    return (
        x509.CertificateBuilder()
        .subject_name(name)
        .issuer_name(name)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(datetime(2020, 1, 1, tzinfo=timezone.utc))
        .not_valid_after(not_after)
        .sign(key, hashes.SHA256())
    )


def _write_pair(directory, cert, key):
    """Write *cert* and *key* as fullchain.pem/privkey.pem, returning their paths."""
    cert_path = directory / "fullchain.pem"
    key_path = directory / "privkey.pem"
    cert_path.write_bytes(cert.public_bytes(serialization.Encoding.PEM))
    key_path.write_bytes(
        key.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.TraditionalOpenSSL,
            serialization.NoEncryption(),
        )
    )
    return cert_path, key_path


def _valid_until(days):
    """Return a UTC datetime *days* from now."""
    return datetime.now(timezone.utc) + timedelta(days=days)


def test_validate_accepts_matching_unexpired_pair(tmp_path):
    """A matching, unexpired cert/key pair validates without raising."""
    key = ec.generate_private_key(ec.SECP256R1())
    cert_path, key_path = _write_pair(
        tmp_path, _self_signed(key, _valid_until(30)), key
    )

    validate_cert_pair(cert_path, key_path)  # must not raise


def test_validate_rejects_mismatched_key(tmp_path):
    """A private key that does not belong to the certificate is rejected."""
    cert_key = ec.generate_private_key(ec.SECP256R1())
    other_key = ec.generate_private_key(ec.SECP256R1())
    cert_path, key_path = _write_pair(
        tmp_path, _self_signed(cert_key, _valid_until(30)), other_key
    )

    with pytest.raises(CertValidationError, match="does not match"):
        validate_cert_pair(cert_path, key_path)


def test_validate_rejects_expired_cert(tmp_path):
    """An already-expired certificate is rejected."""
    key = ec.generate_private_key(ec.SECP256R1())
    cert_path, key_path = _write_pair(
        tmp_path, _self_signed(key, _valid_until(-1)), key
    )

    with pytest.raises(CertValidationError, match="expired"):
        validate_cert_pair(cert_path, key_path)


def test_validate_rejects_unparseable_cert(tmp_path):
    """A certificate file that is not valid PEM is rejected."""
    key = ec.generate_private_key(ec.SECP256R1())
    _, key_path = _write_pair(tmp_path, _self_signed(key, _valid_until(30)), key)
    bad_cert = tmp_path / "fullchain.pem"
    bad_cert.write_text("not a certificate")

    with pytest.raises(CertValidationError, match="parse certificate"):
        validate_cert_pair(bad_cert, key_path)


def test_validate_rejects_unparseable_key(tmp_path):
    """A private-key file that is not valid PEM is rejected."""
    key = ec.generate_private_key(ec.SECP256R1())
    cert_path, _ = _write_pair(tmp_path, _self_signed(key, _valid_until(30)), key)
    bad_key = tmp_path / "privkey.pem"
    bad_key.write_text("not a key")

    with pytest.raises(CertValidationError, match="parse private key"):
        validate_cert_pair(cert_path, bad_key)
