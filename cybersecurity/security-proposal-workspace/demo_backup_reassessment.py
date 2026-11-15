"""Reproduce the fictional backup restoration finding on copied sample data."""
import argparse
import csv
from datetime import date
from html import escape
import json
from pathlib import Path
import shutil
import tempfile

from demo_reassessment import change_csv
from proposal import InputError, generate, read_csv


ASSESSMENT_DATE = date(2026, 10, 28)
REQUIREMENT_ID = "REQ-010"
CONTROL_ID = "CTL-010"
ACTION_ID = "ACT-008"
EVIDENCE_ID = "EV-010"


def assess_stages(source, output):
    """Copy the same baseline into each stage and run the existing evaluator."""
    stages = []
    requirements = []
    for folder, title in (
        ("before", "Original assessment"),
        ("action-ready", "Action ready for review"),
        ("after", "Control and evidence updated"),
    ):
        data = output / folder / "data"
        shutil.copytree(source, data)
        if folder != "before":
            change_csv(data / "actions.csv", "action_id", ACTION_ID, "status", "ready_for_review")
        if folder == "after":
            # This is a second fictional state. A person would update the control
            # only after confirming scope and reviewing a documented restore.
            change_csv(data / "controls.csv", "control_id", CONTROL_ID, "status", "implemented")
            change_csv(data / "controls.csv", "control_id", CONTROL_ID, "target_date", "")
            change_csv(
                data / "controls.csv", "control_id", CONTROL_ID, "statement",
                "Fictional scenario: protected backups cover the in-scope campaign files, "
                "and a documented restore to a separate destination was reviewed.",
            )
            change_csv(
                data / "evidence.csv", "evidence_id", EVIDENCE_ID, "reference",
                "DEMO-RESTORE-REVIEW-010",
            )
            change_csv(data / "evidence.csv", "evidence_id", EVIDENCE_ID, "reviewed_on", "2026-10-27")

        reports = output / folder / "reports"
        summary = generate(data, reports, ASSESSMENT_DATE)
        assessment = json.loads((reports / "assessment.json").read_text(encoding="utf-8"))
        rows = {row["requirement_id"]: row for row in assessment["requirements"]}
        action = next(row for row in assessment["actions"] if row["action_id"] == ACTION_ID)
        evidence = next(
            row for row in read_csv(data / "evidence.csv", "evidence")
            if row["evidence_id"] == EVIDENCE_ID
        )
        stages.append({
            "folder": folder, "title": title, "summary": summary,
            "requirement": rows[REQUIREMENT_ID], "action": action, "evidence": evidence,
        })
        requirements.append(rows)

    if [stage["requirement"]["state"] for stage in stages] != [
        "needs_work", "needs_work", "supported_draft"
    ]:
        raise InputError("The sample changed. Inspect the generated backup assessment results.")
    if requirements[0] != requirements[1]:
        raise InputError("The action-only change unexpectedly altered the assessment.")
    if (requirements[0].keys() != requirements[2].keys() or any(
        requirements[0][key] != requirements[2][key]
        for key in requirements[0] if key != REQUIREMENT_ID
    )):
        raise InputError("An unrelated finding changed. Inspect the copied data.")
    return stages


