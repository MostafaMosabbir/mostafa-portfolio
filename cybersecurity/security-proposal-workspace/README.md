# Security Proposal Workspace

**Working prototype — From Requirements to Safeguards.**

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

## Project status and next milestone

The fictional assessment, matrix, remediation register, and MFA reassessment
walkthrough are published. The next milestone is to review and understand the
named scenarios, improve the report, and test the completed project. An editable
dashboard and fictional evidence artifacts remain possible future work. The tool
has no accounts, uploads, AI service, external connectors, or automatic certification.

## Matrix and remediation register

The report now groups requirements into clickable domain tiles. Each tile shows
its recorded state, review-item count and associated action count. The filter
changes only the visible tiles. The complete findings and action table remain
available below, including without JavaScript.

Optional `data/actions.csv` stores actions, requirement IDs, accountable roles,
due dates, status and verification criteria. All fields are required; IDs must
be unique and refer to an existing requirement. Supported statuses are `planned`,
`in_progress`, and `ready_for_review`. There is deliberately no automatic close
button. The fictional November 15 deadlines are planning assumptions, not
framework requirements. Due dates earlier than the report date are overdue.

The action register does not influence the assessment verdict. To resolve a gap,
update the relevant controls, evidence or coverage-review records after the work
and human review, then rerun the assessment. `assessment.json` contains the
register, and `summary.json` hashes its input bytes alongside the other inputs.

Try this in a copy: change ACT-005 to `ready_for_review` and rerun. REQ-007 still
needs work because its evidence mapping is missing. Explain why an action status
is not sufficient proof. Next, follow the existing MFA evidence-mapping exercise
and compare the outputs. Do not treat fixture changes as real evidence review.

Preview command: `python proposal.py --as-of 2026-10-28 --output preview-review`.
The matrix and action register are included in the published demonstration.

The named scenario flow displays values from the current assessment run; it
does not alter results. Display names are limited to their matching fictional
requirements, while requirement and control IDs remain available as references.
For the published portfolio's `reports/` folder only, add `--portfolio-nav`
when generating a report to include the portfolio and MFA walkthrough links.
Those relative links depend on the published folder layout and are omitted from
ordinary local runs.

The portfolio homepage displays a fixed fictional snapshot in the Method tab.
It does not run Python or inspect evidence. After regenerating the published
sample's `reports/assessment.json`, run `python scripts/build_security_sample.py`
from the portfolio root to refresh `scripts/security-sample-data.js` from that
report. Review the generated snapshot before publishing; it is not a place for
workplace or other sensitive records.

## Reassessment walkthrough

[Read the fictional MFA evidence example](evidence-examples/mfa-coverage.html)
for the scenario scope, recorded review metadata, reviewer questions, and
assessment progression. It is an educational example, not configuration proof.

Run `python demo_reassessment.py --output my-reassessment` to reproduce three
fictional runs. Open `my-reassessment/index.html` to compare them.
The example demonstrates 4, 4, then 5 supported drafts. Marking an action ready
does not clear a finding; adding the existing synthetic evidence mapping does.
The original input files remain unchanged. No real evidence is inspected.
