# Project 002 / IT Ticket Assistant

The Workbench demo helps a technician triage one incoming fictional request. It shows the rules that matched, the details already reported, and the questions still worth asking before a person reviews the reply.

## Try it

1. Open the portfolio homepage, find Project 002 in Case Files, and select **Highlight project**.
2. Choose the VPN sample and look for the terms behind its category suggestion.
3. Try **Two faults at the dispatch desk** in the scanner and VPN evaluation queue. Check how the rules recognize a device that cannot get past its splash screen alongside a separate VPN fault.
4. Edit the reply. After a category change, generate a fresh draft or confirm that the edited draft fits the selected category. Then mark it reviewed.
5. Clear the reply or change it after review and check the status again.
6. Open **Findings** to compare the original, previous, and current rules against the expected route. Select **Try ticket** to open that request in the queue.

## Questions behind the work

1. When should a ticket assistant suggest a category, and when should it leave that decision to the technician?
2. What information should the reply request once the technician knows which details the requester already supplied?
3. When should a draft lose its reviewed status?

## Read and test the code

Read `triage.js` for the original keyword rules and shared draft logic. The intermediate routing versions add recovery, event order, and separate evidence for observed problems. `routing-evidence.js` uses supported symptoms as evidence across clauses and preserves manual review when it detects faults in different categories. `workbench.js` handles the queue and review steps. `findings.js` compares the original, previous, and current rules on the same cases.

From the repository root, run:

```powershell
node --test tests/ticket-assistant*.test.cjs
```

## Evaluation

The initial demo results describe eight fixtures under the original rules. The six earlier evaluation sets contain 107 regression cases. The twelve misses in `unseen-cases.js` guided the current revision. The tickets in `verify-cases.js` and their expected routes were written separately and reserved for evaluating the current rules.

Each ticket records the reason for the expected category or manual review. Any manual route counts as agreement if a reviewer was expected. A manual route where a category was expected and a category suggestion that disagrees with the expected route are counted separately. The fresh set intentionally includes difficult wording, so use it to inspect failure modes. If it guides additional changes, write another independent set before testing those changes.

The Workbench Findings tab shows the expected and actual routes for every ticket. In the dispatch desk example, the scanner cannot get past its splash screen even when it is unplugged from the computer, and the VPN session independently drops. The rules surface the device and network clues and leave the ticket for manual review.

| Expected routes matched | Original | Before | After |
| --- | ---: | ---: | ---: |
| Original challenge tickets | 8 of 14 | 14 of 14 | 14 of 14 |
| Earlier test tickets | 3 of 15 | 15 of 15 | 15 of 15 |
| Previous validation tickets | 12 of 18 | 18 of 18 | 18 of 18 |
| Prior evaluation tickets | 12 of 20 | 20 of 20 | 20 of 20 |
| Previous evaluation tickets | 9 of 20 | 20 of 20 | 20 of 20 |
| Scanner and VPN evaluation | 7 of 20 | 8 of 20 | 20 of 20 |
| Fresh fictional evaluation | 11 of 20 | 14 of 20 | 15 of 20 |

On the fresh set, one ticket went to manual review where a category was expected and four received unexpected suggestions. The rules still missed a hardware clue when the reporter said the barcode reader sat on the maker’s name and never reached its menu. That ticket also reported a VPN disconnect on a different computer and should have gone to manual review.

The browser demo holds edits in memory, and review records a local step. Replies are never sent.
