const assert = require("node:assert/strict");
const { test } = require("node:test");
const triage = require("../projects/ticket-assistant/triage.js");
const revised = require("../projects/ticket-assistant/routing-context.js");
const fresh = require("../projects/ticket-assistant/fresh-cases.js");
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
