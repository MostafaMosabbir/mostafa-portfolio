const assert = require("node:assert/strict");
const { test } = require("node:test");
const { analyze, draftReply, evaluateSamples, reviewBlocker, samples } = require("../projects/ticket-assistant/triage.js");

test("each fictional ticket has an independently recorded expected routing", () => {
  const evaluation = evaluateSamples();
  assert.deepEqual(
    { total: evaluation.total, passed: evaluation.passed, matched: evaluation.matched, manual: evaluation.manual },
    { total: 8, passed: 8, matched: 5, manual: 3 }
  );
  for (const { id, expected, actual } of evaluation.rows) assert.deepEqual(actual, expected, id);
  assert.equal(samples[0].fields.onset, "This morning");
  assert.equal(Object.isFrozen(samples[0].fields), true);
});

test("shows the actual matching terms once per category", () => {
  const result = analyze({ subject: "OUTLOOK and VPN", description: "Outlook recovers after VPN reconnects." });
  assert.equal(result.status, "ambiguous");
  assert.equal(result.suggestedCategory, null);
  assert.deepEqual(result.matches.map(({ id, terms }) => [id, terms]), [["network", ["vpn"]], ["email", ["outlook"]]]);
});

test("word boundaries avoid incidental substrings", () => {
  const result = analyze({ subject: "Emailer stalls", description: "Problem with networking appearing in another app." });
  assert.equal(result.status, "unrecognized");
  assert.deepEqual(result.matches, []);
  assert.equal(result.questions[0].field, "service");
});

test("blank subjects and descriptions are rejected", () => {
  assert.throws(() => analyze({ subject: "VPN", description: " " }), /subject and a description/);
  assert.throws(() => analyze({ subject: "\n", description: "VPN drops" }), /subject and a description/);
});

test("only missing structured facts become follow up questions", () => {
  const result = analyze({
    subject: "VPN drops", description: "Reconnecting helps", scope: "  2 people  ", onset: "This morning",
    error: "No error appeared", workaround: ""
  });
  assert.deepEqual(result.reported.map(({ field, value }) => [field, value]), [
    ["scope", "2 people"], ["onset", "This morning"], ["error", "No error appeared"]
  ]);
  assert.deepEqual(result.questions.map(({ field }) => field), ["workaround"]);
  const draft = draftReply(result);
  assert.match(draft, /workaround/);
  assert.doesNotMatch(draft, /first occur|exact error|who is affected/i);
});

test("a reviewer can choose which category frames the draft", () => {
  const result = analyze(samples.find(sample => sample.id === "mixed").fields);
  assert.match(draftReply(result), /Who is affected/);
  assert.match(draftReply(result, "network"), /connection problem/);
  assert.match(draftReply(result, "email"), /sending, receiving/);
  assert.doesNotMatch(draftReply(result), /anything you already tried/);
});

test("a fully reported issue gets an acknowledgement without repeated questions", () => {
  const result = analyze(samples.find(sample => sample.id === "printer").fields);
  assert.equal(result.questions.length, 0);
  assert.doesNotMatch(draftReply(result), /\?/);
  assert.match(draftReply(result), /start reviewing the issue/);
});

test("review rejects blank drafts, changed context, or an unsupported category", () => {
  assert.match(reviewBlocker("  ", 1, 1, "network"), /Add a draft reply/);
  assert.match(reviewBlocker("Old VPN draft", 1, 2, "email"), /changed/);
  assert.match(reviewBlocker("Unsynchronized draft", null, null, "email"), /changed/);
  assert.match(reviewBlocker("Valid reply", 2, 2, ""), /Choose a category/);
  assert.match(reviewBlocker("Valid reply", 2, 2, "invalid"), /Choose a category/);
  assert.equal(reviewBlocker("Updated reply", 2, 2, "email"), "");
  assert.equal(reviewBlocker("Reviewed manually", 0, 0, "other"), "");
});
