# Project 002 / IT Ticket Assistant

The Workbench demo helps a technician triage one incoming fictional request. It shows the rules that matched, the details already reported, and the questions still worth asking before a person reviews the reply.

## Try it

1. Open the portfolio homepage, find Project 002 in Case Files, and select **Highlight project**.
2. Choose the VPN sample and look for the terms behind its category suggestion.
3. Try both versions of **Shipping tool cannot see its reader** in the shipping app evaluation. The original reader fails during startup and the app detects a spare. Both versions should route to Devices and hardware.
4. Edit the reply. After a category change, generate a fresh draft or confirm that the edited draft fits the selected category. Then mark it reviewed.
5. Clear the reply or change it after review and check the status again.
6. Open **Findings** to compare the original, previous, and current rules against the expected route. Select **Try ticket** to open that request in the queue.

## Questions behind the work

1. When should a ticket assistant suggest a category, and when should it leave that decision to the technician?
2. What information should the reply request once the technician knows which details the requester already supplied?
3. When should a draft lose its reviewed status?

## Read and test the code

Read `triage.js` for the original keyword rules and shared draft logic. The earlier routing versions add recovery, event order, and evidence for separate faults. `routing-substitution.js` checks whether an application detects a spare when the original device fails during startup. `workbench.js` handles the queue and review steps. `findings.js` compares the original, previous, and current rules on the same cases.

From the repository root, run:

```powershell
node --test tests/ticket-assistant*.test.cjs
```

## Evaluation

The initial demo results describe eight fixtures under the original rules. The ten earlier evaluations contain 187 regression cases. The six misses in `sentence-order-cases.js` guided the current revision. The tickets in `substitution-cases.js` and their expected routes were written independently and reserved for evaluating the current rules.

Each ticket records the reason for the expected category or manual review. Any manual route counts as agreement if a reviewer was expected. A manual route where a category was expected and a category suggestion that disagrees with the expected route are counted separately. The fresh set intentionally includes difficult wording, so use it to inspect failure modes. If it guides additional changes, write another independent set before testing those changes.

The Workbench Findings tab shows the expected and actual routes for every ticket. In the shipping app example, the original reader fails before the computer is involved, and the app can detect a spare reader. This evidence points to the original reader in both sentence orders.

| Expected routes matched | Original | Before | After |
| --- | ---: | ---: | ---: |
| Original challenge tickets | 8 of 14 | 14 of 14 | 14 of 14 |
| Earlier test tickets | 3 of 15 | 15 of 15 | 15 of 15 |
| Previous validation tickets | 12 of 18 | 18 of 18 | 18 of 18 |
| Prior evaluation tickets | 12 of 20 | 20 of 20 | 20 of 20 |
| Previous evaluation tickets | 9 of 20 | 20 of 20 | 20 of 20 |
| Scanner and VPN evaluation | 7 of 20 | 20 of 20 | 20 of 20 |
| Barcode reader and VPN evaluation | 11 of 20 | 20 of 20 | 20 of 20 |
| Device startup evaluation | 12 of 20 | 20 of 20 | 20 of 20 |
| Reader symptom evaluation | 10 of 20 | 20 of 20 | 20 of 20 |
| Shipping app evaluation | 10 of 20 | 14 of 20 | 20 of 20 |
| Fresh fictional evaluation | 12 of 20 | 13 of 20 | 13 of 20 |

Both versions produced the same routes on the fresh set. They matched both phrasings in two of five sentence order pairs. One pair still went to manual review when the original scanner stopped during its own paper test and the shipping app received an image with the spare. The fresh tickets were kept out of rule tuning.

The browser demo holds edits in memory, and review records a local step. Replies are never sent.
