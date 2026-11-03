"""Human-friendly labels for the bundled fictional assessment scenarios.

Display names are applied only when both the identifier and the requirement
match the bundled example. Other assessments may reuse an identifier, so the
requirement text remains the fallback label. These names never affect results.
"""

SCENARIO_NAMES = {
    "REQ-007": ("Require MFA for the in-scope human advertising-account logins.", "MFA Coverage Verification"),
    "REQ-008": ("Review freelancer permissions to client campaign folders.", "Freelancer Access Review"),
    "REQ-010": ("Record protected campaign-file backups and a restore test.", "Backup Restoration Testing"),
    "REQ-012": ("Correlate campaign account alerts with identity activity.", "Alert Correlation Mapping"),
    "REQ-014": ("Keep a tamper-evident record of investigation actions.", "Investigation Evidence Review"),
}


def scenario_name(row):
    """Return a sample label only for its exact original requirement."""
    requirement = row["requirement"]
    entry = SCENARIO_NAMES.get(row["requirement_id"])
    return entry[1] if entry and requirement == entry[0] else requirement
