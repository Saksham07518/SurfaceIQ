"""
TLS certificate analyzer — extracts and validates TLS cert details.
"""

import ssl
import socket
from datetime import datetime, timezone
import logging
from cryptography import x509
from cryptography.x509.oid import NameOID

logger = logging.getLogger(__name__)


def analyze_tls(hostname: str, port: int = 443) -> dict | None:
    """
    Connect to hostname:port via TLS and extract certificate information.
    Returns None if TLS connection fails.
    """
    try:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE  # we want to inspect even invalid certs

        with socket.create_connection((hostname, port), timeout=10) as sock:
            with ctx.wrap_socket(sock, server_hostname=hostname) as ssock:
                cert_bin = ssock.getpeercert(binary_form=True)

        if not cert_bin:
            return {"hostname": hostname, "error": "No certificate presented"}

        cert = x509.load_der_x509_certificate(cert_bin)

        # Extract fields using cryptography
        subject_cns = cert.subject.get_attributes_for_oid(NameOID.COMMON_NAME)
        subject_cn = subject_cns[0].value if subject_cns else ""

        issuer_cns = cert.issuer.get_attributes_for_oid(NameOID.COMMON_NAME)
        issuer_cn = issuer_cns[0].value if issuer_cns else ""

        issuer_orgs = cert.issuer.get_attributes_for_oid(NameOID.ORGANIZATION_NAME)
        issuer_org = issuer_orgs[0].value if issuer_orgs else ""

        not_before = cert.not_valid_before_utc
        not_after = cert.not_valid_after_utc
        now = datetime.now(timezone.utc)

        # Subject Alternative Names
        sans = []
        try:
            ext = cert.extensions.get_extension_for_class(x509.SubjectAlternativeName)
            sans = ext.value.get_values_for_type(x509.DNSName)
        except x509.ExtensionNotFound:
            pass

        # Check for issues
        issues = []
        if now > not_after:
            issues.append("expired")
        elif (not_after - now).days < 30:
            issues.append("expiring_soon")

        if subject_cn == issuer_cn and issuer_cn:
            # Self-signed check
            issues.append("self_signed")

        if any(s.startswith("*") for s in sans):
            issues.append("wildcard")

        return {
            "hostname": hostname,
            "subject_cn": subject_cn,
            "issuer_cn": issuer_cn,
            "issuer_org": issuer_org,
            "not_before": not_before.isoformat(),
            "not_after": not_after.isoformat(),
            "days_remaining": (not_after - now).days,
            "sans": sans,
            "serial_number": str(cert.serial_number),
            "version": str(cert.version.name),
            "issues": issues,
        }

    except socket.timeout:
        logger.debug(f"TLS timeout: {hostname}")
    except ConnectionRefusedError:
        logger.debug(f"TLS connection refused: {hostname}")
    except Exception as e:
        logger.debug(f"TLS error for {hostname}: {e}")

    return None

