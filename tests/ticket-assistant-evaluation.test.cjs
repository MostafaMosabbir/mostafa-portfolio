const assert = require("node:assert/strict");
const { test } = require("node:test");
const triage = require("../projects/ticket-assistant/triage.js");
const revised = require("../projects/ticket-assistant/routing-context.js");
const fresh = require("../projects/ticket-assistant/fresh-cases.js");
const current = require("../projects/ticket-assistant/routing-refined.js");
const validation = require("../projects/ticket-assistant/validation-cases.js");
const observed = require("../projects/ticket-assistant/routing-observed.js");
const transfer = require("../projects/ticket-assistant/transfer-cases.js");
const independent = require("../projects/ticket-assistant/routing-independent.js");
const novel = require("../projects/ticket-assistant/novel-cases.js");
const symptoms = require("../projects/ticket-assistant/routing-symptoms.js");
const unseen = require("../projects/ticket-assistant/unseen-cases.js");
const evidence = require("../projects/ticket-assistant/routing-evidence.js");
const verify = require("../projects/ticket-assistant/verify-cases.js");
const { cases, evaluateChallenge } = require("../projects/ticket-assistant/evaluation.js");

test("the challenge tickets have independent identifiers and documented expected routes", () => {
  const ids = new Set(triage.samples.map(sample => sample.id));
  for (const ticket of cases) {
    assert.equal(ids.has(ticket.id), false, ticket.id);
    ids.add(ticket.id);
    assert.ok(ticket.rationale);
    assert.ok(ticket.expected.category === null ||
      triage.categories.some(category => category.id === ticket.expected.category));
  }
});

test("the original rules agree on eight routes and miss six challenge expectations", () => {
  const { total, agreed, extraReview, unexpectedSuggestion, rows } = evaluateChallenge(triage.analyze);
  assert.deepEqual({ total, agreed, extraReview, unexpectedSuggestion },
    { total: 14, agreed: 8, extraReview: 4, unexpectedSuggestion: 2 });
  const byId = new Map(rows.map(ticket => [ticket.id, ticket]));
  assert.equal(byId.get("evaluation-office-wireless").outcome, "extraReview");
  assert.equal(byId.get("evaluation-structured-lockout").actual.status, "unrecognized");
  assert.equal(byId.get("evaluation-expired-code").actual.suggestedCategory, "hardware");
  assert.equal(byId.get("evaluation-folder-permissions").outcome, "unexpectedSuggestion");
  assert.equal(byId.get("evaluation-two-problems").outcome, "agreed");
  assert.equal(byId.get("evaluation-little-context").outcome, "agreed");
});

test("the comparison can evaluate a different analyzer against the same expected routes", () => {
  let checks = 0;
  const result = evaluateChallenge(fields => {
    const ticket = cases[checks++];
    assert.deepEqual(fields, ticket.fields);
    return { suggestedCategory: ticket.expected.category };
  });
  assert.equal(result.agreed, cases.length);
  assert.equal(result.extraReview, 0);
  assert.equal(result.unexpectedSuggestion, 0);
});

test("the revised rules resolve all six misses on the original challenge set", () => {
  const { total, agreed, extraReview, unexpectedSuggestion } = evaluateChallenge(revised.analyze);
  assert.deepEqual({ total, agreed, extraReview, unexpectedSuggestion },
    { total: 14, agreed: 14, extraReview: 0, unexpectedSuggestion: 0 });
});

test("an independently labeled test set compares both versions without hiding misses", () => {
  const usedIds = new Set([...cases, ...triage.samples].map(ticket => ticket.id));
  for (const ticket of fresh) {
    assert.equal(usedIds.has(ticket.id), false);
    assert.ok(ticket.rationale);
    usedIds.add(ticket.id);
  }
  const before = evaluateChallenge(triage.analyze, fresh);
  const after = evaluateChallenge(revised.analyze, fresh);
  assert.deepEqual([before.total, before.agreed, before.extraReview, before.unexpectedSuggestion], [15, 3, 10, 2]);
  assert.deepEqual([after.total, after.agreed, after.extraReview, after.unexpectedSuggestion], [15, 11, 3, 1]);
});

test("the current rules fix the four prior misses and preserve the other challenge routes", () => {
  const { rows: before } = evaluateChallenge(revised.analyze, fresh);
  const { rows: after } = evaluateChallenge(current.analyze, fresh);
  const previouslyMissed = before.filter(row => row.outcome !== "agreed").map(row => row.id);
  assert.deepEqual(previouslyMissed, [
    "fresh-vpn-recurrence", "fresh-mailbox-reversal", "fresh-quoted-history", "fresh-permission-route"
  ]);
  assert.deepEqual(after.filter(row => row.outcome !== "agreed").map(row => row.id), []);
  assert.equal(evaluateChallenge(current.analyze).agreed, cases.length);
});

test("the new evaluation compares all revisions on the same independent cases", () => {
  const usedIds = new Set([...cases, ...fresh, ...triage.samples].map(ticket => ticket.id));
  for (const ticket of validation) {
    assert.equal(usedIds.has(ticket.id), false);
    assert.ok(ticket.rationale);
    usedIds.add(ticket.id);
  }
  for (const [analyze, expected] of [
    [triage.analyze, [12, 5, 1]],
    [revised.analyze, [12, 4, 2]],
    [current.analyze, [13, 4, 1]]
  ]) {
    const result = evaluateChallenge(analyze, validation);
    assert.equal(result.total, 18);
    assert.deepEqual([result.agreed, result.extraReview, result.unexpectedSuggestion], expected);
  }
});

