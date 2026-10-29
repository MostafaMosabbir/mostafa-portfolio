"""Build an evidence-aware SECURITY response draft, not a complete bid.

Python standard library only. Start with the fictional data/ CSV files.
No AI, network calls, credential access, evidence uploads, or compliance verdicts.
"""
from __future__ import annotations

import argparse
import csv
from datetime import date
import hashlib
import html
import json
from pathlib import Path
import re
import tempfile
import os
import io

SCHEMAS = {
    "requirements": ["requirement_id", "domain", "requirement", "priority", "control_ids", "coverage_review", "reviewer", "reviewed_on", "framework", "framework_version", "source_ref", "source_url"],
    "controls": ["control_id", "title", "status", "owner", "statement", "target_date", "evidence_ids"],
    "evidence": ["evidence_id", "title", "reference", "review_status", "reviewed_on"],
}
STATUSES = {"implemented", "partial", "planned", "not_implemented", "unknown"}
PRIORITIES = {"low", "medium", "high", "critical"}


class InputError(ValueError):
    """An input defect stops generation instead of silently dropping records."""


def parse_date(value: str, field: str) -> date | None:
    if not value:
        return None
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        raise InputError(f"{field}: use YYYY-MM-DD")
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise InputError(f"{field}: invalid calendar date") from exc


def references(value: str) -> list[str]:
    """Semicolons separate IDs; whitespace is ignored; duplicates are errors."""
    ids = [part.strip() for part in value.split(";") if part.strip()]
    if len(ids) != len(set(ids)):
        raise InputError("Repeated IDs within a mapping")
    return ids


def read_csv(path: Path, kind: str, raw: bytes | None = None) -> list[dict[str, str]]:
    # utf-8-sig accepts both ordinary UTF-8 and Excel's UTF-8 BOM.
    with io.StringIO((path.read_bytes() if raw is None else raw).decode("utf-8-sig"), newline="") as stream:
        reader = csv.DictReader(stream, strict=True)
        if reader.fieldnames != SCHEMAS[kind]:
            raise InputError(f"{path.name}: header must be {','.join(SCHEMAS[kind])}")
        rows = []
        for number, row in enumerate(reader, start=2):
            if None in row or any(value is None for value in row.values()):
                raise InputError(f"{path.name}, row {number}: wrong number of CSV fields")
            rows.append({key: value.strip() for key, value in row.items()})
        return rows


def validate(data: dict) -> None:
    """Validate shapes, enums, IDs and foreign keys before evaluating claims."""
    indexes = {}
    required = {"requirements": ["domain", "requirement", "priority", "coverage_review", "framework", "framework_version", "source_ref", "source_url"],
                "controls": ["title", "status"], "evidence": ["title", "review_status"]}
    for kind, fields in SCHEMAS.items():
        indexes[kind] = {}
        id_key = fields[0]
        for row in data[kind]:
            if set(row) != set(fields) or any(not isinstance(v, str) for v in row.values()):
                raise InputError(f"{kind}: invalid record shape")
            identity = row[id_key]
            if not re.fullmatch(r"[A-Z][A-Z0-9-]{1,39}", identity):
                raise InputError(f"{kind}: IDs must be uppercase letters, digits or hyphens")
            if identity in indexes[kind]:
                raise InputError(f"{kind}: duplicate ID {identity}")
            if any(not row[field].strip() for field in required[kind]):
                raise InputError(f"{identity}: missing required field")
            indexes[kind][identity] = row
    if not data["requirements"]:
        raise InputError("At least one requirement is needed")
    for row in data["requirements"]:
        if not row["source_url"].startswith("https://"):
            raise InputError(f"{row['requirement_id']}: source_url must use HTTPS")
        if row["priority"] not in PRIORITIES or row["coverage_review"] not in {"pending", "approved", "rejected"}:
            raise InputError(f"{row['requirement_id']}: invalid priority or coverage_review")
        parse_date(row["reviewed_on"], row["requirement_id"])
        for ref in references(row["control_ids"]):
            if ref not in indexes["controls"]:
                raise InputError(f"{row['requirement_id']}: unknown control {ref}")
    for row in data["controls"]:
        if row["status"] not in STATUSES:
            raise InputError(f"{row['control_id']}: invalid status")
        parse_date(row["target_date"], row["control_id"])
        for ref in references(row["evidence_ids"]):
            if ref not in indexes["evidence"]:
                raise InputError(f"{row['control_id']}: unknown evidence {ref}")
    for row in data["evidence"]:
        if row["review_status"] not in {"reviewed", "pending", "rejected"}:
            raise InputError(f"{row['evidence_id']}: invalid review_status")
        parse_date(row["reviewed_on"], row["evidence_id"])


