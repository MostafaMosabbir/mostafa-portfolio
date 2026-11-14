# Project 002 / IT Ticket Assistant

The Workbench demo helps a technician triage one incoming fictional request. It shows the rules that matched, the details already reported, and the questions still worth asking before a person reviews the reply.

## Try it

1. Open the portfolio homepage, find Project 002 in Case Files, and select **Highlight project**.
2. Choose the VPN sample and look for the terms behind its category suggestion.
3. Try **Cannot open a shared folder** in the previous test queue. Check why normal sign in is background and why the request still needs manual review.
4. Edit the reply. After a category change, generate a fresh draft or confirm that the edited draft fits the selected category. Then mark it reviewed.
5. Clear the reply or change it after review and check the status again.
6. Open **Findings** to compare the original, previous, and current rules against the expected route. Select **Try ticket** to open that request in the queue.

## Questions behind the work

1. When should a ticket assistant suggest a category, and when should it leave that decision to the technician?
2. What information should the reply request once the technician knows which details the requester already supplied?
3. When should a draft lose its reviewed status?

## Read and test the code

Read `triage.js` for the original keyword rules and shared draft logic. `routing-context.js` is the previous version, which checks phrases for signs of failure or recovery. `routing-refined.js` adds rules for events described in sequence, quotes about closed tickets, and healthy sign in. `workbench.js` handles the queue and review steps. `findings.js` runs all three versions on the same cases.

From the repository root, run:

```powershell
node --test tests/ticket-assistant*.test.cjs
```

## Evaluation

The initial demo results describe the eight original fixtures under the original rules. The 14 challenge tickets in `evaluation.js` guided the previous version. The 15 fictional requests in `fresh-cases.js` were independent tests of that version. Four misses on those cases guided the current rules, so they now serve as regression cases. `validation-cases.js` contains separately written requests whose expected routes were set before testing the current version. The current rules were developed without using that set.

Each ticket records the reason for the expected category or manual review. Any manual route counts as agreement if a reviewer was expected. A manual route where a category was expected and a category suggestion that disagrees with the expected route are counted separately. The fresh set intentionally includes difficult wording, so use it to inspect failure modes. If it guides additional changes, write another independent set before testing those changes.

The Workbench Findings tab shows all three evaluations and the outcome of each ticket. A shared folder permissions request goes to manual review when sign in works. This demo has no dedicated permissions category.

| Expected routes matched | Original | Before | After |
| --- | ---: | ---: | ---: |
| Original challenge tickets | 8 of 14 | 14 of 14 | 14 of 14 |
| Previous test tickets | 3 of 15 | 11 of 15 | 15 of 15 |
| New validation tickets | 12 of 18 | 12 of 18 | 13 of 18 |

The new set exposed four extra manual reviews and one incorrect suggestion. In the latter case, advice quoted from a guide mentioned the network, and the rules gave it more weight than the headset symptom. The set stays available in Findings so those misses can be inspected.

The browser demo holds edits in memory, and review records a local step. Replies are never sent.
