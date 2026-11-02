"""Reproduce the fictional REQ-007 lesson without modifying source data.

Run: python demo_reassessment.py
The output directory must be new. All evidence is synthetic metadata.
"""
import argparse
import csv
from datetime import date
import html
import json
from pathlib import Path
import shutil

from proposal import generate, InputError


def change_csv(path, id_field, identity, field, value):
    """Change exactly one identified record, preserving all other records."""
    with path.open(encoding="utf-8-sig", newline="") as stream:
        reader = csv.DictReader(stream)
        fields = reader.fieldnames
        records = list(reader)
    matches = [record for record in records if record[id_field] == identity]
    if len(matches) != 1:
        raise InputError(f"Expected exactly one {identity}")
    matches[0][field] = value
    with path.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=fields)
        writer.writeheader()
        writer.writerows(records)


def build_demo(source, output):
    if output.exists():
        raise InputError("Choose a new output folder; existing demonstrations are preserved.")
    # A fixed date isolates the mapping change from evidence aging.
    day = date(2026, 10, 28)
    stages = []
    for folder, title in [("before", "Original assessment"),
                          ("action-ready", "Action marked ready for review"),
                          ("after", "Evidence mapping added")]:
        data = output / folder / "data"
        shutil.copytree(source, data)
        if folder != "before":
            change_csv(data / "actions.csv", "action_id", "ACT-005", "status", "ready_for_review")
        if folder == "after":
            change_csv(data / "controls.csv", "control_id", "CTL-007", "evidence_ids", "EV-007")
        reports = output / folder / "reports"
        summary = generate(data, reports, day)
        assessment = json.loads((reports / "assessment.json").read_text(encoding="utf-8"))
        target = next(r for r in assessment["requirements"] if r["requirement_id"] == "REQ-007")
        stages.append({"folder": folder, "title": title, "summary": summary,
                       "requirement": target, "requirements": assessment["requirements"]})

    expected = ["needs_work", "needs_work", "supported_draft"]
    if [s["requirement"]["state"] for s in stages] != expected:
        raise InputError("Fixture results differ from the intended lesson. Inspect the generated reports.")
    # Check the entire other requirement records, not only aggregate counts.
    untouched = lambda stage: [r for r in stage["requirements"] if r["requirement_id"] != "REQ-007"]
    if any(untouched(s) != untouched(stages[0]) for s in stages[1:]):
        raise InputError("An unrelated requirement changed; inspect the demo inputs.")

    result = {"scenario": "Fictional metadata-only MFA reassessment", "as_of": day.isoformat(),
              "stages": [{k: v for k, v in s.items() if k != "requirements"} for s in stages],
              "other_requirements_unchanged": True,
              "limitation": "No MFA configuration, login, screenshot, or evidence file was inspected."}
    (output / "comparison.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    esc = html.escape
    table = "".join(f'<tr><th scope="row"><a href="{s["folder"]}/reports/review.html#finding-REQ-007">{esc(s["title"])}</a></th>'
                    f'<td>{esc(s["requirement"]["state"].replace("_", " "))}</td>'
                    f'<td>{s["summary"]["supported_drafts"]}</td><td>{s["summary"]["needs_work"]}</td></tr>' for s in stages)
    page = '''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Project 004 | MFA reassessment walkthrough</title>
<style>body{margin:0;background:#091311;color:#eaf3ee;font:16px/1.7 system-ui}main{max-width:960px;margin:auto;padding:32px 20px}a{color:#86e4bf}h1{line-height:1.2}h2{margin-top:32px}.table{overflow:auto}table{width:100%;border-collapse:collapse}th,td{padding:14px;text-align:left;border-bottom:1px solid #365449}code{color:#86e4bf}li{margin:12px 0}.note{border-left:3px solid #86e4bf;padding:12px 20px;background:#10211a}a:focus-visible{outline:2px solid #86e4bf;outline-offset:4px}</style>
<main><p>PROJECT 004 / LOCAL LEARNING DEMO</p><h1>An implemented control still needs evidence</h1>
<p>REQ-007: MFA for in-scope human advertising-account logins. Three reproducible runs show the difference between tracking work and supporting an assessment claim.</p>
<p>Fictional sample. Assessment date held at October 28, 2026. The original data is preserved.</p>
<div class="table"><table><caption>Results from the generated assessments, not a compliance score</caption><thead><tr><th>Run</th><th>REQ-007 result</th><th>Supported drafts</th><th>Need work</th></tr></thead><tbody>''' + table + '''</tbody></table></div>
<h2>Follow the logic</h2><ol>
<li><strong>Before:</strong> REQ-007 maps to CTL-007. Its status is implemented, but <code>evidence_ids</code> is blank. The evaluator records a missing-evidence finding.</li>
<li><strong>Action ready:</strong> ACT-005 changes from planned to ready_for_review. The finding remains. Action status is planning information and is not an input to the assessment verdict.</li>
<li><strong>After:</strong> CTL-007 now links to EV-007. That existing synthetic record has a reference, reviewed status, and a review date within the configured freshness window. Other required metadata also passes, so REQ-007 becomes a supported draft.</li>
</ol><p>Only REQ-007 changes assessment result. The other 14 requirement records are unchanged.</p>
<p class="note"><strong>This is a mapping exercise, not an MFA implementation or verification.</strong> We did not configure MFA or inspect evidence. A human would still need to examine the actual policy, account coverage, exclusions, and relevant authentication behavior before endorsing the claim.</p>
<h2>Explain it yourself</h2><ol><li>Why does implemented status alone fail the first run?</li><li>Why does marking an action ready not resolve the gap?</li><li>What metadata does EV-007 provide, and what does it not prove?</li><li>What should happen if that review is stale or rejected?</li></ol>
<p><a href="comparison.json">Inspect comparison data</a> · <a href="../proposal.py">Read the assessment logic</a> · <a href="../demo_reassessment.py">Read this exercise</a></p>
</main></html>'''
    (output / "index.html").write_text(page, encoding="utf-8")
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path(__file__).parent / "reassessment-demo")
    args = parser.parse_args()
    try:
        result = build_demo(Path(__file__).parent / "data", args.output)
    except (ValueError, OSError, csv.Error) as exc:
        parser.exit(2, f"Cannot build demonstration: {exc}\n")
    print("REQ-007: needs work -> needs work -> supported draft")
    print(f"Open {args.output.resolve() / 'index.html'}")
