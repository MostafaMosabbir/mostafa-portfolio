"""Recreate FICTIONAL marketing-company test fixtures, not a real assessment.

Run only to reset the bundled demo: this overwrites data/*.csv. All review
names, implementation claims, dates and evidence references are synthetic.
Requirements are our narrow scenario checks; CSF IDs indicate related outcomes.
"""
import csv
from pathlib import Path
from proposal import SCHEMAS

SOURCE = "https://doi.org/10.6028/NIST.CSWP.29"

# Domain, source reference, narrow scenario requirement, illustrative control.
SCENARIOS = [
    ("Govern", "GV.RR-02", "Assign owners for client-data and advertising-account security.", "Security responsibility register"),
    ("Govern", "GV.PO-01", "Communicate the agency's approved client-file handling policy.", "Client-file handling policy"),
    ("Govern", "GV.SC-04", "List and prioritize campaign platforms and freelance suppliers.", "Supplier inventory"),
    ("Identify", "ID.AM-01", "Maintain an inventory of agency-managed laptops.", "Laptop inventory reconciliation"),
    ("Identify", "ID.AM-02", "Record the agency's managed design and marketing software.", "Software inventory"),
    ("Identify", "ID.RA-06", "Track the chosen response to shared advertising-account risk.", "Shared-account remediation plan"),
    ("Protect", "PR.AA-03", "Require MFA for the in-scope human advertising-account logins.", "Advertising-account MFA"),
    ("Protect", "PR.AA-05", "Review freelancer permissions to client campaign folders.", "Freelancer access review"),
    ("Protect", "PR.AT-01", "Train staff to recognize fraudulent campaign payment requests.", "Payment-fraud awareness exercise"),
    ("Protect", "PR.DS-11", "Record protected campaign-file backups and a restore test.", "Campaign backup and restore exercise"),
    ("Detect", "DE.CM-09", "Monitor agency laptops for suspicious activity.", "Endpoint alert monitoring"),
    ("Detect", "DE.AE-03", "Correlate campaign account alerts with identity activity.", "Alert correlation procedure"),
    ("Respond", "RS.MA-02", "Triage and validate reported advertising-account incidents.", "Incident triage checklist"),
    ("Respond", "RS.AN-06", "Keep a tamper-evident record of investigation actions.", "Investigation activity journal"),
    ("Recover", "RC.RP-03", "Check campaign backup integrity before restoration.", "Pre-restoration integrity check"),
]


def build(destination: Path) -> None:
    destination.mkdir(parents=True, exist_ok=True)
    data = {kind: [] for kind in SCHEMAS}
    for n, (domain, source_ref, requirement, title) in enumerate(SCENARIOS, 1):
        rid, cid, eid = f"REQ-{n:03}", f"CTL-{n:03}", f"EV-{n:03}"
        requirement_row = [rid, domain, requirement, "high" if n in (6,7,8,10,12,13,15) else "medium",
                           cid, "approved", "Demo reviewer", "2026-10-20", "NIST CSF", "2.0", source_ref, SOURCE]
        control = [cid, title, "implemented", "Demo IT owner", f"Fictional scenario: {title.lower()} is recorded as operating for the defined demo scope.", "", eid]
        evidence = [eid, f"Fictional record: {title}", f"SYNTHETIC-REFERENCE-{n:03}", "reviewed", "2026-10-20"]
        # Intentionally imperfect records exercise distinct review failures.
        if n == 2:
            requirement_row[5] = "pending"
        elif n == 3:
            control[2], control[5] = "partial", "2026-11-15"
        elif n == 5:
            evidence[4] = "2025-12-01"
        elif n == 6:
            control[2], control[5] = "planned", "2026-10-01"
        elif n == 7:
            control[6] = ""
        elif n == 8:
            control[3] = ""
        elif n == 9:
            evidence[3] = "pending"
        elif n == 10:
            control[2], control[5] = "partial", "2026-11-10"
        elif n == 12:
            requirement_row[4] = ""
        elif n == 14:
            evidence[3] = "rejected"
        elif n == 15:
            evidence[4] = "2026-11-01"
        if control[2] == "partial":
            control[4] = f"Fictional scenario: {title.lower()} is incomplete; coverage and verification work remain."
        elif control[2] == "planned":
            control[4] = f"Fictional scenario: {title.lower()} has been proposed but is not operating."
        data["requirements"].append(requirement_row)
        data["controls"].append(control)
        data["evidence"].append(evidence)
    for kind, rows in data.items():
        with (destination / f"{kind}.csv").open("w", encoding="utf-8-sig", newline="") as stream:
            writer = csv.writer(stream)
            writer.writerow(SCHEMAS[kind])
            writer.writerows(rows)


if __name__ == "__main__":
    build(Path(__file__).parent / "data")
    print("Reset fictional marketing-company sample data.")
