const assert = require("node:assert/strict");
const { test } = require("node:test");
const { analyze } = require("../projects/ticket-assistant/routing-independent.js");
const previous = require("../projects/ticket-assistant/routing-observed.js");
const { evaluateChallenge, cases: challenge } = require("../projects/ticket-assistant/evaluation.js");
const earlier = require("../projects/ticket-assistant/fresh-cases.js");
const validation = require("../projects/ticket-assistant/validation-cases.js");
const transfer = require("../projects/ticket-assistant/transfer-cases.js");

test("all six previous misses are fixed and other known routes stay correct", () => {
  const before = evaluateChallenge(previous.analyze, transfer);
  assert.equal(before.agreed, 14);
  for (const set of [challenge, earlier, validation, transfer]) {
    const result = evaluateChallenge(analyze, set);
    assert.deepEqual(result.rows.filter(row => row.outcome !== "agreed").map(row => row.id), []);
  }
});

test("VPN and an independently observed scanner fault require manual review", () => {
  const result = analyze({
    subject: "Two issues",
    description: "The VPN disconnects when I open the internal site. My flatbed scanner says calibration failed even with the network disconnected."
  });
  assert.equal(result.status, "ambiguous");
  assert.equal(result.suggestedCategory, null);
  assert.deepEqual(result.matches.map(({ id }) => id), ["network", "hardware"]);
  assert.ok(result.matches[0].terms.includes("vpn"));
  assert.ok(result.matches[1].terms.includes("flatbed scanner"));
});

test("a repaired scanner or a passing calibration leaves an unrelated VPN fault active", () => {
  for (const description of [
    "The scanner is no longer stuck at calibration. The VPN disconnects every minute.",
    "The scanner passed its calibration test. The VPN disconnects every minute."
  ]) {
    const result = analyze({ subject: "Connection problem", description });
    assert.equal(result.suggestedCategory, "network");
  }
});

test("a quote attributed to a dated closed record does not outweigh current observed errors", () => {
  const result = analyze({
    subject: "Cannot open the profile",
    description: "The closed incident dated Friday said “VPN disconnects.” The current popup says “Your account has been locked out.”"
  });
  assert.equal(result.suggestedCategory, "access");
  assert.ok(result.matches[0].terms.includes("account has been locked out"));
  assert.deepEqual(result.ignoredMatches[0].terms, ["vpn"]);
});

test("an active ticket with a date is not mistaken for a closed record", () => {
  const result = analyze({
    subject: "Two unresolved symptoms",
    description: "The open incident from Friday says “VPN disconnects.” The scanner will not feed paper."
  });
  assert.deepEqual(result.matches.map(({ id }) => id), ["network", "hardware"]);
  assert.equal(result.suggestedCategory, null);
  assert.deepEqual(result.ignoredMatches, []);
});

test("a returning symptom can follow tentative repair without a second device name", () => {
  const result = analyze({
    subject: "Typing problem",
    description: "Support thought the keyboard was repaired. It skips letters again."
  });
  assert.equal(result.suggestedCategory, "hardware");
  assert.deepEqual(result.matches[0].terms, ["keyboard"]);
});

test("a failed wired socket is a network clue but an incidental socket is not", () => {
  const result = analyze({
    subject: "Loss of access",
    description: "The ethernet socket nearest the entrance fails with two devices."
  });
  assert.equal(result.suggestedCategory, "network");
  assert.deepEqual(result.matches[0].terms, ["ethernet socket"]);
  assert.equal(analyze({
    subject: "Equipment inventory",
    description: "One ethernet socket sits behind each desk."
  }).suggestedCategory, null);
});

test("a structured identity error can distinguish an application step from a display issue", () => {
  const fields = {
    subject: "The next screen does not load",
    description: "The support checklist suggests checking the network. The page shows an error.",
    error: "Security code expired."
  };
  const result = analyze(fields);
  assert.equal(result.suggestedCategory, "access");
  assert.deepEqual(result.ignoredMatches.map(({ id, terms }) => [id, terms]), [
    ["network", ["network"]], ["hardware", ["next screen"]]
  ]);
  assert.deepEqual(result.reported, previous.analyze(fields).reported);
  assert.doesNotMatch(result.questions.map(question => question.text).join(" "), /What exact error/);
});

test("a structured identity error does not erase a separately observed display fault", () => {
  const result = analyze({
    subject: "The second screen flickers on HDMI",
    description: "The monitor flickers even on another device. I also have the separate error below.",
    error: "Verification code expired."
  });
  assert.deepEqual(result.matches.map(({ id }) => id), ["access", "hardware"]);
  assert.equal(result.suggestedCategory, null);
});