def evaluate(data: dict, as_of: date, max_age_days: int = 180) -> list[dict]:
    """A clear row is a supported draft only, NEVER a compliance certificate.

    Evidence dates and approval flags are operator attestations. This program
    does not open evidence references or independently inspect control operation.
    All mapped controls and evidence references are required (AND, not OR).
    The freshness window is a configurable project rule, not a legal standard.
    """
    if max_age_days < 1:
        raise InputError("Evidence freshness must be at least one day")
    validate(data)
    controls = {r["control_id"]: r for r in data["controls"]}
    evidence = {r["evidence_id"]: r for r in data["evidence"]}
    rows = []
    for requirement in data["requirements"]:
        gaps, claims = [], []
        ids = references(requirement["control_ids"])
        if not ids:
            gaps.append("No control mapped; document an approach and assign a control owner.")
        if requirement["coverage_review"] != "approved":
            gaps.append("Requirement coverage has not been approved by a human reviewer.")
        if not requirement["reviewer"].strip():
            gaps.append("Requirement coverage reviewer is missing.")
        reviewed = parse_date(requirement["reviewed_on"], requirement["requirement_id"])
        if not reviewed:
            gaps.append("Requirement coverage review date is missing.")
        elif reviewed > as_of:
            gaps.append("Requirement coverage review date is in the future.")
        elif (as_of - reviewed).days > max_age_days:
            gaps.append("Requirement coverage review is stale under the selected freshness window.")
        for control_id in ids:
            control = controls[control_id]
            if control["status"] != "implemented":
                gaps.append(f"{control_id}: status is {control['status']}; do not claim implementation.")
            if not control["owner"].strip():
                gaps.append(f"{control_id}: owner is missing.")
            if not control["statement"].strip():
                gaps.append(f"{control_id}: response statement is missing.")
            target = parse_date(control["target_date"], control_id)
            if control["status"] != "implemented":
                if not target:
                    gaps.append(f"{control_id}: target date is missing.")
                elif target < as_of:
                    gaps.append(f"{control_id}: target date is overdue.")
            ev_ids = references(control["evidence_ids"])
            if not ev_ids:
                gaps.append(f"{control_id}: evidence reference is missing.")
            for ev_id in ev_ids:
                ev = evidence[ev_id]
                if not ev["reference"].strip():
                    gaps.append(f"{ev_id}: evidence location or reference is missing.")
                if ev["review_status"] != "reviewed":
                    gaps.append(f"{ev_id}: evidence has not passed recorded human review.")
                ev_date = parse_date(ev["reviewed_on"], ev_id)
                if not ev_date:
                    gaps.append(f"{ev_id}: evidence review date is missing.")
                elif ev_date > as_of:
                    gaps.append(f"{ev_id}: evidence review date is in the future.")
                elif (as_of - ev_date).days > max_age_days:
                    gaps.append(f"{ev_id}: evidence review is stale under the selected freshness window.")
            claims.append({"control_id": control_id, "status": control["status"],
                           "owner": control["owner"], "statement": control["statement"],
                           "target_date": control["target_date"], "evidence_ids": ev_ids})
        rows.append({**requirement, "state": "needs_work" if gaps else "supported_draft",
                     "gaps": list(dict.fromkeys(gaps)), "claims": claims})
    return rows


def md(value: str) -> str:
    # Imported prose is text, not HTML or Markdown instructions.
    value = html.escape(str(value), quote=False).replace("\r", " ").replace("\n", " ")
    return re.sub(r"([\\`*_{}\[\]()#+.!|])", r"\\\1", value)


def safe_cell(value) -> str:
    value = str(value)
    if value.lstrip().startswith(("=", "+", "-", "@")) or value.startswith(("\t", "\r", "\n")):
        return "'" + value
    return value


def write_csv(path: Path, headers: list[str], rows: list[list]) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as stream:
        writer = csv.writer(stream)
        writer.writerow(headers)
        writer.writerows([[safe_cell(cell) for cell in row] for row in rows])


