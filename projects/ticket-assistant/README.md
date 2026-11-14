# Project 002 / IT Ticket Assistant

The Workbench demo helps a technician triage one incoming fictional request. It shows the rules that matched, the details already reported, and the questions still worth asking before a person reviews the reply.

## Try it

1. Open the portfolio homepage, find Project 002 in Case Files, and select **Highlight project**.
2. Choose the VPN sample and look for the terms behind its category suggestion.
3. Try **Two problems in the intake room** in the previous evaluation queue. Compare the barcode scanner's startup fault with the VPN disconnect and see why the rules leave the route to a technician.
4. Edit the reply. After a category change, generate a fresh draft or confirm that the edited draft fits the selected category. Then mark it reviewed.
5. Clear the reply or change it after review and check the status again.
6. Open **Findings** to compare the original, previous, and current rules against the expected route. Select **Try ticket** to open that request in the queue.

## Questions behind the work

1. When should a ticket assistant suggest a category, and when should it leave that decision to the technician?
2. What information should the reply request once the technician knows which details the requester already supplied?
3. When should a draft lose its reviewed status?

## Read and test the code

Read `triage.js` for the original keyword rules and shared draft logic. The intermediate routing versions add recovery, event order, and separate evidence for observed problems. `routing-symptoms.js` builds on those versions to recognize more ways a person might describe a failing device, a connection symptom, or an identity error. `workbench.js` handles the queue and review steps. `findings.js` compares the original, previous, and current rules on the same cases.

From the repository root, run:

```powershell
node --test tests/ticket-assistant*.test.cjs
```

## Evaluation

The initial demo results describe eight fixtures under the original rules. The five earlier evaluation sets contain 87 regression cases. The ten misses in `novel-cases.js` guided the current changes. The 20 tickets in `unseen-cases.js` and their expected routes were written separately and reserved for evaluating the current rules.

Each ticket records the reason for the expected category or manual review. Any manual route counts as agreement if a reviewer was expected. A manual route where a category was expected and a category suggestion that disagrees with the expected route are counted separately. The fresh set intentionally includes difficult wording, so use it to inspect failure modes. If it guides additional changes, write another independent set before testing those changes.

The Workbench Findings tab shows the expected and actual routes for every ticket. In the barcode scanner example, the scanner gets stuck on its startup logo even when its data cable is unplugged. The VPN also fails. The rules surface both categories and leave the ticket for manual review.

| Expected routes matched | Original | Before | After |
| --- | ---: | ---: | ---: |
| Original challenge tickets | 8 of 14 | 14 of 14 | 14 of 14 |
| Earlier test tickets | 3 of 15 | 15 of 15 | 15 of 15 |
| Previous validation tickets | 12 of 18 | 18 of 18 | 18 of 18 |
| Prior evaluation tickets | 12 of 20 | 20 of 20 | 20 of 20 |
| Previous evaluation tickets | 9 of 20 | 10 of 20 | 20 of 20 |
| New fictional evaluation | 7 of 20 | 8 of 20 | 8 of 20 |

The new fictional set exposed five manual reviews where a category was expected and seven unexpected suggestions. In one ticket, the scanner “never gets past its opening splash screen” and the VPN also fails. The rules picked up the VPN but missed the scanner symptom, so they still suggested Network. The ticket should go to manual review. These examples remain available in Findings.

The browser demo holds edits in memory, and review records a local step. Replies are never sent.
