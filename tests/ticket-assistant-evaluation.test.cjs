const assert = require("node:assert/strict");
const { test } = require("node:test");
const triage = require("../projects/ticket-assistant/triage.js");
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
