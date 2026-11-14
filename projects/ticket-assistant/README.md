# Project 002 / IT Ticket Assistant

The Workbench demo helps a technician triage one incoming fictional request. It shows the rules that matched, the details already reported, and the questions still worth asking before a person reviews the reply.

## Try it

1. Open the portfolio homepage, find Project 002 in Case Files, and select **Highlight project**.
2. Choose the VPN sample and look for the terms behind its category suggestion.
3. Try **Headset sound fades out** in the previous validation queue. Look for the local audio failure and the guide advice the assistant treats as background.
4. Edit the reply. After a category change, generate a fresh draft or confirm that the edited draft fits the selected category. Then mark it reviewed.
5. Clear the reply or change it after review and check the status again.
6. Open **Findings** to compare the original, previous, and current rules against the expected route. Select **Try ticket** to open that request in the queue.

## Questions behind the work

1. When should a ticket assistant suggest a category, and when should it leave that decision to the technician?
2. What information should the reply request once the technician knows which details the requester already supplied?
3. When should a draft lose its reviewed status?

## Read and test the code

Read `triage.js` for the original keyword rules and shared draft logic. `routing-context.js` first checks for signs of failure or recovery. `routing-refined.js` adds event order and healthy sign in. `routing-observed.js` builds on that version by distinguishing observations from attributed advice and using clearer evidence of lockouts, recurrence, and wired connection failures. `workbench.js` handles the queue and review steps. `findings.js` compares the original, previous, and current rules on the same cases.

From the repository root, run:

```powershell
node --test tests/ticket-assistant*.test.cjs
```

## Evaluation

The initial demo results describe eight fixtures under the original rules. The 14 challenge tickets in `evaluation.js`, the 15 requests in `fresh-cases.js`, and the 18 requests in `validation-cases.js` now serve as regression cases. Each set was first used to evaluate an earlier version. The five misses in the 18 ticket set guided the current changes. The tickets in `transfer-cases.js` and their expected routes were written separately and reserved for evaluating the current rules.

Each ticket records the reason for the expected category or manual review. Any manual route counts as agreement if a reviewer was expected. A manual route where a category was expected and a category suggestion that disagrees with the expected route are counted separately. The fresh set intentionally includes difficult wording, so use it to inspect failure modes. If it guides additional changes, write another independent set before testing those changes.

The Workbench Findings tab shows the expected and actual routes for every ticket. In the headset example, the original request mentions advice to check the network and a local audio test where the headset loses sound. The current rules use the local observation to suggest Devices and hardware.

| Expected routes matched | Original | Before | After |
| --- | ---: | ---: | ---: |
| Original challenge tickets | 8 of 14 | 14 of 14 | 14 of 14 |
| Earlier test tickets | 3 of 15 | 15 of 15 | 15 of 15 |
| Previous validation tickets | 12 of 18 | 13 of 18 | 18 of 18 |
| Fresh evaluation tickets | 12 of 20 | 13 of 20 | 14 of 20 |

The current version sent five fresh tickets to manual review where a category was expected. It also suggested Network for a report of both a VPN disconnect and a scanner fault. That ticket called for manual review because it described two distinct problems.

The browser demo holds edits in memory, and review records a local step. Replies are never sent.
