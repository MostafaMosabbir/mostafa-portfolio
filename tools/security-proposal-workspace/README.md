# Security Proposal Workspace: browser prototype

This is the browser interface for a security review draft. It organizes
requirements, controls, and evidence records and identifies missing or
incomplete **recorded information**. A person must review the actual work and
supporting evidence. The tool does not open evidence references, verify that a
safeguard operates, or determine compliance.

The interface is a prototype. The browser engine was compared with the Python
evaluator across 42 fictional cases; browser integration and real-world use
need further review. Start with fictional information and keep
passwords, access tokens, and other secrets out of the form and exports.

## Open the workspace

When the website version is available, open the portfolio and select **Tools**
in the header, then select **Open workspace here**. JavaScript must be
enabled. A separate workspace page may also be opened from the Tools section.

For local development, serve the portfolio folder using a local HTTP server and
open its Tools section. The workspace consists of `index.html`, `workspace.css`,
`workspace-ui.js`, `security-engine.js`, and `workspace-geometry.js`; keep these
files together.

## Follow one fictional requirement

1. Choose an **assessment date** and review freshness window. The default window
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

Entries stay in the current page's memory and are not automatically saved.
Select **Download workspace** to request a JSON file and confirm that the file
was saved before leaving or refreshing. Use **Open workspace file** to reopen a
previously downloaded JSON workspace. Opening one replaces the current form
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
- `workspace-ui.js` creates editable records, handles local files, and displays
  the findings returned by the engine.
- `security-engine.js` validates the records and checks their recorded metadata.
- `workspace-geometry.js` draws the optional background shape; it does not read
  or transmit assessment information.
- `test_security_parity.py` compares the browser engine with the Python evaluator
  using fictional scenarios. With Python and Node installed, run it from this
  folder with `python test_security_parity.py`.

The browser engine is JavaScript. The existing local `proposal.py` tool is a
separate Python implementation that reads CSV files. Browser workspace JSON is
not a Python CSV input, and Python CSV files are not browser workspace JSON.
The 42 comparison cases provide evidence about the checked scenarios, not a
guarantee that the implementations behave identically for every possible input.

## If something needs attention

- **The form does not appear:** Check that JavaScript is enabled and all four
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