def render_comparison(result, portfolio_preview):
    """Show the same recorded results in HTML and the JSON export."""
    rows = []
    for stage in result["stages"]:
        title = escape(stage["title"])
        if not portfolio_preview:
            target = f'{stage["folder"]}/reports/review.html#finding-{REQUIREMENT_ID}'
            title = f'<a href="{target}">{title}</a>'
        requirement = stage["requirement"]
        state = escape(requirement["state"].replace("_", " ").capitalize())
        gaps = " ".join(escape(gap) for gap in requirement["gaps"])
        finding = f"{state}. {gaps}" if gaps else state
        summary = stage["summary"]
        rows.append(
            f'<tr><th scope="row">{title}</th><td>{finding}</td>'
            f'<td>{summary["supported_drafts"]}</td><td>{summary["needs_work"]}</td></tr>'
        )
    navigation = (
        '<nav aria-label="Project navigation">'
        '<a href="../reports/review.html#finding-REQ-010">Open the baseline finding</a> · '
        '<a href="../evidence-examples/backup-restore.html">Read the evidence example</a> · '
        '<a href="../../../projects/security-proposal-workspace/practice.html">Practice labs</a></nav>'
        if portfolio_preview else ""
    )
    return f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Backup Restoration Testing | Security Proposal Workspace</title>
  <style>
    body {{ margin: 0; background: #091311; color: #eaf3ee; font: 1rem/1.65 system-ui, sans-serif; }}
    main {{ max-width: 57rem; margin: auto; padding: 2rem 1.125rem 3rem; }}
    h1, h2 {{ line-height: 1.2; }}
    h2 {{ margin-top: 2rem; }}
    a, code {{ color: #95e8bb; }}
    :focus-visible {{ outline: 2px solid #95e8bb; outline-offset: 3px; }}
    .eyebrow {{ color: #a4cdba; font: .8rem/1.5 ui-monospace, monospace; letter-spacing: .08em; }}
    .table {{ overflow-x: auto; }}
    table {{ width: 100%; border-collapse: collapse; }}
    caption {{ text-align: left; margin: 0 0 .75rem; }}
    th, td {{ padding: .75rem; text-align: left; border-bottom: 1px solid #365449; vertical-align: top; }}
    li + li {{ margin-top: .5rem; }}
    .note {{ padding: .75rem 1rem; background: #10211a; border-left: .2rem solid #95e8bb; }}
  </style>
</head>
<body>
<main>
  {navigation}
  <p class="eyebrow">PROJECT 004 / REQ-010</p>
  <h1>Backup Restoration Testing</h1>
  <p>Follow a fictional marketing agency’s backup control from incomplete coverage to a
     recorded restore review. Each assessment uses October 28, 2026 as its reference date.</p>
  <div class="table" tabindex="0" aria-label="Reassessment results">
    <table>
      <caption>Three runs of the Python assessor</caption>
      <thead><tr><th scope="col">Run</th><th scope="col">REQ-010 finding</th>
        <th scope="col">Supported drafts</th><th scope="col">Need work</th></tr></thead>
      <tbody>{"".join(rows)}</tbody>
    </table>
  </div>
  <h2>What changed</h2>
  <ol>
    <li><strong>Original assessment.</strong> REQ-010 maps to CTL-010. The control already
    points to EV-010, with a recorded review dated October 20. Its implementation status is
    <code>partial</code>, so the assessor reports <strong>Needs work</strong>.</li>
    <li><strong>Action ready for review.</strong> ACT-008 changes to <code>ready_for_review</code>.
    The implementation status and evidence record stay the same, so the finding stays open.</li>
    <li><strong>Control and evidence updated.</strong> The sample records the protected scope
    and restore as implemented and updates EV-010 with the fictional review reference
    <code>DEMO-RESTORE-REVIEW-010</code> dated October 27. The assessor can now produce a
    <strong>Supported draft</strong> for REQ-010.</li>
  </ol>
  <p class="note">The assessment reads the recorded review metadata. Its supported draft
  calls for a person to confirm the protected scope and inspect the restore record. REQ-015,
  the separate check for backup integrity before restoration, keeps its original finding.</p>
  <h2>Reproduce the three runs</h2>
  <p>From the Project 004 folder, run <code>python demo_backup_reassessment.py --output my-backup-reassessment</code>
  and open <code>my-backup-reassessment/index.html</code>. Each stage in the local output has its own
  input copy and report.</p>
  <p><a href="comparison.json">Inspect the comparison data</a></p>
</main>
</body>
</html>
'''


def build_demo(source, output, portfolio_preview=False):
    if output.resolve().is_relative_to(source.resolve()):
        raise InputError("Choose an output path outside the original data directory.")
    try:
        output.mkdir(parents=True)
    except FileExistsError as exc:
        raise InputError("Choose a new output directory. Existing demonstrations are preserved.") from exc

    if portfolio_preview:
        # The portfolio only needs the comparison, so discard the duplicate reports.
        with tempfile.TemporaryDirectory(dir=output) as temporary:
            stages = assess_stages(source, Path(temporary))
    else:
        stages = assess_stages(source, output)
    result = {
        "scenario": "Fictional backup restoration reassessment",
        "as_of": ASSESSMENT_DATE.isoformat(),
        "stages": stages,
        "other_requirements_unchanged": True,
        "scope": "Synthetic records only. No backup configuration, cloud resource, or restore log was inspected.",
    }
    (output / "comparison.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    (output / "index.html").write_text(render_comparison(result, portfolio_preview), encoding="utf-8")
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True, help="A new output directory")
    parser.add_argument("--portfolio-preview", action="store_true",
                        help="Write just the comparison for the portfolio's backup-reassessment-demo folder")
    args = parser.parse_args()
    try:
        build_demo(Path(__file__).parent / "data", args.output, args.portfolio_preview)
    except (ValueError, OSError, csv.Error) as exc:
        parser.exit(2, f"Cannot build backup demonstration: {exc}\n")
    print("REQ-010: needs work -> needs work -> supported draft")
    print(f"Open {args.output.resolve() / 'index.html'}")
