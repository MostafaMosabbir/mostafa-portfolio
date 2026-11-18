# Security Proposal Workspace: browser prototype

This is the browser interface for a security review draft. It organizes
requirements, controls, and evidence records and identifies missing or
incomplete **recorded information**. A person must review the actual work and
supporting evidence. The tool does not open evidence references, verify that a
safeguard operates, or determine compliance.

The interface is a prototype. Browser checks cover loading the fictional
assessment, reassessing it, and reopening downloaded records. Start with
fictional information and keep
passwords, access tokens, and other secrets out of the form and exports.

## Open the workspace

From **Tools** on the Workbench or from the **Project 004 Dossier**, choose
**Try a sample** or **Build an assessment**. The Workbench opens the workspace
on the same page and keeps your edits when you switch views. The Dossier
opens the standalone workspace. Both views require JavaScript.

For local development, serve the portfolio folder using a local HTTP server and
open its Tools section. The workspace uses `index.html`, `workspace.css`,
`workspace-ui.js`, `action-plan-ui.js`, `security-engine.js`, `fictional-sample.js`,
`guided-sample.js`, and `workspace-geometry.js`. Keep these files together.

## Follow one fictional requirement

In **Try a sample**, select **Account protection** or **Backup recovery** and
apply the proposed change. Both examples use the assessment engine. Each
starts with four supported drafts out of 15 requirements and moves to five.
Open **See the technical trail** to see the framework reference and record IDs.

Select **Open full sample in editor** to work through the same changes by hand.
The editor loads the original records with October 28, 2026 and a 180 day
review window. The Dossier also links directly to the fictional action plan.

1. Select **Edit MFA control** and enter `EV-007` in **Linked evidence IDs**
   for `CTL-007`.
2. Select **Back to comparison**, then **Review assessment again**. Look at
   `REQ-007` and the reason on each side. The review has five supported drafts.
3. Select **Load fictional sample** to reset, then try **Edit backup control** and
   **Edit backup evidence**. Use the
   [backup walkthrough](../../cybersecurity/security-proposal-workspace/backup-reassessment-demo/index.html)
   to update `CTL-010` and `EV-010` for the simulated after state.

For a workspace you enter or import, run a review and select **Use review as
baseline** before editing. The comparison uses requirement IDs. An added or
removed ID appears as its own change. Both reviews must use the same date
and freshness window to compare individual findings. Workspaces download
as JSON. The baseline and comparison live in the current session.

In **Review findings**, select **Show only findings that need work** to focus
on open items. Expand **Go to records** on a finding or the current side of a
comparison to open its requirement, safeguards, or linked evidence. Use
**Review changes** on the record to run the assessment again after an edit.

### Assign work in Findings

The action plan lists one action per open requirement, sorted by priority and
due date. Open an action to see the gaps and the evidence to review. Set the
priority, owner and due date, then select **Apply changes**. The fictional
sample starts with proposed assignments and deadlines. New workspaces start
with the requirement's priority and blank owner and date fields.

Plan edits schedule the work. To clear a finding, update the requirement,
safeguard or evidence as needed and run the review again. If the same
requirement becomes open again, its assignment returns to the plan.

### Check that backup status and notes agree

From the fresh fictional sample, change only `CTL-010` to **implemented** and
review again. Its original notes still say the restore exercise is incomplete,
so the finding stays **Needs work** and the total stays at 4 supported drafts.
The finding asks the reviewer to reconcile the status and notes.

Complete the exercise by recording the simulated reviewed restore and updating
`EV-010` as described above. The total then reaches 5 supported drafts.
The separate `REQ-015` integrity finding keeps its future review date gap.

Both the browser and Python assessor check explicit current unfinished restore
wording, including incomplete restore tests and a completed restore with
unfinished verification. Historical and negated statements such as
“the restore was incomplete, but is now complete” and “no longer incomplete”
pass this check. This rule recognizes specific wording. A person still reviews
the complete notes and the actual supporting evidence.

### Start from a blank workspace

