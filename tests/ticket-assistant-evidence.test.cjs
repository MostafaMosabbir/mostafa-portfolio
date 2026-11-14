const assert = require("node:assert/strict");
const { test } = require("node:test");
const { analyze } = require("../projects/ticket-assistant/routing-evidence.js");
const prior = require("../projects/ticket-assistant/routing-symptoms.js");

function ticket(description, fields = {}) {
  return analyze({ subject: "Support request", description, ...fields });
}

test("different ways of describing a device startup fault stay active beside a VPN failure", () => {
  for (const description of [
    "The label reader cannot advance beyond the splash page. Separately, the VPN disconnects.",
    "The printer freezes at the boot screen. The VPN connection drops in the conference room.",
    "The scanner never gets past the opening splash screen. The VPN also disconnects."
  ]) {
    const result = ticket(description);
    assert.equal(result.status, "ambiguous", description);
    assert.equal(result.suggestedCategory, null);
    assert.deepEqual(result.matches.map(({ id }) => id), ["network", "hardware"]);
  }
});

test("a software scanner and a scanner that no longer fails supply no active hardware evidence", () => {
  for (const description of [
    "The vulnerability scanner cannot get past the startup page. The VPN separately disconnects.",
    "The scanner is not stuck at its boot screen anymore. The VPN disconnects."
  ]) {
    const result = ticket(description);
    assert.ok(!result.matches.some(({ id }) => id === "hardware"), description);
  }
});

test("a local scan failure keeps its route when the requester confirms remote access", () => {
  const result = ticket("The label reader starts normally, but nothing shows in its local test. I can connect to our VPN and open files normally.");
  assert.equal(result.suggestedCategory, "hardware");
  assert.ok(result.ignoredMatches.some(({ id, terms }) => id === "network" && terms.includes("vpn")));
});

test("conditional advice and a working display do not compete with an application fault", () => {
  const result = ticket("The reporting program quits every time I export. A technician suggested checking the monitor if the picture goes out, but the display works fine.");
  assert.equal(result.suggestedCategory, "software");
  assert.ok(result.ignoredMatches.some(({ id, terms }) => id === "hardware" && terms.includes("monitor")));
});

test("a wired port diagnosis and an account error each contribute a route", () => {
  const result = ticket("The counter data socket shows no wired link. The portal says “Your account is disabled.”");
  assert.equal(result.status, "ambiguous");
  assert.deepEqual(result.matches.map(({ id }) => id), ["network", "access"]);
});

test("structured identity evidence preserves a separate physical display symptom and preserves reported facts", () => {
  const fields = {
    subject: "Two issues today",
    description: "The external display remains dark, and I used a different computer to reach the portal.",
    error: "Multifactor verification was rejected.",
    onset: "This morning"
  };
  const result = analyze(fields);
  assert.equal(result.status, "ambiguous");
  assert.deepEqual(result.matches.map(({ id }) => id), ["access", "hardware"]);
  assert.deepEqual(result.reported, prior.analyze(fields).reported);
});

test("a returning camera failure can use one earlier repair, while a joint repair stays unclear", () => {
  const returning = ticket("The technician thought she had restored the USB camera. It disappeared again while testing local video.");
  assert.equal(returning.suggestedCategory, "hardware");
  const unclear = ticket("The USB camera and wireless connection were both restored. It disappeared again, but I do not know which service was in use.");
  assert.equal(unclear.suggestedCategory, null);
});

test("an installer returning to its first page is software evidence", () => {
  const result = ticket("The installer returns to its first page every time I press Finish.");
  assert.equal(result.suggestedCategory, "software");
});
