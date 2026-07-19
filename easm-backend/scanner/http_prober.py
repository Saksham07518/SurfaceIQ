"""
HTTP prober — checks if hosts are reachable on HTTP/HTTPS.
"""

import httpx
import logging

logger = logging.getLogger(__name__)


async def probe_http(hostname: str) -> dict:
    """
    Probe a hostname on HTTPS (preferred) then HTTP.
    Returns a dict with status info.
    """
    result = {
        "hostname": hostname,
        "alive": False,
        "http_status": None,
        "url": None,
        "redirect_url": None,
        "server": None,
    }

    for scheme in ("https", "http"):
        url = f"{scheme}://{hostname}"
        try:
            async with httpx.AsyncClient(
                timeout=10.0,
                follow_redirects=True,
                verify=False,  # we check TLS separately
            ) as client:
                resp = await client.get(url)

            result["alive"] = True
            result["http_status"] = resp.status_code
            result["url"] = url
            result["server"] = resp.headers.get("server")

            # Track if it redirected
            if resp.history:
                result["redirect_url"] = str(resp.url)

            return result  # success on first scheme that works

        except httpx.ConnectTimeout:
            logger.debug(f"Connect timeout: {url}")
        except httpx.ConnectError:
            logger.debug(f"Connect error: {url}")
        except Exception as e:
            logger.debug(f"Probe error {url}: {e}")

    return result
