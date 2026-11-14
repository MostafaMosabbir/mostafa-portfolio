# Project 002 / IT Ticket Assistant

The Workbench demo helps a technician triage one incoming fictional request. It shows the rules that matched, the details already reported, and the questions still worth asking before a person reviews the reply.

## Try it

1. Open the portfolio homepage, find Project 002 in Case Files, and select **Highlight project**.
2. Choose the VPN sample and look for the terms behind its category suggestion.
3. Switch to the Outlook and VPN sample. Both categories match. Read the reported facts before picking a category.
4. Edit the reply. After a category change, generate a fresh draft or confirm that the edited draft fits the selected category. Then mark it reviewed.
5. Clear the reply or change it after review and check the status again.
6. Open **Findings** to compare each fictional request's expected route with the result from the same rules.

## Questions behind the work

1. When should a ticket assistant suggest a category, and when should it leave that decision to the technician?
2. What information should the reply request once the technician knows which details the requester already supplied?
3. When should a draft lose its reviewed status?

## Read and test the code

Read `triage.js` for matching, question selection, and evaluation. Read `workbench.js` to follow the draft and review state. `findings.js` uses the same rules to show the sample results.

From the repository root, run:

```powershell
node --test tests/ticket-assistant-triage.test.cjs
```

Each expected route is set in the fictional fixture. Use a fresh set of examples to evaluate generalization, especially requests with quoted text, negation, or misleading context. The browser demo holds edits in memory, and review records a local step. Replies are never sent.
