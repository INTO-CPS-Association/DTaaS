"""Validate a TLS certificate/key pair before putting it into service.

Used by 'dtaas admin update --certs' to refuse a replacement pair that cannot
be parsed, whose private key does not match the certificate, or that has
already expired, so the live certificates are never replaced by a bad pair.
"""

from datetime import datetime, timezone
from pathlib import Path

from cryptography import x509
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.serialization import load_pem_private_key


class CertValidationError(Exception):
    """Raised when a certificate/key pair fails validation."""


def _load_cert(cert_path: Path):
    """Parse the leaf certificate from a PEM file."""
    try:
        return x509.load_pem_x509_certificate(cert_path.read_bytes())
    except (OSError, ValueError) as exc:
        raise CertValidationError(
            f"Could not parse certificate '{cert_path.name}': {exc}"
        ) from exc


def _load_key(key_path: Path):
    """Parse an unencrypted private key from a PEM file."""
    try:
        return load_pem_private_key(key_path.read_bytes(), password=None)
    except (OSError, ValueError, TypeError) as exc:
        raise CertValidationError(
            f"Could not parse private key '{key_path.name}': {exc}"
        ) from exc


def _public_pem(public_key) -> bytes:
    """Serialise a public key to PEM bytes for equality comparison."""
    return public_key.public_bytes(
        serialization.Encoding.PEM,
        serialization.PublicFormat.SubjectPublicKeyInfo,
    )


def _check_key_matches_cert(cert, key) -> None:
    """Raise when the private key does not belong to the certificate."""
    if _public_pem(cert.public_key()) != _public_pem(key.public_key()):
        raise CertValidationError("Private key does not match the certificate.")


def _check_not_expired(cert) -> None:
    """Raise when the certificate's validity period has already ended."""
    if cert.not_valid_after_utc < datetime.now(timezone.utc):
        raise CertValidationError(
            f"Certificate expired on {cert.not_valid_after_utc:%Y-%m-%d}."
        )


def validate_cert_pair(cert_path: Path, key_path: Path) -> None:
    """Validate a fullchain/privkey pair, raising CertValidationError on failure."""
    cert = _load_cert(cert_path)
    key = _load_key(key_path)
    _check_key_matches_cert(cert, key)
    _check_not_expired(cert)
