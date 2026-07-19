"""
Subdomain enumeration via Certificate Transparency logs (crt.sh).

Queries crt.sh for all certificates issued for a given domain,
extracts unique subdomain names from the results.
"""

import httpx
import logging

logger = logging.getLogger(__name__)

CRT_SH_URL = "https://crt.sh/"


async def enumerate_subdomains(domain: str) -> list[str]:
    """
    Query crt.sh for subdomains of the given root domain.
    Returns a deduplicated, sorted list of hostnames.
    """
    subdomains: set[str] = set()
    subdomains.add(domain)  # always include the root domain itself

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(
                CRT_SH_URL,
                params={"q": f"%.{domain}", "output": "json"},
            )
            resp.raise_for_status()
            entries = resp.json()

        for entry in entries:
            name_value = entry.get("name_value", "")
            # name_value can contain multiple hostnames separated by newlines
            for name in name_value.split("\n"):
                name = name.strip().lower()
                # Skip wildcards and empty entries
                if not name or name.startswith("*"):
                    continue
                # Must be a subdomain of the target
                if name == domain or name.endswith(f".{domain}"):
                    subdomains.add(name)

    except httpx.TimeoutException:
        logger.warning(f"crt.sh timeout for {domain}")
    except Exception as e:
        logger.error(f"crt.sh error for {domain}: {e}")

    result = sorted(subdomains)
    logger.info(f"Found {len(result)} subdomains for {domain}")
    return result