test("observed evidence fixes all five missed validation routes without changing the other known routes", () => {
  const { rows: before } = evaluateChallenge(current.analyze, validation);
  assert.deepEqual(before.filter(row => row.outcome !== "agreed").map(row => row.id), [
    "validation-keyboard-recurrence", "validation-active-lockout", "validation-closed-quote",
    "validation-conditional-advice", "validation-new-vocabulary"
  ]);
  for (const set of [cases, fresh, validation]) {
    const report = evaluateChallenge(observed.analyze, set);
    assert.deepEqual(report.rows.filter(row => row.outcome !== "agreed").map(row => row.id), []);
  }
});

test("fresh evaluation tickets are distinct and expose both agreement and misses", () => {
  const usedIds = new Set([...cases, ...fresh, ...validation, ...triage.samples].map(ticket => ticket.id));
  for (const ticket of transfer) {
    assert.equal(usedIds.has(ticket.id), false);
    assert.ok(ticket.rationale);
    usedIds.add(ticket.id);
  }
  for (const [analyze, expected] of [
    [triage.analyze, [12, 6, 2]],
    [current.analyze, [13, 6, 1]],
    [observed.analyze, [14, 5, 1]]
  ]) {
    const report = evaluateChallenge(analyze, transfer);
    assert.equal(report.total, 20);
    assert.deepEqual([report.agreed, report.extraReview, report.unexpectedSuggestion], expected);
  }
});

test("the latest rules resolve the six prior evaluation misses without regressing a known route", () => {
  const before = evaluateChallenge(observed.analyze, transfer);
  assert.deepEqual(before.rows.filter(row => row.outcome !== "agreed").map(row => row.id), [
    "transfer-old-quote-current-mail", "transfer-current-lockout-quote", "transfer-peripheral-recurrence",
    "transfer-independent-active-issues", "transfer-single-wired-port", "transfer-structured-identity-message"
  ]);
  for (const tickets of [cases, fresh, validation, transfer]) {
    const after = evaluateChallenge(independent.analyze, tickets);
    assert.deepEqual(after.rows.filter(row => row.outcome !== "agreed").map(row => row.id), []);
  }
});

test("the independent fictional set has distinct cases and keeps the observed comparison visible", () => {
  const usedIds = new Set([...cases, ...fresh, ...validation, ...transfer, ...triage.samples].map(ticket => ticket.id));
  for (const ticket of novel) {
    assert.equal(usedIds.has(ticket.id), false);
    assert.ok(ticket.rationale);
    usedIds.add(ticket.id);
  }
  for (const [analyze, expected] of [
    [triage.analyze, [9, 5, 6]],
    [observed.analyze, [10, 7, 3]],
    [independent.analyze, [10, 7, 3]]
  ]) {
    const result = evaluateChallenge(analyze, novel);
    assert.equal(result.total, 20);
    assert.deepEqual([result.agreed, result.extraReview, result.unexpectedSuggestion], expected);
  }
});

test("the latest rules resolve the ten previous misses and preserve expected outcomes on 87 earlier tickets", () => {
  const previous = evaluateChallenge(independent.analyze, novel);
  assert.equal(previous.agreed, 10);
  const historicalSets = [cases, fresh, validation, transfer, novel];
  assert.equal(historicalSets.flat().length, 87);
  for (const tickets of historicalSets) {
    const after = evaluateChallenge(symptoms.analyze, tickets);
    assert.deepEqual(after.rows.filter(row => row.outcome !== "agreed").map(row => row.id), []);
  }
});

test("the new fictional test set contains 20 distinct documented cases", () => {
  const usedIds = new Set([...cases, ...fresh, ...validation, ...transfer, ...novel, ...triage.samples].map(ticket => ticket.id));
  assert.equal(unseen.length, 20);
  for (const ticket of unseen) {
    assert.equal(usedIds.has(ticket.id), false);
    assert.ok(ticket.rationale);
    usedIds.add(ticket.id);
  }
  for (const [analyze, expected] of [
    [triage.analyze, [7, 4, 9]],
    [independent.analyze, [8, 5, 7]],
    [symptoms.analyze, [8, 5, 7]]
  ]) {
    const result = evaluateChallenge(analyze, unseen);
    assert.deepEqual([result.agreed, result.extraReview, result.unexpectedSuggestion], expected);
  }
});

test("the latest rules fix twelve previous misses and preserve the expected routes on 107 earlier tickets", () => {
  const previous = evaluateChallenge(symptoms.analyze, unseen);
  assert.equal(previous.agreed, 8);
  const knownSets = [cases, fresh, validation, transfer, novel, unseen];
  assert.equal(knownSets.flat().length, 107);
  for (const tickets of knownSets) {
    const after = evaluateChallenge(evidence.analyze, tickets);
    assert.deepEqual(after.rows.filter(row => row.outcome !== "agreed").map(row => row.id), []);
  }
});

test("the fresh evaluation uses 20 distinct fictional tickets with predetermined route explanations", () => {
  const usedIds = new Set([...cases, ...fresh, ...validation, ...transfer, ...novel, ...unseen, ...triage.samples].map(ticket => ticket.id));
  assert.equal(verify.length, 20);
  for (const ticket of verify) {
    assert.equal(usedIds.has(ticket.id), false);
    assert.ok(ticket.rationale);
    usedIds.add(ticket.id);
  }
  for (const [analyze, expected] of [
    [triage.analyze, [11, 4, 5]],
    [symptoms.analyze, [14, 1, 5]],
    [evidence.analyze, [15, 1, 4]]
  ]) {
    const result = evaluateChallenge(analyze, verify);
    assert.deepEqual([result.agreed, result.extraReview, result.unexpectedSuggestion], expected);
  }
});