def render_review(rows: list[dict], summary: dict) -> str:
    """Offline report: escape every imported value; no scripts or remote assets.

    Native details elements work with keyboard and touch. The report is a view
    of this run, not a second database; edits belong in the source CSV files.
    """
    esc = lambda value: html.escape(str(value), quote=True)
    cards = []
    priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    for row in sorted(rows, key=lambda r: (r["state"] != "needs_work", priority_order[r["priority"]], r["requirement_id"])):
        gaps = "".join(f"<li>{esc(gap)}</li>" for gap in row["gaps"])
        claims = "".join(
            f"<tr><td>{esc(c['control_id'])}</td><td>{esc(c['status'])}</td>"
            f"<td>{esc(c['owner']) or 'Unassigned'}</td><td>{esc(c['target_date']) or 'Not set'}</td>"
            f"<td>{esc('; '.join(c['evidence_ids'])) or 'Missing'}</td></tr>" for c in row["claims"])
        statements = "".join(f"<li><strong>{esc(c['control_id'])}</strong>: {esc(c['statement']) or 'No statement recorded.'}</li>" for c in row['claims'])
        cards.append(f'''<details class="{row['state']}"><summary>
          <span>{esc(row['requirement_id'])} · {esc(row['domain'])}</span>
          <strong>{esc(row['requirement'])}</strong>
          <span>{esc(row['priority'])} priority · {row['state'].replace('_', ' ')} · {len(row['gaps'])} review {'item' if len(row['gaps']) == 1 else 'items'}</span>
          </summary><div class="detail"><p>Related source: {esc(row['framework'])} {esc(row['framework_version'])} / {esc(row['source_ref'])}</p>
          <p class="source"><a href="{esc(row['source_url'])}">Read the source publication ↗</a></p>
          <p>Mapping indicates relevance, not full outcome coverage. Coverage review: {esc(row['coverage_review'])}; reviewer: {esc(row['reviewer']) or 'Missing'}; date: {esc(row['reviewed_on']) or 'Missing'}.</p>
          <div class="table"><table><caption>Recorded controls and evidence references</caption><thead><tr><th>Control</th><th>Status</th><th>Owner</th><th>Target date</th><th>Evidence</th></tr></thead><tbody>{claims}</tbody></table></div>
          <h3>Recorded statements</h3><ul>{statements}</ul>{'<p>No control has been mapped to this requirement.</p>' if not claims else ''}
          <h3>Review findings</h3><ul>{gaps}</ul>{'<p>No gaps detected by these metadata checks. Final human review is still required.</p>' if not gaps else ''}</div></details>''')
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8">
      <meta name="viewport" content="width=device-width,initial-scale=1"><title>Security Proposal Workspace | From Requirements to Safeguards</title>
      <meta name="description" content="A fictional marketing-company security assessment: explore requirement mappings, control ownership and evidence-review gaps.">
      <style>
      *{{box-sizing:border-box}}body{{margin:0;background:#091311;color:#eaf3ee;font:16px/1.6 system-ui,sans-serif}}
      main{{max-width:1080px;margin:auto;padding:36px 20px}}h1{{line-height:1.15}}p{{max-width:85ch}}a{{color:#86e4bf}}
      .muted,summary>span{{color:#b5c8bd}}.stats{{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:24px 0}}
      .stats p{{margin:0;padding:20px;border:1px solid #365449;border-radius:8px}}.stats b{{display:block;font-size:2rem;color:#86e4bf}}
      details{{border:1px solid #365449;border-radius:8px;margin:14px 0;background:#10211a}}summary{{padding:18px;cursor:pointer}}
      summary>span,summary>strong{{display:block}}summary>strong{{margin:6px 0}}summary:focus-visible{{outline:3px solid #86e4bf}}
      .needs_work{{border-left:4px solid #edb767}}.supported_draft{{border-left:4px solid #86e4bf}}
      .detail{{padding:0 20px 20px}}.source{{overflow-wrap:anywhere;font-size:.85rem}}.table{{overflow-x:auto}}
      table{{width:100%;border-collapse:collapse}}th,td{{text-align:left;padding:10px;border-bottom:1px solid #365449}}caption{{text-align:left}}
      li{{margin:8px 0}}@media(max-width:580px){{.stats{{grid-template-columns:1fr}}main{{padding:20px 12px}}}}
      body{{background:radial-gradient(ellipse at top right,#12332b 0,transparent 50%),#091311}}
      h1{{font-size:clamp(2rem,5vw,3.5rem);letter-spacing:-.04em;max-width:20ch;margin:22px 0}}h2{{font-size:1.25rem}}h3{{font-size:1rem;margin-top:24px}}
      .eyebrow{{font: .75rem/1.5 Consolas,monospace;letter-spacing:.12em;color:#86e4bf}}
      .guide{{padding:20px 24px;background:#122820;border:1px solid #365449;border-radius:10px;margin:24px 0}}
      .guide p{{margin:8px 0}}.exports{{display:flex;gap:12px;flex-wrap:wrap;margin:22px 0 34px}}
      .exports a{{border:1px solid #4a6a5c;border-radius:6px;padding:9px 14px;text-decoration:none}}
      .exports a:hover{{background:#1e3e30}}a:focus-visible{{outline:3px solid #86e4bf;outline-offset:4px}}
      summary{{list-style-position:outside;margin-left:20px}}summary::marker{{color:#86e4bf}}summary>span{{font-size:.82rem}}
      details[open]{{background:#132b21}}.stats p{{background:#10211acc}}footer{{margin-top:40px;border-top:1px solid #365449;padding-top:18px}}
      @media print{{body{{color:#111;background:white}}details{{break-inside:avoid;background:white}}.stats b,summary>span{{color:#222}}}}
      </style></head><body><main><!-- PUBLIC_NAV --><p class="eyebrow">SECURITY PROPOSAL WORKSPACE / WORKING PROTOTYPE</p>
      <h1>From Requirements to Safeguards</h1>
      <p>A security review for a fictional marketing company: client campaign files, advertising accounts, freelance access, and the evidence behind each recorded safeguard.</p>
      <p class="muted">The bundled dataset is entirely fictional, including its evidence and review records.</p>
      <p>Assessment date: {esc(summary['as_of'])}. Evidence freshness rule: {summary['max_age_days']} days.</p>
      <p>{esc(summary['scope'])} This report does not certify compliance. Evidence review labels are supplied by the operator; evidence files are not inspected.</p>
      <section class="stats" aria-label="Assessment counts"><p><b>{summary['requirements']}</b>Selected requirements</p>
      <p><b>{summary['supported_drafts']}</b>Supported drafts</p><p><b>{summary['needs_work']}</b>Need work</p></section>
      <aside class="guide" aria-labelledby="guide-title"><h2 id="guide-title">How to read this assessment</h2>
      <p><strong>Supported draft:</strong> the recorded information passes this tool's checks. It is not independent verification.</p>
      <p><strong>Needs work:</strong> a mapping, owner, implementation status, or evidence-review record needs attention.</p>
      <p>Start with <strong>REQ-007</strong>: MFA is recorded as implemented, but no evidence is mapped. The tool flags the missing support instead of accepting the claim.</p></aside>
      <nav class="exports" aria-label="Assessment exports"><a href="crosswalk.csv" download>Download crosswalk · CSV</a>
      <a href="gaps.csv" download>Download gaps · CSV</a><a href="assessment.json" download>Download assessment · JSON</a></nav>
      <p>Open a requirement to inspect its controls and review items. Items needing work appear first, ordered by the supplied priority. Counts are not a compliance percentage.</p>
      {''.join(cards)}<footer><p>Generated locally. Edit the input files and rerun the tool to update this report.</p></footer></main></body></html>'''


def generate(data_dir: Path, output_dir: Path, as_of: date, max_age_days: int = 180,
             overwrite: bool = False) -> dict:
    sources = {kind: data_dir / f"{kind}.csv" for kind in SCHEMAS}
    # Read all bytes first so the provenance hashes describe the actual inputs.
    snapshots = {kind: path.read_bytes() for kind, path in sources.items()}
    data = {kind: read_csv(path, kind, snapshots[kind]) for kind, path in sources.items()}
    rows = evaluate(data, as_of, max_age_days)
    supported = sum(row["state"] == "supported_draft" for row in rows)
    summary = {"schema_version": 1, "as_of": as_of.isoformat(), "max_age_days": max_age_days,
               "requirements": len(rows), "supported_drafts": supported,
               "needs_work": len(rows) - supported, "gap_items": sum(len(r["gaps"]) for r in rows),
               "evidence_validation": "Recorded human-review metadata only; evidence files are not inspected.",
               "scope": "Selected project-defined requirements only; mappings indicate relevance, not complete framework outcome coverage.",
               "inputs": {sources[kind].name: hashlib.sha256(raw).hexdigest() for kind, raw in snapshots.items()}}
    names = ["draft-response.md", "crosswalk.csv", "gaps.csv", "summary.json", "assessment.json", "review.html"]
    if not overwrite and any((output_dir / name).exists() for name in names):
        raise InputError("Output files already exist. Choose a new directory or pass --overwrite.")
    if output_dir.resolve() == data_dir.resolve():
        raise InputError("Keep output and input directories separate")
    lines = ["# Security response draft", "", "INTERNAL REVIEW DRAFT — not a submission-ready proposal or compliance determination.",
             "", f"Assessment date: {as_of.isoformat()}. Review freshness window: {max_age_days} days.",
             "", "Input statements and evidence-review labels are supplied by the operator. Evidence references are not opened or independently verified.",
             "", "This tool handles security requirements only; it does not generate pricing, staffing, contractual terms, or a complete RFP response."]
    crosswalk, gap_rows = [], []
    for row in rows:
        lines += ["", f"## {md(row['requirement_id'])} — {md(row['domain'])}", "", md(row["requirement"]),
                  "", f"**Review state:** {row['state'].replace('_', ' ')}", ""]
        lines += [f"Related source: {md(row['framework'])} {md(row['framework_version'])}, {md(row['source_ref'])}.",
                  md(row['source_url']), "Mapping indicates relevance, not complete coverage of the source outcome.", ""]
        if row["state"] == "needs_work":
            lines += ["**HOLD: resolve these gaps before drafting an external claim.**", ""]
        else:
            lines += ["Candidate statements for final human review (not independently verified):", ""]
        for claim in row["claims"]:
            # Even if an operator enters 'we comply' for a planned control, the
            # export labels it as an unverified input rather than endorsing it.
            lines.append(f"- {md(claim['control_id'])} [{md(claim['status'])}] — Recorded statement: {md(claim['statement']) or '(missing)'}")
            lines.append(f"  Owner: {md(claim['owner']) or '(missing)'}. Evidence references: {md('; '.join(claim['evidence_ids'])) or '(missing)'}.")
        for gap in row["gaps"]:
            lines.append(f"- REVIEW: {md(gap)}")
            gap_rows.append([row["requirement_id"], row["priority"], row["domain"], gap])
        crosswalk.append([row["requirement_id"], row["domain"], row["requirement"], row["priority"],
                          row["control_ids"], row["coverage_review"], row["reviewer"], row["state"], len(row["gaps"]),
                          row["framework"], row["framework_version"], row["source_ref"], row["source_url"]])
    # Generate a complete set in a temporary directory before replacing files.
    # Individual replacements are atomic; this is not a multi-file transaction.
    output_dir.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=output_dir) as temp:
        stage = Path(temp)
        (stage / names[0]).write_text("\n".join(lines) + "\n", encoding="utf-8")
        write_csv(stage / names[1], ["requirement_id", "domain", "requirement", "priority", "control_ids", "coverage_review", "reviewer", "state", "gap_count", "framework", "framework_version", "source_ref", "source_url"], crosswalk)
        write_csv(stage / names[2], ["requirement_id", "priority", "domain", "gap"], gap_rows)
        (stage / names[3]).write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
        (stage / names[4]).write_text(json.dumps({"summary": summary, "requirements": rows}, indent=2) + "\n", encoding="utf-8")
        (stage / names[5]).write_text(render_review(rows, summary), encoding="utf-8")
        for name in names:
            os.replace(stage / name, output_dir / name)
    return summary


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=Path(__file__).parent / "data")
    parser.add_argument("--output", type=Path, default=Path(__file__).parent / "reports")
    parser.add_argument("--as-of", default=date.today().isoformat(), help="YYYY-MM-DD; defaults to today's local date")
    parser.add_argument("--max-age-days", type=int, default=180)
    parser.add_argument("--overwrite", action="store_true")
    args = parser.parse_args()
    try:
        as_of = parse_date(args.as_of, "--as-of")
        if as_of is None:
            raise InputError("--as-of cannot be empty")
        summary = generate(args.data, args.output, as_of, args.max_age_days, args.overwrite)
    except (InputError, OSError, UnicodeError, csv.Error) as exc:
        print(f"Cannot generate reports: {exc}")
        return 2
    print(f"{summary['requirements']} requirements: {summary['supported_drafts']} supported drafts; {summary['needs_work']} need work.")
    print(f"Reports: {args.output.resolve()}")
    print("Human review required. Evidence files were not inspected.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
