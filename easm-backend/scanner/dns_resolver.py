"""
DNS resolver — resolves hostnames to IP addresses.
"""

import dns.resolver
import logging

logger = logging.getLogger(__name__)


def resolve_hostname(hostname: str) -> list[str]:
    """
    Resolve a hostname to a list of IP addresses (A records).
    Returns an empty list if resolution fails.
    """
    ips: list[str] = []

    try:
        answers = dns.resolver.resolve(hostname, "A")
        for rdata in answers:
            ips.append(rdata.to_text())
    except dns.resolver.NXDOMAIN:
        logger.debug(f"NXDOMAIN: {hostname}")
    except dns.resolver.NoAnswer:
        logger.debug(f"No A record: {hostname}")
    except dns.resolver.Timeout:
        logger.warning(f"DNS timeout: {hostname}")
    except Exception as e:
        logger.debug(f"DNS error for {hostname}: {e}")

    return ips
