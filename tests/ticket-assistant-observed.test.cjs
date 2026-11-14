const assert = require("node:assert/strict");
const { test } = require("node:test");
const { analyze } = require("../projects/ticket-assistant/routing-observed.js");
const previous = require("../projects/ticket-assistant/routing-refined.js");
const { evaluateChallenge, cases: challenge } = require("../projects/ticket-assistant/evaluation.js");
const earlierTests = require("../projects/ticket-assistant/fresh-cases.js");
const validation = require("../projects/ticket-assistant/validation-cases.js");

test("all five known misses are fixed without changing the other expected routes", () => {
  const before = evaluateChallenge(previous.analyze, validation);
  const after = evaluateChallenge(analyze, validation);
  assert.equal(before.agreed, 13);
  assert.deepEqual([after.agreed, after.extraReview, after.unexpectedSuggestion], [18, 0, 0]);
  assert.equal(evaluateChallenge(analyze, challenge).agreed, 14);
  assert.equal(evaluateChallenge(analyze, earlierTests).agreed, 15);
});

test("considering a guide's network advice does not outweigh an observed audio fault", () => {
  const description = "The runbook recommends checking the network if audio fails, and I heard the headset lose sound during a local test. My headset loses sound during every recording.";
  const result = analyze({ subject: "Audio issue", description, onset: "Today" });
  assert.equal(result.suggestedCategory, "hardware");
  assert.deepEqual(result.matches[0].terms, ["headset"]);
  assert.deepEqual(result.ignoredMatches.map(({ id, terms }) => [id, terms]), [["network", ["network"]]]);
  assert.deepEqual(result.reported, previous.analyze({ subject: "Audio issue", description, onset: "Today" }).reported);
});

test("two independently observed faults still require manual routing", () => {
  const result = analyze({
    subject: "Two things failed",
    description: "The guide says to check the network if the call cuts out. My headphones lose audio while recording. The VPN also disconnects in other applications."
  });
  assert.equal(result.status, "ambiguous");
  assert.deepEqual(result.matches.map(({ id }) => id), ["network", "hardware"]);
});

test("a past closed quote stays background while a current quoted lockout supplies evidence", () => {
  const result = analyze({
    subject: "Blocked again",
    description: "The resolved support ticket showed “VPN connection drops.” The current message reads “Account remains locked.”"
  });
  assert.equal(result.suggestedCategory, "access");
  assert.deepEqual(result.matches[0].terms, ["account remains locked"]);
  assert.deepEqual(result.ignoredMatches.map(({ id }) => id), ["network"]);
});

test("a current quoted network fault stays in review alongside a current audio fault", () => {
  const result = analyze({
    subject: "More than one symptom",
    description: "The incident says “VPN drops” and is still open. The microphone loses sound."
  });
  assert.equal(result.status, "ambiguous");
  assert.deepEqual(result.matches.map(({ id }) => id), ["network", "hardware"]);
});

test("a recurring failure can refer back to one repaired device", () => {
  const result = analyze({
    subject: "Fault returned",
    description: "The keyboard was fixed after lunch. It is repeating keys again. The monitor works normally."
  });
  assert.equal(result.suggestedCategory, "hardware");
  assert.deepEqual(result.matches[0].terms, ["keyboard"]);
  assert.deepEqual(result.ignoredMatches[0].terms, ["monitor"]);
});

test("two repaired categories do not determine the cause of an unnamed recurrence", () => {
  const result = analyze({
    subject: "Problem returned",
    description: "The keyboard and the VPN were both repaired. It stopped working again."
  });
  assert.equal(result.suggestedCategory, null);
});

test("a wired port is evidence when it has a symptom, rather than when it is simply mentioned", () => {
  const routed = analyze({ subject: "Connection issue", description: "The Ethernet jack has no link." });
  assert.equal(routed.suggestedCategory, "network");
  assert.deepEqual(routed.matches[0].terms, ["ethernet jack"]);
  const noSymptoms = analyze({ subject: "Where we sit", description: "Our tables are next to the wall jacks." });
  assert.equal(noSymptoms.suggestedCategory, null);
});
