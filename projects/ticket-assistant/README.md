# Project 002 / IT Ticket Assistant

The Workbench demo helps a technician triage one incoming fictional request. It shows the rules that matched, the details already reported, and the questions still worth asking before a person reviews the reply.

## Try it

1. Open the portfolio homepage, find Project 002 in Case Files, and select **Highlight project**.
2. Choose the VPN sample and look for the terms behind its category suggestion.
3. Try **Cannot connect or scan documents** in the prior evaluation queue. Check the evidence for both active faults and why the rules leave the route to a technician.
4. Edit the reply. After a category change, generate a fresh draft or confirm that the edited draft fits the selected category. Then mark it reviewed.
5. Clear the reply or change it after review and check the status again.
6. Open **Findings** to compare the original, previous, and current rules against the expected route. Select **Try ticket** to open that request in the queue.

## Questions behind the work

1. When should a ticket assistant suggest a category, and when should it leave that decision to the technician?
2. What information should the reply request once the technician knows which details the requester already supplied?
3. When should a draft lose its reviewed status?

## Read and test the code

Read `triage.js` for the original keyword rules and shared draft logic. `routing-context.js` checks for signs of failure or recovery. `routing-refined.js` adds event order and healthy sign in. `routing-observed.js` distinguishes observations from attributed advice. `routing-independent.js` adds evidence for independently failing devices, more ways to describe old or current messages, and specific diagnostic details that help interpret a generic title. `workbench.js` handles the queue and review steps. `findings.js` compares the original, previous, and current rules on the same cases.

From the repository root, run:

```powershell
node --test tests/ticket-assistant*.test.cjs
```

## Evaluation

The initial demo results describe eight fixtures under the original rules. The 14 challenge tickets in `evaluation.js`, the 15 requests in `fresh-cases.js`, the 18 requests in `validation-cases.js`, and the 20 requests in `transfer-cases.js` now serve as regression cases. The six misses in the 20 ticket set guided the current changes. The tickets in `novel-cases.js` and their expected routes were written separately and reserved for evaluating the current rules.

Each ticket records the reason for the expected category or manual review. Any manual route counts as agreement if a reviewer was expected. A manual route where a category was expected and a category suggestion that disagrees with the expected route are counted separately. The fresh set intentionally includes difficult wording, so use it to inspect failure modes. If it guides additional changes, write another independent set before testing those changes.

The Workbench Findings tab shows the expected and actual routes for every ticket. The VPN and scanner example contains two observed problems. The current rules surface both categories and leave the ticket for manual review.

| Expected routes matched | Original | Before | After |
| --- | ---: | ---: | ---: |
| Original challenge tickets | 8 of 14 | 14 of 14 | 14 of 14 |
| Earlier test tickets | 3 of 15 | 15 of 15 | 15 of 15 |
| Previous validation tickets | 12 of 18 | 18 of 18 | 18 of 18 |
| Prior evaluation tickets | 12 of 20 | 14 of 20 | 20 of 20 |
| Fresh evaluation tickets | 9 of 20 | 10 of 20 | 10 of 20 |

The overall score stayed the same on the fresh set. The current rules sent seven tickets to manual review where a category was expected and made three unexpected suggestions. In one request, a barcode scanner gets stuck on its startup logo while the VPN is also failing. The expected route was manual review. The rules still suggested Network.

The browser demo holds edits in memory, and review records a local step. Replies are never sent.
