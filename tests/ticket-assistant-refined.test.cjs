const assert = require("node:assert/strict");
const { test } = require("node:test");
const previous = require("../projects/ticket-assistant/routing-context.js");
const { analyze } = require("../projects/ticket-assistant/routing-refined.js");
const { evaluateChallenge } = require("../projects/ticket-assistant/evaluation.js");
const previousCases = require("../projects/ticket-assistant/fresh-cases.js");

test("the revised rules correct all four prior misses and preserve the other known routes", () => {
  const before = evaluateChallenge(previous.analyze, previousCases);
  assert.equal(before.agreed, 11);
  const after = evaluateChallenge(analyze, previousCases);
  assert.equal(after.agreed, 15);
  assert.equal(evaluateChallenge(analyze).agreed, 14);
});

test("successful authentication stays background to unsupported folder permissions", () => {
  const result = analyze({
    subject: "Shared folder permissions",
    description: "I can sign in normally, but the shared folder denies access."
  });
  assert.equal(result.suggestedCategory, null);
  assert.equal(result.status, "unrecognized");
  assert.deepEqual(result.ignoredMatches.map(({ id, terms }) => [id, terms]), [["access", ["sign in"]]]);
});

test("a current authentication failure survives a prior success", () => {
  const result = analyze({
    subject: "Password fails",
    description: "I can sign in normally to my usual portal, but my password fails on the training portal."
  });
  assert.equal(result.suggestedCategory, "access");
  assert.deepEqual(result.matches[0].terms, ["password"]);
  assert.deepEqual(result.ignoredMatches[0].terms, ["sign in"]);
});

test("a recurred failure stays active after a temporary recovery", () => {
  const result = analyze({
    subject: "New problem",
    description: "The VPN worked after a restart, but the VPN dropped again ten minutes later. My mailbox opens normally."
  });
  assert.equal(result.suggestedCategory, "network");
  assert.deepEqual(result.ignoredMatches.map(({ id, terms }) => [id, terms]), [["email", ["mailbox"]]]);
});

test("a pronoun can confirm recovery for a named service immediately before it", () => {
  const result = analyze({
    subject: "New problem this morning",
    description: "The VPN disconnected yesterday. It is stable now, but the shared mailbox still will not open."
  });
  assert.equal(result.suggestedCategory, "email");
  assert.deepEqual(result.ignoredMatches.map(({ id, terms }) => [id, terms]), [["network", ["vpn"]]]);
});

test("plural recovery applies to a preceding report with two supported services", () => {
  const result = analyze({
    subject: "Status after repair",
    description: "Last week the printer stopped and the VPN dropped. Both problems were fixed and I have no symptoms now."
  });
  assert.equal(result.suggestedCategory, null);
  assert.equal(result.status, "unrecognized");
  assert.deepEqual(new Set(result.ignoredMatches.map(({ id }) => id)), new Set(["hardware", "network"]));
});

test("recovery uncertainty does not clear a prior fault", () => {
  for (const status of ["It might be stable now", "It is not stable now", "It is only stable for a short time"]) {
    const result = analyze({
      subject: "Two problems",
      description: "The VPN disconnected yesterday. " + status + ". The mailbox will not open."
    });
    assert.equal(result.status, "ambiguous", status);
    assert.deepEqual(new Set(result.matches.map(({ id }) => id)), new Set(["network", "email"]));
  }
});

test("a quotation from an earlier closed ticket is context while a current quoted error remains active", () => {
  const result = analyze({
    subject: "Training portal issue",
    description: "The last ticket said “printer unavailable” and was closed. The training portal now says “password expired”."
  });
  assert.equal(result.suggestedCategory, "access");
  assert.deepEqual(result.ignoredMatches.map(({ id, terms }) => [id, terms]), [["hardware", ["printer"]]]);
  assert.deepEqual(result.matches[0].terms, ["password"]);
});
