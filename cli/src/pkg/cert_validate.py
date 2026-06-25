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


def _load_chain(cert_path: Path):
    """Parse the full certificate chain (leaf first) from a PEM file.

    A Let's Encrypt fullchain.pem holds the leaf plus one or more
    intermediates; all of them are returned so each can be checked.
    """
    try:
        chain = x509.load_pem_x509_certificates(cert_path.read_bytes())
    except (OSError, ValueError) as exc:
        raise CertValidationError(
            f"Could not parse certificate '{cert_path.name}': {exc}"
        ) from exc
    if not chain:
        raise CertValidationError(f"No certificate found in '{cert_path.name}'.")
    return chain


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


def _check_chain_not_expired(chain) -> None:
    """Raise when the leaf or any intermediate certificate has expired.

    An expired intermediate still makes Traefik present an invalid chain to
    browsers, so the whole chain is checked, not just the leaf.
    """
    now = datetime.now(timezone.utc)
    for cert in chain:
        if cert.not_valid_after_utc < now:
            raise CertValidationError(
                f"A certificate in the chain expired on "
                f"{cert.not_valid_after_utc:%Y-%m-%d}."
            )


def validate_cert_pair(cert_path: Path, key_path: Path) -> None:
    """Validate a fullchain/privkey pair, raising CertValidationError on failure.

    Confirms the chain parses, the private key matches the leaf certificate,
    and neither the leaf nor any intermediate has already expired.
    """
    chain = _load_chain(cert_path)
    key = _load_key(key_path)
    _check_key_matches_cert(chain[0], key)
    _check_chain_not_expired(chain)
