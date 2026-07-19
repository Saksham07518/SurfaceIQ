"""
Scan engine — orchestrates the full EASM scan pipeline.

Pipeline:
  1. Enumerate subdomains (crt.sh)
  2. Resolve DNS for each subdomain
  3. Probe HTTP/HTTPS
  4. Analyze TLS certificates
  5. Generate findings
  6. Write results to Firestore
"""

import asyncio
import logging
from datetime import datetime, timezone

from firebase_admin import firestore

from scanner.subdomains import enumerate_subdomains
from scanner.dns_resolver import resolve_hostname
from scanner.http_prober import probe_http
from scanner.tls_analyzer import analyze_tls

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


def run_scan(uid: str, scan_id: str, root_domain: str):
    """
    Entry point for the background scan task.
    Runs the async pipeline in a new event loop.
    """
    try:
        asyncio.run(_scan_pipeline(uid, scan_id, root_domain))
    except Exception as e:
        logger.error(f"Scan {scan_id} failed: {e}")
        # Mark scan as failed
        try:
            db = firestore.client()
            db.collection("users").document(uid).collection("scans").document(scan_id).update({
                "status": "failed",
                "completed_at": firestore.SERVER_TIMESTAMP,
            })
        except Exception:
            pass


async def _scan_pipeline(uid: str, scan_id: str, root_domain: str):
    """Full async scan pipeline."""
    db = firestore.client()
    scans_ref = db.collection("users").document(uid).collection("scans").document(scan_id)
    assets_col = db.collection("users").document(uid).collection("assets")
    findings_col = db.collection("users").document(uid).collection("findings")

    # ── 1. Mark as running ───────────────────────────────────
    scans_ref.update({"status": "running"})
    logger.info(f"Scan {scan_id}: starting for {root_domain}")

    # ── 2. Enumerate subdomains ──────────────────────────────
    subdomains = await enumerate_subdomains(root_domain)
    logger.info(f"Scan {scan_id}: found {len(subdomains)} subdomains")

    # Cap at 100 subdomains to keep scans reasonable
    if len(subdomains) > 100:
        subdomains = subdomains[:100]
        logger.info(f"Scan {scan_id}: capped to 100 subdomains")

    # ── 3. DNS resolve + HTTP probe each subdomain ───────────
    assets = []
    findings = []

    for hostname in subdomains:
        # DNS
        ips = resolve_hostname(hostname)
        ip = ips[0] if ips else None

        # HTTP probe
        http_info = await probe_http(hostname)

        # TLS analysis (only if alive)
        tls_info = None
        if http_info["alive"]:
            tls_info = analyze_tls(hostname)

        # Build asset record
        asset = {
            "hostname": hostname,
            "ip": ip,
            "root_domain": root_domain,
            "status": "live" if http_info["alive"] else "dead",
            "http_status": http_info["http_status"],
            "server": http_info["server"],
            "url": http_info["url"],
            "scan_id": scan_id,
            "discovered_at": firestore.SERVER_TIMESTAMP,
        }

        if tls_info:
            asset["tls_issuer"] = tls_info.get("issuer_org") or tls_info.get("issuer_cn", "")
            asset["tls_expiry"] = tls_info.get("not_after")
            asset["tls_days_remaining"] = tls_info.get("days_remaining")

        assets.append(asset)

        # ── 4. Generate findings ─────────────────────────────
        hostname_findings = _generate_findings(hostname, http_info, tls_info, scan_id)
        findings.extend(hostname_findings)

    # ── 5. Write assets to Firestore ─────────────────────────
    logger.info(f"Scan {scan_id}: writing {len(assets)} assets")
    for asset in assets:
        assets_col.document().set(asset)

    # ── 6. Write findings to Firestore ───────────────────────
    logger.info(f"Scan {scan_id}: writing {len(findings)} findings")
    for finding in findings:
        findings_col.document().set(finding)

    # ── 7. Update target status ──────────────────────────────
    targets_col = db.collection("users").document(uid).collection("targets")
    targets = targets_col.where("root_domain", "==", root_domain).stream()
    for t in targets:
        t.reference.update({"status": "live"})

    # ── 8. Mark scan as completed ────────────────────────────
    scans_ref.update({
        "status": "completed",
        "completed_at": firestore.SERVER_TIMESTAMP,
        "assets_found": len(assets),
        "findings_found": len(findings),
    })
    logger.info(f"Scan {scan_id}: completed — {len(assets)} assets, {len(findings)} findings")


def _generate_findings(
    hostname: str,
    http_info: dict,
    tls_info: dict | None,
    scan_id: str,
) -> list[dict]:
    """Generate security findings based on probe and TLS results."""
    findings = []

    def add(finding_type: str, severity: str, description: str):
        findings.append({
            "type": finding_type,
            "severity": severity,
            "description": description,
            "asset": hostname,
            "asset_id": hostname,
            "scan_id": scan_id,
            "detected_at": firestore.SERVER_TIMESTAMP,
        })

    # No HTTPS
    if http_info["alive"] and http_info["url"] and http_info["url"].startswith("http://"):
        add("missing_https", "high", f"{hostname} is only reachable over plain HTTP. Data in transit is not encrypted.")

    # TLS issues
    if tls_info and tls_info.get("issues"):
        issues = tls_info["issues"]

        if "expired" in issues:
            add("tls_expired", "critical", f"TLS certificate for {hostname} has expired (expired {tls_info.get('not_after', 'unknown')}).")

        if "expiring_soon" in issues:
            days = tls_info.get("days_remaining", "?")
            add("tls_expiring", "medium", f"TLS certificate for {hostname} expires in {days} days.")

        if "self_signed" in issues:
            add("tls_self_signed", "high", f"{hostname} is using a self-signed TLS certificate.")

        if "wildcard" in issues:
            add("tls_wildcard", "low", f"{hostname} uses a wildcard certificate. Consider dedicated certs for critical services.")

    # No TLS at all on a live host
    if http_info["alive"] and tls_info is None:
        add("no_tls", "high", f"No TLS certificate found for {hostname}. The host may not support HTTPS.")

    # HTTP server header exposed
    if http_info.get("server"):
        add("server_header", "low", f"{hostname} exposes its server header: {http_info['server']}. This can aid attackers in fingerprinting.")

    return findings
