# Project 002 / IT Ticket Assistant

The Workbench demo helps a technician triage one incoming fictional request. It shows the rules that matched, the details already reported, and the questions still worth asking before a person reviews the reply.

## Try it

1. Open the portfolio homepage, find Project 002 in Case Files, and select **Highlight project**.
2. Choose the VPN sample and look for the terms behind its category suggestion.
3. Try **Training portal keeps rejecting the code** in the challenge queue. Look for which issue is current and which mention the assistant treats as background.
4. Edit the reply. After a category change, generate a fresh draft or confirm that the edited draft fits the selected category. Then mark it reviewed.
5. Clear the reply or change it after review and check the status again.
6. Open **Findings** to compare the original and revised rules against the technician's expected route. Select **Try ticket** to open that request in the queue.

## Questions behind the work

1. When should a ticket assistant suggest a category, and when should it leave that decision to the technician?
2. What information should the reply request once the technician knows which details the requester already supplied?
3. When should a draft lose its reviewed status?

## Read and test the code

Read `triage.js` for the original keyword rules and shared draft logic. Read `routing-context.js` to see how the revised rules distinguish active symptoms from other mentions. `workbench.js` handles the queue and review steps. `findings.js` compares the two versions on the same data.

From the repository root, run:

```powershell
node --test tests/ticket-assistant*.test.cjs
```

## Evaluation

The initial demo results describe the eight original fixtures under the original rules. The 14 challenge tickets in `evaluation.js` guided the revised routing. The 15 fictional requests in `fresh-cases.js` were written separately. Their text and expected routes were fixed before running the revised rules and were left out of rule tuning.

Each ticket records the reason for the expected category or manual review. Any manual route counts as agreement if a reviewer was expected. A manual route where a category was expected and a category suggestion that disagrees with the expected route are counted separately. The fresh set intentionally includes difficult wording, so use it to inspect failure modes. If it guides additional changes, write another independent set before testing those changes.

| Expected routes matched | Original rules | Revised rules |
| --- | ---: | ---: |
| Original challenge tickets | 8 of 14 | 14 of 14 |
| Fresh test tickets | 3 of 15 | 11 of 15 |

On the fresh set, three requests went to manual review where a category was expected, and one received an unexpected suggestion. The rules still struggle when a service recovers and then fails again, when a later sentence says an earlier issue has cleared, and when a closed ticket is quoted alongside a new issue. They also suggested account access for a folder permissions issue because the requester said they could sign in normally.

The browser demo holds edits in memory, and review records a local step. Replies are never sent.
