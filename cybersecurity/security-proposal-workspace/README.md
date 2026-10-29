# Security Proposal Workspace

**Local development prototype — From Requirements to Safeguards.**

This Python tool checks whether recorded security statements have owners,
implementation status, mapped controls, current evidence-review metadata, and
human coverage review. It produces an offline review page and traceable exports.
It does not inspect evidence files or establish that a safeguard works.

## Start here

Open this folder in VS Code. In its terminal, use Python 3.10 or newer:

```powershell
# Run the fictional assessment with a fixed, reproducible date.
python proposal.py --as-of 2026-10-28 --output my-review

# Check the behavior with independent automated tests.
python -m unittest -v
```

Open `my-review/review.html` in your browser. No web server or Python packages
are needed. A pre-generated example is also included in `reports/review.html`.
If `python` is not your installed Python command, use `py` instead.

To update an existing output directory, add `--overwrite` deliberately.
Without `--as-of`, the tool uses your computer's current date, so evidence ages
and results can change. `--max-age-days 180` is a configurable project rule,
not a NIST-prescribed interval. Output files are replaced individually, not as
one atomic transaction; do not run competing writers into the same folder.

## Fictional marketing-company scenario

The demo concerns a small marketing agency working with client campaign files,
advertising accounts, design software, managed laptops and freelance suppliers.
Every person, review, implementation claim and evidence reference is invented.
No workplace exports or private RFP documents are included. Evidence IDs point
to illustrative references, not actual supporting documents.

The selected scope excludes a complete legal applicability assessment, full
framework coverage, payment-card processing, and any assumption that healthcare
regulations apply. Priority values are illustrative judgments, not computed risk
scores. Before a real assessment, establish systems, data, access boundaries,
business consequences and obligations with the organization.

## Understand the three inputs

1. `data/requirements.csv`: the narrow scenario questions, their priorities,
   source references, mapped controls and human coverage-review records.
2. `data/controls.csv`: what the company says it does, who owns it, whether it
   is implemented, its target date and its evidence references.
3. `data/evidence.csv`: where a reviewer could find evidence and the recorded
   review outcome/date. The program never opens those references.

IDs connect the files. Separate multiple IDs with semicolons. All controls and
evidence listed in a mapping are required; there is no alternative/OR logic yet.
Keep the supplied column names and order. Save CSV as UTF-8.

The program rejects malformed inputs rather than quietly skipping them.
Imported prose is escaped in reports; spreadsheet formula prefixes are guarded
in exported CSV files. Input hashes describe the exact bytes that were parsed.

## What the results mean

- `supported_draft`: this scenario requirement passed the program's metadata
  checks. It remains an unverified draft for final human review.
- `needs_work`: at least one ownership, status, mapping, review or evidence check
  needs attention. Inspect the listed reasons before writing an external claim.

At **2026-10-28**, the bundled sample contains **15 requirements**, with **4
supported drafts and 11 needing work**. These counts are not a compliance score.
The sample deliberately includes stale and future-dated evidence, incomplete
controls, a missing owner, rejected evidence and an unmapped requirement.

Outputs: `review.html` for reading; `draft-response.md` for internal response
review; `crosswalk.csv` for mappings; `gaps.csv` for review items;
`summary.json` for counts/provenance; `assessment.json` for detailed results.

## Source and mapping limits

Related outcome identifiers were checked against **NIST CSF 2.0**, NIST CSWP 29,
published February 26, 2024, Appendix A, on October 28, 2026:
https://doi.org/10.6028/NIST.CSWP.29

The requirements and controls here are original, narrower scenario checks.
Their mappings indicate relevance; they are not NIST-authored implementation
requirements or proof that a whole CSF outcome is met. CSF describes outcomes
and does not prescribe the specific safeguards in this demo. No HIPAA, CIS,
ISO or SOC 2 catalog is bundled in this release.

## Learning exercise

1. Run the sample and open `REQ-007`: MFA is recorded as implemented, but its
   control has no mapped evidence. Notice why status alone is insufficient.
2. Copy `data` to a separate practice folder. In that copy, set `CTL-007`'s
   `evidence_ids` to `EV-007`. This is a fictional exercise, not real verification.
3. Run `python proposal.py --data practice --output practice-review --as-of 2026-10-28`.
4. Compare the reports: supported drafts should rise from 4 to 5. Explain what
   a human would still need to examine before endorsing the MFA claim.

`make_sample.py` recreates the bundled fixtures and **overwrites** `data/*.csv`.
Keep edited practice data elsewhere. Read the comments in `proposal.py` to
follow input validation, evaluation, escaping and report generation.

## Next milestone

Add a remediation action register with explicit actions, accountable owners,
deadlines and verification criteria. Then build an editable dashboard, create
actual fictional evidence artifacts, review mapping coverage and personalize
the public case study before publishing. This version is local and has no
accounts, uploads, AI service, external connectors or automatic certification.