1. Under **Assessment settings**, choose an assessment date and review freshness window. The default window
   of 180 days is a configurable project rule, not a NIST requirement. The
   selected date determines whether review dates are future or stale.
2. Complete the requirement record, including its ID, description, priority,
   source and HTTPS source URL. Record the coverage-review status, reviewer,
   and review date. An empty reviewer or date becomes a finding.
3. Add a control and give it a unique ID, such as `CTL-001`. Enter that ID in
   the requirement's **Mapped control IDs** field. Record its status, owner,
   statement, and, if it is not implemented, a target date.
4. Add an evidence record such as `EV-001`. Enter that ID in the control's
   **Linked evidence IDs** field. Record a reference, review status, and review
   date. References are plain text and are not opened by the workspace.
5. Select **Review assessment** to see the findings. A **Supported draft** means
   the supplied records passed the tool's metadata checks; it is not a
   compliance verdict or independent confirmation that a control works.

IDs must start with an uppercase letter and contain only uppercase letters,
digits, or hyphens. They must be 2 to 40 characters long and unique within
their record type. Separate multiple mapped IDs with semicolons, for example
`CTL-001; CTL-002`. Each referenced record must exist. All mapped controls and
evidence records must pass the checks; a missing mapping is reported as a gap.

## Keep and reopen your work

Use **Download open findings CSV** to take the current open gaps into a
follow up review. It contains one row per gap with the requirement ID,
priority, domain, and finding, ordered from critical to low priority.
It becomes available again after you review any changes that still have
open gaps.

Entries stay in the current page's memory and are not automatically saved.
Select **Download workspace** to request a JSON file and confirm that the file
was saved before leaving or refreshing. The workspace file includes action plan
edits. Use **Open workspace file** to reopen it. Earlier workspace files also
open and build the plan when reviewed. Opening a file replaces the current form
after confirmation. Downloaded files can contain sensitive information; the
person using the workspace is responsible for storing them appropriately.

After a review, **Download review draft** requests a plain-text summary. It
contains findings and selected control details, not a complete proposal. The
JSON workspace file retains the entered records for later editing.

The workspace is designed to process entries in the browser and does not
submit assessment inputs to an application server. Visiting the site can still
create ordinary hosting logs, and browser settings or extensions can affect the
environment. Do not assume that an exported file is encrypted.

## How the pieces fit together

- `index.html` defines the page and its privacy and scope notices.
- `workspace.css` styles the form for desktop and smaller screens.
- `workspace-ui.js` creates editable records, handles local files, and
  compares the current findings with the saved baseline.
- `action-plan-ui.js` displays open findings as editable assignments.
- `security-engine.js` validates the records and checks their recorded metadata.
- `fictional-sample.js` contains the report's fictional records. Run
  `python -B build_fictional_sample.py --check` from this folder to check the
  generated sample, or omit `--check` to rebuild it from the sample CSVs.
- `workspace-geometry.js` draws the optional background shape; it does not read
  or transmit assessment information.
- `test_security_parity.py` compares the browser engine with the Python evaluator
  using fictional scenarios. With Python and Node installed, run it from this
  folder with `python test_security_parity.py`.

The browser engine is JavaScript. The existing local `proposal.py` tool is a
separate Python implementation that reads CSV files. Browser workspace JSON is
not a Python CSV input, and Python CSV files are not browser workspace JSON.
The parity tests compare the 42 fictional cases and every row of the full
sample at two different review windows.

## If something needs attention

- **The form does not appear:** Check that JavaScript is enabled and the
  workspace files are present.
- **An ID is rejected:** Check its format and whether another record of that
  type uses the same ID.
- **An ID is unknown:** Add the referenced record or correct the mapping. Use
  semicolons between multiple IDs.
- **A review remains incomplete:** Read each finding. Check ownership, control
  status, mapped evidence, review dates, and the selected assessment date.
- **A workspace does not open:** Use a JSON workspace file created by this
  interface and check the displayed error. The interface limits imports to
  2 MB and 500 records of each type.

Review results are based on the information entered. They do not replace a
qualified human review of an organization's actual environment and evidence.
