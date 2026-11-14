const assert = require("node:assert/strict");
const { test } = require("node:test");
const prior = require("../projects/ticket-assistant/routing-independent.js");
const { analyze } = require("../projects/ticket-assistant/routing-symptoms.js");
const { cases, evaluateChallenge } = require("../projects/ticket-assistant/evaluation.js");
const earlier = require("../projects/ticket-assistant/fresh-cases.js");
const validation = require("../projects/ticket-assistant/validation-cases.js");
const transfer = require("../projects/ticket-assistant/transfer-cases.js");
const novel = require("../projects/ticket-assistant/novel-cases.js");

test("the observed symptoms resolve all ten prior misses and preserve known routes", () => {
  assert.equal(evaluateChallenge(prior.analyze, novel).agreed, 10);
  for (const tickets of [cases, earlier, validation, transfer, novel]) {
    const result = evaluateChallenge(analyze, tickets);
    assert.deepEqual(result.rows.filter(row => row.outcome !== "agreed").map(row => row.id), []);
  }
});

test("an isolated scanner startup fault and a VPN disconnect remain separate", () => {
  const result = analyze({
    subject: "Two things have failed",
    description: "The flatbed scanner freezes on its boot screen with the network cable removed. The VPN keeps disconnecting on my other workstation."
  });
  assert.equal(result.suggestedCategory, null);
  assert.equal(result.status, "ambiguous");
  assert.deepEqual(result.matches.map(({ id }) => id), ["network", "hardware"]);
  assert.ok(result.matches.find(({ id }) => id === "network").terms.includes("vpn"));
  assert.ok(result.matches.find(({ id }) => id === "hardware").terms.includes("scanner"));
});

test("a software scanner is not a physical device symptom", () => {
  const result = analyze({
    subject: "Access to remote systems",
    description: "The security scanner froze on its startup logo during testing. The VPN also disconnects."
  });
  assert.equal(result.suggestedCategory, "network");
});

test("a scanner jam is current while instructions and normal wireless are background", () => {
  const result = analyze({
    subject: "Can't finish the task",
    description: "The instructions say to test internet access if a site won't load. The scanner jams on every page. My wireless connection works normally."
  });
  assert.equal(result.suggestedCategory, "hardware");
  assert.ok(result.ignoredMatches.find(({ id }) => id === "network").terms.includes("internet"));
});

test("closed case wording is background and current verification remains visible", () => {
  const result = analyze({
    subject: "Cannot finish approval",
    description: "A resolved note dated Monday reported “The VPN disconnected.” The portal displays “Verification link expired.”"
  });
  assert.equal(result.suggestedCategory, "access");
  assert.ok(result.matches[0].terms.includes("verification link expired"));
  assert.ok(result.ignoredMatches.find(({ id }) => id === "network").terms.includes("vpn"));
});

test("a camera disappearing again refers to the nearest repair only when unambiguous", () => {
  const description = "The webcam was repaired. It disappeared again the next day.";
  assert.equal(analyze({ subject: "Work interrupted", description }).suggestedCategory, "hardware");
  assert.equal(analyze({
    subject: "Work interrupted",
    description: "The webcam and the VPN were repaired. It disappeared again the next day."
  }).suggestedCategory, null);
});

test("diagnostic details identify verification without erasing a separate physical fault", () => {
  const fields = {
    subject: "Two problems",
    description: "The barcode scanner is stuck on its initial logo. The portal stops during a separate operation.",
    error: "Account verification was denied.",
    scope: "Only one requester"
  };
  const result = analyze(fields);
  assert.equal(result.status, "ambiguous");
  assert.deepEqual(result.matches.map(({ id }) => id), ["access", "hardware"]);
  assert.deepEqual(result.reported, prior.analyze(fields).reported);
});

test("working normally does not erase a crash reported during a specific task", () => {
  const result = analyze({
    subject: "The export action crashes my program",
    description: "The application opens normally. It crashes on every export."
  });
  assert.equal(result.suggestedCategory, "software");
});
